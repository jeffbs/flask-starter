import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const createReportSchema = z.object({
  targetType: z.enum(['LISTING', 'COMPANY', 'MESSAGE']),
  targetId: z.string(),
  reason: z.string().min(3).max(200),
  details: z.string().max(5000).optional(),
});

export default async function reportRoutes(app: FastifyInstance) {
  // Inserat / Firma / Nachricht melden
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = createReportSchema.parse(req.body);

    const target =
      body.targetType === 'LISTING'
        ? await prisma.listing.findUnique({ where: { id: body.targetId } })
        : body.targetType === 'COMPANY'
          ? await prisma.company.findUnique({ where: { id: body.targetId } })
          : await prisma.message.findUnique({ where: { id: body.targetId } });
    if (!target) return reply.code(404).send({ error: 'Zu meldendes Objekt nicht gefunden.' });

    const report = await prisma.report.create({
      data: {
        targetType: body.targetType,
        listingId: body.targetType === 'LISTING' ? body.targetId : null,
        companyId: body.targetType === 'COMPANY' ? body.targetId : null,
        messageId: body.targetType === 'MESSAGE' ? body.targetId : null,
        reporterUserId: req.user.sub,
        reason: body.reason,
        details: body.details,
      },
    });
    return reply.code(201).send({ report: { id: report.id, status: report.status } });
  });
}
