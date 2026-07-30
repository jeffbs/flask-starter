import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';

export default async function favoriteRoutes(app: FastifyInstance) {
  // Merkliste
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceCents: true,
            priceType: true,
            isNetPrice: true,
            city: true,
            zip: true,
            status: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
    return { items: favorites };
  });

  app.post('/:listingId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { listingId } = req.params as { listingId: string };
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== 'ACTIVE') {
      return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    }
    await prisma.favorite.upsert({
      where: { userId_listingId: { userId: req.user.sub, listingId } },
      create: { userId: req.user.sub, listingId },
      update: {},
    });
    return reply.code(201).send({ ok: true });
  });

  app.delete('/:listingId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { listingId } = req.params as { listingId: string };
    await prisma.favorite.deleteMany({ where: { userId: req.user.sub, listingId } });
    return reply.code(204).send();
  });
}
