import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { isValidVatId, normalizeVatId } from '../lib/vat.js';

const updateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  legalForm: z.string().max(50).optional(),
  street: z.string().max(200).optional(),
  zip: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
});

const kybSubmitSchema = z.object({
  vatId: z.string().min(4).max(20),
  registrationNumber: z.string().max(50).optional(),
  registrationCourt: z.string().max(100).optional(),
  documents: z
    .array(
      z.object({
        type: z.enum(['TRADE_REGISTER', 'VAT_CERTIFICATE', 'BUSINESS_LICENSE', 'ID_DOCUMENT', 'OTHER']),
        fileUrl: z.string().min(1),
        fileName: z.string().min(1).max(300),
      }),
    )
    .min(1, 'Mindestens ein Nachweisdokument ist erforderlich.'),
});

export default async function companyRoutes(app: FastifyInstance) {
  // Öffentliches Firmenprofil (für Inserats-Detailseiten)
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        legalForm: true,
        city: true,
        country: true,
        website: true,
        description: true,
        status: true,
        verifiedAt: true,
        createdAt: true,
        _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
      },
    });
    if (!company) return reply.code(404).send({ error: 'Firma nicht gefunden.' });
    return { company };
  });

  // Eigenes Firmenprofil aktualisieren
  app.patch('/mine', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user.companyId) return reply.code(403).send({ error: 'Kein Firmenkonto.' });
    const body = updateCompanySchema.parse(req.body);
    const company = await prisma.company.update({ where: { id: req.user.companyId }, data: body });
    return { company };
  });

  // KYB-Status der eigenen Firma
  app.get('/mine/kyb', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user.companyId) return reply.code(403).send({ error: 'Kein Firmenkonto.' });
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      include: { kybDocuments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!company) return reply.code(404).send({ error: 'Firma nicht gefunden.' });
    return {
      status: company.status,
      rejectionReason: company.rejectionReason,
      vatId: company.vatId,
      registrationNumber: company.registrationNumber,
      documents: company.kybDocuments,
    };
  });

  // KYB einreichen → Firma wandert in die manuelle Prüfung (strenges KYB)
  app.post('/mine/kyb', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user.companyId) return reply.code(403).send({ error: 'Kein Firmenkonto.' });
    const body = kybSubmitSchema.parse(req.body);

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    if (!company) return reply.code(404).send({ error: 'Firma nicht gefunden.' });
    if (company.status === 'VERIFIED') {
      return reply.code(409).send({ error: 'Ihre Firma ist bereits verifiziert.' });
    }
    if (company.status === 'PENDING_REVIEW') {
      return reply.code(409).send({ error: 'Ihre Verifizierung wird bereits geprüft.' });
    }
    if (company.status === 'SUSPENDED') {
      return reply.code(403).send({ error: 'Dieses Konto ist gesperrt.' });
    }

    const vatId = normalizeVatId(body.vatId);
    if (!isValidVatId(vatId)) {
      return reply.code(400).send({ error: 'Die USt-IdNr. hat kein gültiges Format.' });
    }
    const vatTaken = await prisma.company.findFirst({
      where: { vatId, id: { not: company.id } },
    });
    if (vatTaken) {
      return reply.code(409).send({ error: 'Diese USt-IdNr. ist bereits registriert.' });
    }

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: {
        vatId,
        registrationNumber: body.registrationNumber,
        registrationCourt: body.registrationCourt,
        status: 'PENDING_REVIEW',
        rejectionReason: null,
        kybDocuments: {
          create: body.documents.map((d) => ({
            type: d.type,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            uploadedById: req.user.sub,
          })),
        },
      },
    });
    return reply.code(201).send({ status: updated.status });
  });
}
