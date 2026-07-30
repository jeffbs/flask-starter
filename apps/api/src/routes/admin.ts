import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { paginationSchema, toSkipTake } from '../lib/pagination.js';
import { sendPushToUsers } from '../lib/push.js';

const companyFilterSchema = paginationSchema.extend({
  status: z.enum(['UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED']).optional(),
  q: z.string().max(200).optional(),
});

const verifySchema = z.object({
  approve: z.boolean(),
  reason: z.string().max(2000).optional(),
});

const suspendSchema = z.object({
  suspend: z.boolean(),
  reason: z.string().max(2000).optional(),
});

const listingFilterSchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD', 'EXPIRED', 'REMOVED']).optional(),
  q: z.string().max(200).optional(),
});

const removeListingSchema = z.object({ reason: z.string().min(3).max(2000) });

const reportFilterSchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).optional(),
});

const resolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  note: z.string().max(2000).optional(),
});

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

async function audit(adminId: string, action: string, targetType: string, targetId: string, note?: string) {
  await prisma.auditLog.create({ data: { adminId, action, targetType, targetId, note } });
}

async function notifyCompanyUsers(companyId: string, title: string, body: string) {
  const users = await prisma.user.findMany({ where: { companyId, isActive: true }, select: { id: true } });
  void sendPushToUsers(users.map((u) => u.id), title, body);
}

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAdmin);

  // ---- Dashboard ----------------------------------------------------------
  app.get('/stats', async () => {
    const [companiesByStatus, listingsByStatus, openReports, totalUsers, pendingKyb] = await Promise.all([
      prisma.company.groupBy({ by: ['status'], _count: true }),
      prisma.listing.groupBy({ by: ['status'], _count: true }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      prisma.company.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);
    return {
      companiesByStatus: Object.fromEntries(companiesByStatus.map((c) => [c.status, c._count])),
      listingsByStatus: Object.fromEntries(listingsByStatus.map((l) => [l.status, l._count])),
      openReports,
      totalUsers,
      pendingKyb,
    };
  });

  // ---- Firmen & KYB -------------------------------------------------------
  app.get('/companies', async (req) => {
    const query = companyFilterSchema.parse(req.query);
    const where: Prisma.CompanyWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { vatId: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
        include: { _count: { select: { users: true, listings: true } } },
      }),
      prisma.company.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  });

  app.get('/companies/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } },
        kybDocuments: { orderBy: { createdAt: 'desc' } },
        _count: { select: { listings: true } },
      },
    });
    if (!company) return reply.code(404).send({ error: 'Firma nicht gefunden.' });
    return { company };
  });

  // KYB freigeben oder ablehnen
  app.post('/companies/:id/verify', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = verifySchema.parse(req.body);
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return reply.code(404).send({ error: 'Firma nicht gefunden.' });
    if (company.status !== 'PENDING_REVIEW') {
      return reply.code(409).send({ error: 'Diese Firma wartet nicht auf eine Prüfung.' });
    }
    if (!body.approve && !body.reason) {
      return reply.code(400).send({ error: 'Bei Ablehnung ist eine Begründung erforderlich.' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: body.approve
        ? { status: 'VERIFIED', verifiedAt: new Date(), rejectionReason: null }
        : { status: 'REJECTED', rejectionReason: body.reason },
    });
    await audit(req.user.sub, body.approve ? 'company.verify' : 'company.reject', 'COMPANY', id, body.reason);
    await notifyCompanyUsers(
      id,
      body.approve ? 'Verifizierung erfolgreich' : 'Verifizierung abgelehnt',
      body.approve
        ? 'Ihre Firma wurde verifiziert. Sie können jetzt inserieren.'
        : `Ihre Verifizierung wurde abgelehnt: ${body.reason}`,
    );
    return { company: updated };
  });

  // Firma sperren / entsperren
  app.post('/companies/:id/suspend', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = suspendSchema.parse(req.body);
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return reply.code(404).send({ error: 'Firma nicht gefunden.' });

    const updated = await prisma.company.update({
      where: { id },
      data: body.suspend
        ? { status: 'SUSPENDED', rejectionReason: body.reason }
        : { status: company.verifiedAt ? 'VERIFIED' : 'UNVERIFIED', rejectionReason: null },
    });
    if (body.suspend) {
      // Aktive Inserate der gesperrten Firma pausieren
      await prisma.listing.updateMany({
        where: { companyId: id, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
    }
    await audit(req.user.sub, body.suspend ? 'company.suspend' : 'company.unsuspend', 'COMPANY', id, body.reason);
    return { company: updated };
  });

  // ---- Inserats-Moderation ------------------------------------------------
  app.get('/listings', async (req) => {
    const query = listingFilterSchema.parse(req.query);
    const where: Prisma.ListingWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
        include: {
          company: { select: { id: true, name: true, status: true } },
          category: { select: { name: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          _count: { select: { reports: { where: { status: 'OPEN' } } } },
        },
      }),
      prisma.listing.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  });

  app.post('/listings/:id/remove', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = removeListingSchema.parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    await prisma.listing.update({
      where: { id },
      data: { status: 'REMOVED', moderationNote: body.reason },
    });
    await audit(req.user.sub, 'listing.remove', 'LISTING', id, body.reason);
    await notifyCompanyUsers(
      listing.companyId,
      'Inserat entfernt',
      `Ihr Inserat „${listing.title}" wurde von der Moderation entfernt: ${body.reason}`,
    );
    return { ok: true };
  });

  app.post('/listings/:id/restore', async (req, reply) => {
    const { id } = req.params as { id: string };
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    await prisma.listing.update({
      where: { id },
      data: { status: 'ACTIVE', moderationNote: null },
    });
    await audit(req.user.sub, 'listing.restore', 'LISTING', id);
    return { ok: true };
  });

  // ---- Meldungen ----------------------------------------------------------
  app.get('/reports', async (req) => {
    const query = reportFilterSchema.parse(req.query);
    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status;
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
        include: {
          reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
          listing: { select: { id: true, title: true, status: true } },
          company: { select: { id: true, name: true, status: true } },
          message: { select: { id: true, body: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  });

  app.post('/reports/:id/resolve', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = resolveReportSchema.parse(req.body);
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.code(404).send({ error: 'Meldung nicht gefunden.' });
    const updated = await prisma.report.update({
      where: { id },
      data: { status: body.status, resolutionNote: body.note },
    });
    await audit(req.user.sub, `report.${body.status.toLowerCase()}`, 'REPORT', id, body.note);
    return { report: updated };
  });

  // ---- Kategorien ---------------------------------------------------------
  app.get('/categories', async () => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { listings: true } } },
    });
    return { categories };
  });

  app.post('/categories', async (req, reply) => {
    const body = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data: body });
    await audit(req.user.sub, 'category.create', 'CATEGORY', category.id);
    return reply.code(201).send({ category });
  });

  app.patch('/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = categorySchema.partial().parse(req.body);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Kategorie nicht gefunden.' });
    const category = await prisma.category.update({ where: { id }, data: body });
    await audit(req.user.sub, 'category.update', 'CATEGORY', id);
    return { category };
  });

  // ---- Audit-Log ----------------------------------------------------------
  app.get('/audit', async (req) => {
    const query = paginationSchema.parse(req.query);
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
        include: { admin: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.auditLog.count(),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  });
}
