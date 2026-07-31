import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createCategory, createListing } from './helpers/factories.js';
import { prisma } from '../src/db.js';

beforeEach(truncateAll);
afterAll(closeApp);

function validPayload(categoryId: string) {
  return {
    categoryId,
    title: 'Minibagger Kubota gebraucht',
    description: 'Guter Zustand, Wartung dokumentiert, drei Löffel inklusive.',
    priceCents: 2190000,
    priceType: 'NEGOTIABLE',
    condition: 'USED',
    zip: '44145',
    city: 'Dortmund',
    imageUrls: ['http://localhost:4000/uploads/a.jpg'],
  };
}

describe('POST /api/listings', () => {
  it('INS-2/INS-5: verifizierte Firma inseriert → ACTIVE, publiziert, läuft 60 Tage', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const category = await createCategory();
    const res = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload(category.id),
    });
    expect(res.statusCode).toBe(201);
    const { listing } = res.json();
    expect(listing.status).toBe('ACTIVE');
    expect(listing.publishedAt).toBeTruthy();
    const days = (new Date(listing.expiresAt).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(59);
    expect(days).toBeLessThan(61);
    expect(listing.images).toHaveLength(1);
  });

  it('INS-2: Titel unter 5 Zeichen → 400 mit Feldliste (NFA-1)', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const category = await createCategory();
    const res = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload(category.id), title: 'Kurz' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues.some((i: { path: string }) => i.path === 'title')).toBe(true);
  });

  it('INS-3: ohne Preis und ohne "auf Anfrage" → 400; ON_REQUEST ohne Preis ist ok', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const category = await createCategory();
    const noPrice = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload(category.id), priceCents: null },
    });
    expect(noPrice.statusCode).toBe(400);
    const onRequest = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPayload(category.id), priceCents: null, priceType: 'ON_REQUEST' },
    });
    expect(onRequest.statusCode).toBe(201);
    expect(onRequest.json().listing.priceCents).toBeNull();
  });

  it('KAT-2: inaktive Kategorie ist nicht wählbar (400)', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const category = await createCategory({ isActive: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: validPayload(category.id),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH/DELETE /api/listings/:id', () => {
  it('INS-6: Inserent pausiert, reaktiviert und markiert als verkauft', async () => {
    const app = await getApp();
    const actor = await createActor();
    const listing = await createListing({ companyId: actor.company.id, createdById: actor.user.id });
    for (const status of ['PAUSED', 'ACTIVE', 'SOLD'] as const) {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/listings/${listing.id}`,
        headers: { authorization: `Bearer ${actor.token}` },
        payload: { status },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().listing.status).toBe(status);
    }
  });

  it('INS-6: fremde Inserate sind nicht bearbeitbar/löschbar (403)', async () => {
    const app = await getApp();
    const listing = await createListing();
    const stranger = await createActor();
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${stranger.token}` },
      payload: { title: 'Übernommen!' },
    });
    expect(patch.statusCode).toBe(403);
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${stranger.token}` },
    });
    expect(del.statusCode).toBe(403);
  });

  it('INS-6: von Moderation entfernte Inserate sind nicht bearbeitbar (403)', async () => {
    const app = await getApp();
    const actor = await createActor();
    const listing = await createListing({
      companyId: actor.company.id,
      createdById: actor.user.id,
      status: 'REMOVED',
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${actor.token}` },
      payload: { title: 'Wieder da, ganz neu!' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('INS-6: Inserent löscht eigenes Inserat (204)', async () => {
    const app = await getApp();
    const actor = await createActor();
    const listing = await createListing({ companyId: actor.company.id, createdById: actor.user.id });
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${actor.token}` },
    });
    expect(res.statusCode).toBe(204);
    expect(await prisma.listing.findUnique({ where: { id: listing.id } })).toBeNull();
  });
});

describe('GET /api/listings/:id', () => {
  it('INS-7: Detail zeigt Firma und zählt Fremdaufrufe', async () => {
    const app = await getApp();
    const listing = await createListing();
    const viewer = await createActor();
    const res = await app.inject({
      method: 'GET',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().listing.company.name).toBeTruthy();
    expect(res.json().isOwner).toBe(false);
    // Aufrufzähler ist fire-and-forget → kurz warten
    await new Promise((r) => setTimeout(r, 100));
    const updated = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(updated.viewCount).toBe(1);
  });

  it('INS-8: nicht-aktive Inserate sind für Fremde 404, für den Inserenten sichtbar', async () => {
    const app = await getApp();
    const actor = await createActor();
    const listing = await createListing({
      companyId: actor.company.id,
      createdById: actor.user.id,
      status: 'PAUSED',
    });
    const stranger = await createActor();
    const hidden = await app.inject({
      method: 'GET',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${stranger.token}` },
    });
    expect(hidden.statusCode).toBe(404);
    const own = await app.inject({
      method: 'GET',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${actor.token}` },
    });
    expect(own.statusCode).toBe(200);
    expect(own.json().isOwner).toBe(true);
  });
});

describe('GET /api/listings (Suche, SUCHE-1…4)', () => {
  it('SUCHE-1: Volltext über Titel und Beschreibung, case-insensitiv', async () => {
    const app = await getApp();
    const viewer = await createActor();
    await createListing({ title: 'Gabelstapler Linde H25' });
    await createListing({ title: 'Bürostuhl', description: 'Dazu passender GABELSTAPLER-Schein…' });
    await createListing({ title: 'Europaletten tauschfähig' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings?q=gabelstapler',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(2);
  });

  it('SUCHE-2: Kategorie-Filter schließt Unterkategorien ein', async () => {
    const app = await getApp();
    const viewer = await createActor();
    const parent = await createCategory({ name: 'Maschinen' });
    const child = await createCategory({ name: 'Baumaschinen', parentId: parent.id });
    await createListing({ categoryId: parent.id });
    await createListing({ categoryId: child.id });
    await createListing(); // andere Kategorie
    const res = await app.inject({
      method: 'GET',
      url: `/api/listings?categoryId=${parent.id}`,
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(res.json().total).toBe(2);
  });

  it('SUCHE-2: Preisspanne und Zustand filtern', async () => {
    const app = await getApp();
    const viewer = await createActor();
    await createListing({ priceCents: 5000, condition: 'NEW' });
    await createListing({ priceCents: 50000, condition: 'USED' });
    await createListing({ priceCents: 500000, condition: 'USED' });
    const price = await app.inject({
      method: 'GET',
      url: '/api/listings?priceMin=10000&priceMax=100000',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(price.json().total).toBe(1);
    const cond = await app.inject({
      method: 'GET',
      url: '/api/listings?condition=USED',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(cond.json().total).toBe(2);
  });

  it('SUCHE-3: Sortierung nach Preis und Pagination', async () => {
    const app = await getApp();
    const viewer = await createActor();
    await createListing({ priceCents: 300 });
    await createListing({ priceCents: 100 });
    await createListing({ priceCents: 200 });
    const asc = await app.inject({
      method: 'GET',
      url: '/api/listings?sort=price_asc',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(asc.json().items.map((i: { priceCents: number }) => i.priceCents)).toEqual([100, 200, 300]);
    const page2 = await app.inject({
      method: 'GET',
      url: '/api/listings?sort=price_asc&page=2&limit=2',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(page2.json().items).toHaveLength(1);
    expect(page2.json().total).toBe(3);
  });

  it('SUCHE-4: nur ACTIVE-Inserate erscheinen in Ergebnissen', async () => {
    const app = await getApp();
    const viewer = await createActor();
    await createListing({ status: 'ACTIVE' });
    await createListing({ status: 'PAUSED' });
    await createListing({ status: 'SOLD' });
    await createListing({ status: 'REMOVED' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(res.json().total).toBe(1);
  });
});
