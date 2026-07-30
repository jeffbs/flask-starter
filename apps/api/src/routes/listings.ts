import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { LISTING_TTL_DAYS } from '../config.js';
import { paginationSchema, toSkipTake } from '../lib/pagination.js';
import { requireVerifiedCompany } from '../plugins/auth.js';

const searchSchema = paginationSchema.extend({
  q: z.string().max(200).optional(),
  categoryId: z.string().optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'DEFECT']).optional(),
  zip: z.string().max(10).optional(),
  companyId: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
});

const createListingSchema = z.object({
  categoryId: z.string(),
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(20000),
  priceCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  priceType: z.enum(['FIXED', 'NEGOTIABLE', 'ON_REQUEST']).default('NEGOTIABLE'),
  isNetPrice: z.boolean().default(true),
  condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'DEFECT']).optional(),
  quantity: z.number().int().min(1).default(1),
  unit: z.string().max(30).optional(),
  zip: z.string().min(3).max(10),
  city: z.string().min(2).max(100),
  country: z.string().length(2).default('DE'),
  imageUrls: z.array(z.string()).max(20).default([]),
});

const updateListingSchema = createListingSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PAUSED', 'SOLD']).optional(),
});

const listingListSelect = {
  id: true,
  title: true,
  priceCents: true,
  priceType: true,
  isNetPrice: true,
  condition: true,
  quantity: true,
  unit: true,
  zip: true,
  city: true,
  status: true,
  createdAt: true,
  publishedAt: true,
  categoryId: true,
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1, select: { url: true } },
  company: { select: { id: true, name: true } },
} satisfies Prisma.ListingSelect;

/** IDs einer Kategorie samt aller Unterkategorien (Baumtiefe 2 reicht im MVP). */
async function categoryWithChildren(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  return [categoryId, ...children.map((c) => c.id)];
}

export default async function listingRoutes(app: FastifyInstance) {
  // Suche & Stöbern — öffentlich innerhalb der App (Auth erforderlich)
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const query = searchSchema.parse(req.query);

    const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = { in: await categoryWithChildren(query.categoryId) };
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      where.priceCents = {
        ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
        ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
      };
    }
    if (query.condition) where.condition = query.condition;
    if (query.zip) where.zip = { startsWith: query.zip.slice(0, 2) }; // grober Umkreis über PLZ-Region
    if (query.companyId) where.companyId = query.companyId;

    const orderBy: Prisma.ListingOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { priceCents: 'asc' }
        : query.sort === 'price_desc'
          ? { priceCents: 'desc' }
          : { publishedAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.listing.findMany({ where, orderBy, ...toSkipTake(query), select: listingListSelect }),
      prisma.listing.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  });

  // Eigene Inserate (alle Status)
  app.get('/mine', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user.companyId) return reply.code(403).send({ error: 'Kein Firmenkonto.' });
    const items = await prisma.listing.findMany({
      where: { companyId: req.user.companyId, status: { not: 'REMOVED' } },
      orderBy: { createdAt: 'desc' },
      select: listingListSelect,
    });
    return { items };
  });

  // Inserats-Detail
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        company: {
          select: { id: true, name: true, city: true, status: true, verifiedAt: true, createdAt: true },
        },
      },
    });
    if (!listing) return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    const isOwner = req.user.companyId === listing.companyId;
    if (listing.status !== 'ACTIVE' && !isOwner && req.user.role !== 'ADMIN') {
      return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    }
    if (!isOwner) {
      // Fire-and-forget Zähler
      prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    }
    const favorite = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: req.user.sub, listingId: id } },
    });
    return { listing, isOwner, isFavorite: Boolean(favorite) };
  });

  // Inserat erstellen — nur verifizierte Firmen
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const company = await requireVerifiedCompany(req, reply);
    if (!company) return;
    const body = createListingSchema.parse(req.body);

    if (body.priceType !== 'ON_REQUEST' && body.priceCents == null) {
      return reply.code(400).send({ error: 'Bitte geben Sie einen Preis an oder wählen Sie „Preis auf Anfrage".' });
    }

    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category || !category.isActive) {
      return reply.code(400).send({ error: 'Ungültige Kategorie.' });
    }

    const now = new Date();
    const listing = await prisma.listing.create({
      data: {
        companyId: company.id,
        createdById: req.user.sub,
        categoryId: body.categoryId,
        title: body.title,
        description: body.description,
        priceCents: body.priceType === 'ON_REQUEST' ? null : (body.priceCents ?? null),
        priceType: body.priceType,
        isNetPrice: body.isNetPrice,
        condition: body.condition,
        quantity: body.quantity,
        unit: body.unit,
        zip: body.zip,
        city: body.city,
        country: body.country,
        status: 'ACTIVE',
        publishedAt: now,
        expiresAt: new Date(now.getTime() + LISTING_TTL_DAYS * 24 * 60 * 60 * 1000),
        images: {
          create: body.imageUrls.map((url, i) => ({ url, sortOrder: i })),
        },
      },
      include: { images: true },
    });
    return reply.code(201).send({ listing });
  });

  // Inserat bearbeiten / Status ändern (pausieren, reaktivieren, verkauft)
  app.patch('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateListingSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    if (listing.companyId !== req.user.companyId) {
      return reply.code(403).send({ error: 'Dieses Inserat gehört nicht zu Ihrer Firma.' });
    }
    if (listing.status === 'REMOVED') {
      return reply.code(403).send({ error: 'Dieses Inserat wurde von der Moderation entfernt.' });
    }

    const { imageUrls, ...fields } = body;
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...fields,
        ...(imageUrls
          ? {
              images: {
                deleteMany: {},
                create: imageUrls.map((url, i) => ({ url, sortOrder: i })),
              },
            }
          : {}),
      },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    return { listing: updated };
  });

  // Inserat löschen
  app.delete('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    if (listing.companyId !== req.user.companyId) {
      return reply.code(403).send({ error: 'Dieses Inserat gehört nicht zu Ihrer Firma.' });
    }
    await prisma.listing.delete({ where: { id } });
    return reply.code(204).send();
  });
}
