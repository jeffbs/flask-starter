import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createListing, createUser, signToken } from './helpers/factories.js';
import { prisma } from '../src/db.js';

beforeEach(truncateAll);
afterAll(closeApp);

/** App genau einmal an einen echten Port binden (für WS-Tests). */
async function ensureListening() {
  const app = await getApp();
  if (!app.server.listening) await app.listen({ port: 0 });
  const address = app.server.address();
  return { app, port: typeof address === 'object' && address ? address.port : 0 };
}

async function seller() {
  const actor = await createActor();
  const listing = await createListing({ companyId: actor.company.id, createdById: actor.user.id });
  return { ...actor, listing };
}

describe('POST /api/conversations', () => {
  it('CHAT-1: pro (Inserat, Käufer-Firma) existiert genau eine Unterhaltung', async () => {
    const app = await getApp();
    const s = await seller();
    const buyer = await createActor();
    const first = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: s.listing.id, body: 'Noch verfügbar?' },
    });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: s.listing.id, body: 'Nachtrag dazu' },
    });
    expect(second.statusCode).toBe(201);
    expect(second.json().conversation.id).toBe(first.json().conversation.id);
    expect(await prisma.conversation.count()).toBe(1);
    expect(await prisma.message.count()).toBe(2);
  });

  it('CHAT-2: eigenes Inserat kontaktieren → 400', async () => {
    const app = await getApp();
    const s = await seller();
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${s.token}` },
      payload: { listingId: s.listing.id, body: 'Hallo ich selbst' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Nachrichten & Preisvorschläge', () => {
  async function conversation() {
    const app = await getApp();
    const s = await seller();
    const buyer = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: s.listing.id, body: 'Interesse!' },
    });
    return { app, s, buyer, conversationId: res.json().conversation.id as string };
  }

  it('CHAT-3: TEXT braucht body, OFFER braucht Betrag (400 sonst)', async () => {
    const { app, buyer, conversationId } = await conversation();
    const badText = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { type: 'TEXT' },
    });
    expect(badText.statusCode).toBe(400);
    const badOffer = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { type: 'OFFER' },
    });
    expect(badOffer.statusCode).toBe(400);
    const offer = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { type: 'OFFER', offerAmountCents: 190000 },
    });
    expect(offer.statusCode).toBe(201);
    expect(offer.json().message.offerStatus).toBe('PENDING');
  });

  it('CHAT-4: Gegenseite nimmt an; Reaktion erzeugt Systemnachricht', async () => {
    const { app, s, buyer, conversationId } = await conversation();
    const offer = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { type: 'OFFER', offerAmountCents: 190000 },
    });
    const messageId = offer.json().message.id;
    const accept = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/offers/${messageId}/respond`,
      headers: { authorization: `Bearer ${s.token}` },
      payload: { action: 'ACCEPT' },
    });
    expect(accept.statusCode).toBe(200);
    expect(accept.json().message.offerStatus).toBe('ACCEPTED');
    expect(accept.json().systemMessage.type).toBe('SYSTEM');
    expect(accept.json().systemMessage.body).toMatch(/angenommen/);
  });

  it('CHAT-4: eigener Vorschlag nicht annehmbar (403); Fremd-Rückzug 403; erledigte 409', async () => {
    const { app, s, buyer, conversationId } = await conversation();
    const offer = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { type: 'OFFER', offerAmountCents: 100000 },
    });
    const messageId = offer.json().message.id;
    const selfAccept = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/offers/${messageId}/respond`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { action: 'ACCEPT' },
    });
    expect(selfAccept.statusCode).toBe(403);
    const foreignWithdraw = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/offers/${messageId}/respond`,
      headers: { authorization: `Bearer ${s.token}` },
      payload: { action: 'WITHDRAW' },
    });
    expect(foreignWithdraw.statusCode).toBe(403);
    await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/offers/${messageId}/respond`,
      headers: { authorization: `Bearer ${s.token}` },
      payload: { action: 'DECLINE' },
    });
    const again = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/offers/${messageId}/respond`,
      headers: { authorization: `Bearer ${s.token}` },
      payload: { action: 'DECLINE' },
    });
    expect(again.statusCode).toBe(409);
  });

  it('CHAT-5: Ungelesen-Zähler; Öffnen des Verlaufs markiert gelesen', async () => {
    const { app, s, buyer, conversationId } = await conversation();
    await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { type: 'TEXT', body: 'Zweite Nachricht' },
    });
    const list = await app.inject({
      method: 'GET',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${s.token}` },
    });
    expect(list.json().items[0].unreadCount).toBe(2);
    await app.inject({
      method: 'GET',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${s.token}` },
    });
    const after = await app.inject({
      method: 'GET',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${s.token}` },
    });
    expect(after.json().items[0].unreadCount).toBe(0);
  });

  it('CHAT-6: unbeteiligte Firma hat keinen Zugriff (403); Kollege derselben Firma schon', async () => {
    const { app, s, conversationId } = await conversation();
    const stranger = await createActor();
    const denied = await app.inject({
      method: 'GET',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${stranger.token}` },
    });
    expect(denied.statusCode).toBe(403);
    const colleague = await createUser({ companyId: s.company.id, role: 'MEMBER' });
    const colleagueToken = await signToken(colleague);
    const allowed = await app.inject({
      method: 'GET',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${colleagueToken}` },
    });
    expect(allowed.statusCode).toBe(200);
  });

  it('CHAT-7: neue Nachricht wird über WebSocket an die Gegenseite zugestellt', async () => {
    const { app, s, buyer, conversationId } = await conversation();
    const { port } = await ensureListening();

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${s.token}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });
    const eventPromise = new Promise<{ type: string; payload: { conversationId: string } }>((resolve) => {
      ws.on('message', (raw) => resolve(JSON.parse(String(raw))));
    });

    await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { type: 'TEXT', body: 'Echtzeit-Test' },
    });

    const event = await eventPromise;
    expect(event.type).toBe('message:new');
    expect(event.payload.conversationId).toBe(conversationId);
    ws.close();
  });

  it('CHAT-7: WebSocket ohne gültiges Token wird geschlossen', async () => {
    const { port } = await ensureListening();
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=ungueltig`);
    const code = await new Promise<number>((resolve) => {
      ws.on('close', (c) => resolve(c));
      ws.on('error', () => {});
    });
    expect(code).toBe(4401);
  });
});
