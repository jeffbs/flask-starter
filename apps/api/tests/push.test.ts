import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// PUSH-3: Expo-SDK so mocken, dass jeder Versand knallt — Requests dürfen
// davon nie scheitern.
vi.mock('expo-server-sdk', () => {
  class FakeExpo {
    static isExpoPushToken(token: string) {
      return token.startsWith('ExponentPushToken');
    }
    chunkPushNotifications(messages: unknown[]) {
      return [messages];
    }
    async sendPushNotificationsAsync() {
      throw new Error('Expo nicht erreichbar (Test)');
    }
  }
  return { Expo: FakeExpo };
});

import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createListing } from './helpers/factories.js';
import { prisma } from '../src/db.js';

beforeEach(truncateAll);
afterAll(closeApp);

describe('Push-Token (PUSH-1)', () => {
  it('PUSH-1: Token-Registrierung ist Upsert; Logout entfernt Token', async () => {
    const app = await getApp();
    const { token, user } = await createActor();
    const payload = { token: 'ExponentPushToken[abc123]', platform: 'android' };
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/push/tokens',
        headers: { authorization: `Bearer ${token}` },
        payload,
      });
      expect(res.statusCode).toBe(201);
    }
    expect(await prisma.pushToken.count({ where: { userId: user.id } })).toBe(1);
    const del = await app.inject({
      method: 'DELETE',
      url: '/api/push/tokens',
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(del.statusCode).toBe(204);
    expect(await prisma.pushToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it('PUSH-1: Gerätewechsel — gleicher Token wandert zum neuen Nutzer', async () => {
    const app = await getApp();
    const first = await createActor();
    const second = await createActor();
    const payload = { token: 'ExponentPushToken[shared]', platform: 'ios' };
    await app.inject({
      method: 'POST',
      url: '/api/push/tokens',
      headers: { authorization: `Bearer ${first.token}` },
      payload,
    });
    await app.inject({
      method: 'POST',
      url: '/api/push/tokens',
      headers: { authorization: `Bearer ${second.token}` },
      payload,
    });
    const tokens = await prisma.pushToken.findMany();
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.userId).toBe(second.user.id);
  });
});

describe('Push ist Best-Effort (PUSH-3)', () => {
  it('PUSH-3: Nachricht wird 201 erstellt, obwohl der Push-Versand wirft', async () => {
    const app = await getApp();
    const sellerActor = await createActor();
    const listing = await createListing({
      companyId: sellerActor.company.id,
      createdById: sellerActor.user.id,
    });
    // Verkäufer hat ein registriertes Gerät → Versand wird versucht und wirft
    await prisma.pushToken.create({
      data: { userId: sellerActor.user.id, token: 'ExponentPushToken[boom]' },
    });
    const buyer = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: listing.id, body: 'Löst der Push einen Fehler aus?' },
    });
    expect(res.statusCode).toBe(201);
  });
});
