import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createListing } from './helpers/factories.js';
import { prisma } from '../src/db.js';

beforeEach(truncateAll);
afterAll(closeApp);

describe('Merkliste', () => {
  it('FAV-1: merken ist idempotent, entmerken entfernt', async () => {
    const app = await getApp();
    const { token, user } = await createActor();
    const listing = await createListing();
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/favorites/${listing.id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(201);
    }
    expect(await prisma.favorite.count({ where: { userId: user.id } })).toBe(1);
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/favorites/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);
    expect(await prisma.favorite.count({ where: { userId: user.id } })).toBe(0);
  });

  it('FAV-1: nicht-aktive Inserate können nicht gemerkt werden (404)', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const listing = await createListing({ status: 'SOLD' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/favorites/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('FAV-2: Merkliste zeigt inzwischen verkaufte Inserate mit Status', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const listing = await createListing();
    await app.inject({
      method: 'POST',
      url: `/api/favorites/${listing.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    await prisma.listing.update({ where: { id: listing.id }, data: { status: 'SOLD' } });
    const res = await app.inject({
      method: 'GET',
      url: '/api/favorites',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
    expect(res.json().items[0].listing.status).toBe('SOLD');
  });
});
