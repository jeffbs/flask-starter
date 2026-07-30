import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireVerifiedCompany } from '../plugins/auth.js';
import { sendToUsers } from '../lib/ws.js';
import { sendPushToUsers } from '../lib/push.js';

const startSchema = z.object({
  listingId: z.string(),
  body: z.string().min(1).max(10000).optional(),
  offerAmountCents: z.number().int().min(1).optional(),
}).refine((v) => v.body || v.offerAmountCents, {
  message: 'Nachricht oder Preisvorschlag erforderlich.',
});

const messageSchema = z.object({
  type: z.enum(['TEXT', 'OFFER']).default('TEXT'),
  body: z.string().min(1).max(10000).optional(),
  offerAmountCents: z.number().int().min(1).optional(),
}).refine((v) => (v.type === 'TEXT' ? Boolean(v.body) : Boolean(v.offerAmountCents)), {
  message: 'TEXT braucht body, OFFER braucht offerAmountCents.',
});

const respondSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE', 'WITHDRAW']),
});

/** Alle aktiven Nutzer-IDs einer Firma (für WS-/Push-Benachrichtigung). */
async function companyUserIds(companyId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { companyId, isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export default async function conversationRoutes(app: FastifyInstance) {
  // Unterhaltung zu einem Inserat beginnen (oder bestehende zurückgeben)
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const company = await requireVerifiedCompany(req, reply);
    if (!company) return;
    const body = startSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({
      where: { id: body.listingId },
      include: { company: { select: { id: true, status: true } } },
    });
    if (!listing || listing.status !== 'ACTIVE') {
      return reply.code(404).send({ error: 'Inserat nicht gefunden.' });
    }
    if (listing.companyId === company.id) {
      return reply.code(400).send({ error: 'Sie können Ihr eigenes Inserat nicht kontaktieren.' });
    }

    const conversation = await prisma.conversation.upsert({
      where: { listingId_buyerCompanyId: { listingId: listing.id, buyerCompanyId: company.id } },
      create: {
        listingId: listing.id,
        buyerCompanyId: company.id,
        sellerCompanyId: listing.companyId,
      },
      update: {},
    });

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderUserId: req.user.sub,
        type: body.offerAmountCents ? 'OFFER' : 'TEXT',
        body: body.body,
        offerAmountCents: body.offerAmountCents,
        offerStatus: body.offerAmountCents ? 'PENDING' : null,
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const recipients = await companyUserIds(listing.companyId);
    sendToUsers(recipients, { type: 'message:new', payload: { conversationId: conversation.id, message } });
    void sendPushToUsers(
      recipients,
      'Neue Anfrage',
      body.offerAmountCents
        ? `Preisvorschlag ${formatEuro(body.offerAmountCents)} zu „${listing.title}"`
        : `Neue Nachricht zu „${listing.title}"`,
      { conversationId: conversation.id },
    );

    return reply.code(201).send({ conversation, message });
  });

  // Übersicht aller Unterhaltungen der eigenen Firma
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const companyId = req.user.companyId;
    if (!companyId) return reply.code(403).send({ error: 'Kein Firmenkonto.' });

    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ buyerCompanyId: companyId }, { sellerCompanyId: companyId }] },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceCents: true,
            priceType: true,
            status: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          },
        },
        buyerCompany: { select: { id: true, name: true } },
        sellerCompany: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const items = await Promise.all(
      conversations.map(async (c) => {
        const isBuyer = c.buyerCompanyId === companyId;
        const lastReadAt = isBuyer ? c.buyerLastReadAt : c.sellerLastReadAt;
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
            sender: { companyId: { not: companyId } },
          },
        });
        return {
          id: c.id,
          listing: c.listing,
          counterpart: isBuyer ? c.sellerCompany : c.buyerCompany,
          role: isBuyer ? 'BUYER' : 'SELLER',
          lastMessage: c.messages[0] ?? null,
          unreadCount,
          updatedAt: c.updatedAt,
        };
      }),
    );
    return { items };
  });

  // Nachrichtenverlauf laden (markiert gleichzeitig als gelesen)
  app.get('/:id/messages', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const companyId = req.user.companyId;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            priceCents: true,
            priceType: true,
            status: true,
            companyId: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          },
        },
        buyerCompany: { select: { id: true, name: true } },
        sellerCompany: { select: { id: true, name: true } },
      },
    });
    if (!conversation || !companyId) return reply.code(404).send({ error: 'Unterhaltung nicht gefunden.' });
    const isBuyer = conversation.buyerCompanyId === companyId;
    const isSeller = conversation.sellerCompanyId === companyId;
    if (!isBuyer && !isSeller) return reply.code(403).send({ error: 'Kein Zugriff auf diese Unterhaltung.' });

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 500,
      include: { sender: { select: { id: true, firstName: true, lastName: true, companyId: true } } },
    });

    await prisma.conversation.update({
      where: { id },
      data: isBuyer ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() },
    });

    return {
      conversation: {
        id: conversation.id,
        listing: conversation.listing,
        counterpart: isBuyer ? conversation.sellerCompany : conversation.buyerCompany,
        role: isBuyer ? 'BUYER' : 'SELLER',
      },
      messages,
    };
  });

  // Nachricht oder Preisvorschlag senden
  app.post('/:id/messages', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = messageSchema.parse(req.body);
    const companyId = req.user.companyId;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { listing: { select: { title: true } } },
    });
    if (!conversation || !companyId) return reply.code(404).send({ error: 'Unterhaltung nicht gefunden.' });
    if (conversation.buyerCompanyId !== companyId && conversation.sellerCompanyId !== companyId) {
      return reply.code(403).send({ error: 'Kein Zugriff auf diese Unterhaltung.' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderUserId: req.user.sub,
        type: body.type,
        body: body.body,
        offerAmountCents: body.type === 'OFFER' ? body.offerAmountCents : null,
        offerStatus: body.type === 'OFFER' ? 'PENDING' : null,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, companyId: true } } },
    });
    await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

    const otherCompanyId =
      conversation.buyerCompanyId === companyId ? conversation.sellerCompanyId : conversation.buyerCompanyId;
    const recipients = await companyUserIds(otherCompanyId);
    sendToUsers(recipients, { type: 'message:new', payload: { conversationId: id, message } });
    void sendPushToUsers(
      recipients,
      'Neue Nachricht',
      body.type === 'OFFER' && body.offerAmountCents
        ? `Preisvorschlag ${formatEuro(body.offerAmountCents)} zu „${conversation.listing.title}"`
        : `Neue Nachricht zu „${conversation.listing.title}"`,
      { conversationId: id },
    );

    return reply.code(201).send({ message });
  });

  // Auf Preisvorschlag reagieren (annehmen / ablehnen / zurückziehen)
  app.post('/:id/offers/:messageId/respond', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, messageId } = req.params as { id: string; messageId: string };
    const { action } = respondSchema.parse(req.body);
    const companyId = req.user.companyId;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { companyId: true } },
        conversation: { include: { listing: { select: { title: true } } } },
      },
    });
    if (!message || message.conversationId !== id || !companyId) {
      return reply.code(404).send({ error: 'Nachricht nicht gefunden.' });
    }
    const conversation = message.conversation;
    if (conversation.buyerCompanyId !== companyId && conversation.sellerCompanyId !== companyId) {
      return reply.code(403).send({ error: 'Kein Zugriff auf diese Unterhaltung.' });
    }
    if (message.type !== 'OFFER' || message.offerStatus !== 'PENDING') {
      return reply.code(409).send({ error: 'Dieser Preisvorschlag ist nicht mehr offen.' });
    }

    const isOfferSender = message.sender.companyId === companyId;
    if (action === 'WITHDRAW' && !isOfferSender) {
      return reply.code(403).send({ error: 'Nur der Absender kann den Vorschlag zurückziehen.' });
    }
    if ((action === 'ACCEPT' || action === 'DECLINE') && isOfferSender) {
      return reply.code(403).send({ error: 'Sie können nicht auf Ihren eigenen Vorschlag reagieren.' });
    }

    const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : 'WITHDRAWN';
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { offerStatus: newStatus },
    });

    const label =
      newStatus === 'ACCEPTED' ? 'angenommen' : newStatus === 'DECLINED' ? 'abgelehnt' : 'zurückgezogen';
    const systemMessage = await prisma.message.create({
      data: {
        conversationId: id,
        senderUserId: req.user.sub,
        type: 'SYSTEM',
        body: `Preisvorschlag ${formatEuro(message.offerAmountCents ?? 0)} wurde ${label}.`,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, companyId: true } } },
    });
    await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

    const otherCompanyId =
      conversation.buyerCompanyId === companyId ? conversation.sellerCompanyId : conversation.buyerCompanyId;
    const recipients = await companyUserIds(otherCompanyId);
    sendToUsers(recipients, {
      type: 'offer:responded',
      payload: { conversationId: id, message: updated, systemMessage },
    });
    void sendPushToUsers(
      recipients,
      'Preisvorschlag ' + label,
      `Zu „${conversation.listing.title}"`,
      { conversationId: id },
    );

    return { message: updated, systemMessage };
  });
}
