import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import {
  createActor,
  createAdmin,
  createCategory,
  createListing,
  createUser,
  signToken,
} from './helpers/factories.js';
import { prisma } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { expireOverdueListings } from '../src/lib/expiry.js';

beforeEach(truncateAll);
afterAll(closeApp);

// ---------------------------------------------------------------------------
// Fehlerbehandlung (NFA-1)
// ---------------------------------------------------------------------------

describe('Fehlerbehandlung', () => {
  it('NFA-1: kaputtes JSON → 400 mit einheitlichem Fehlerformat', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{kaputt',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeTruthy();
  });

  it('NFA-1: unerwartete Fehler → 500 ohne interne Details', async () => {
    const app = await buildApp();
    app.get('/boom', async () => {
      throw new Error('Interner DB-Verbindungsstring: geheim');
    });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('Interner Serverfehler.');
    expect(JSON.stringify(res.json())).not.toContain('geheim');
    await app.close();
  });
});

// ---------------------------------------------------------------------------
// AuthZ-Ränder (NFA-2, AUTH-6)
// ---------------------------------------------------------------------------

describe('AuthZ-Ränder', () => {
  it('AUTH-6: /me mit Token eines gelöschten Nutzers → 404', async () => {
    const app = await getApp();
    const user = await createUser();
    const token = await signToken(user);
    await prisma.user.delete({ where: { id: user.id } });
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('NFA-2: Admin ohne Firma → 403 bei firmengebundenen Endpunkten', async () => {
    const app = await getApp();
    const admin = await createAdmin();
    for (const [method, url] of [
      ['GET', '/api/listings/mine'],
      ['GET', '/api/conversations'],
      ['PATCH', '/api/companies/mine'],
      ['GET', '/api/companies/mine/kyb'],
      ['POST', '/api/companies/mine/kyb'],
    ] as const) {
      const res = await app.inject({
        method,
        url,
        headers: { authorization: `Bearer ${admin.token}` },
        ...(method === 'PATCH' || method === 'POST' ? { payload: {} } : {}),
      });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
    }
  });

  it('NFA-2: Admin ohne Firma kann nicht inserieren oder kontaktieren (403)', async () => {
    const app = await getApp();
    const admin = await createAdmin();
    const listing = await createListing();
    const post = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${admin.token}` },
      payload: {},
    });
    expect(post.statusCode).toBe(403);
    const contact = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { listingId: listing.id, body: 'Hallo' },
    });
    expect(contact.statusCode).toBe(403);
  });

  it('CHAT-6: unbeteiligte Firma kann nicht auf Preisvorschläge reagieren (403)', async () => {
    const app = await getApp();
    const seller = await createActor();
    const listing = await createListing({ companyId: seller.company.id, createdById: seller.user.id });
    const buyer = await createActor();
    const started = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: listing.id, offerAmountCents: 50000 },
    });
    const stranger = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: `/api/conversations/${started.json().conversation.id}/offers/${started.json().message.id}/respond`,
      headers: { authorization: `Bearer ${stranger.token}` },
      payload: { action: 'ACCEPT' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('KYB-1: Token mit gelöschter Firma → 403 „Firma nicht gefunden"', async () => {
    const app = await getApp();
    const { company, user, token } = await createActor();
    await prisma.listing.deleteMany({});
    await prisma.user.update({ where: { id: user.id }, data: { companyId: null } });
    await prisma.company.delete({ where: { id: company.id } });
    const category = await createCategory();
    const res = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        categoryId: category.id,
        title: 'Geisterfirma inseriert',
        description: 'Darf nicht funktionieren, Firma existiert nicht mehr.',
        priceCents: 100,
        zip: '10115',
        city: 'Berlin',
      },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Firmenprofil & Firmen-Update (INS-7, AUTH-6)
// ---------------------------------------------------------------------------

describe('Firmenprofile', () => {
  it('INS-7: öffentliches Firmenprofil mit Zähler aktiver Inserate; 404 für Unbekannte', async () => {
    const app = await getApp();
    const seller = await createActor();
    await createListing({ companyId: seller.company.id, createdById: seller.user.id });
    await createListing({ companyId: seller.company.id, createdById: seller.user.id, status: 'SOLD' });
    const viewer = await createActor();
    const res = await app.inject({
      method: 'GET',
      url: `/api/companies/${seller.company.id}`,
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().company._count.listings).toBe(1);
    const missing = await app.inject({
      method: 'GET',
      url: '/api/companies/gibtsnicht',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(missing.statusCode).toBe(404);
  });

  it('AUTH-6: eigenes Firmenprofil aktualisieren', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/companies/mine',
      headers: { authorization: `Bearer ${token}` },
      payload: { description: 'Wir handeln mit Baumaschinen.', phone: '+49 231 555' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().company.description).toMatch(/Baumaschinen/);
  });

  it('KYB-2: eigener KYB-Status inkl. Dokumente abrufbar', async () => {
    const app = await getApp();
    const { token, company, user } = await createActor({ status: 'PENDING_REVIEW' });
    await prisma.kybDocument.create({
      data: {
        companyId: company.id,
        uploadedById: user.id,
        type: 'TRADE_REGISTER',
        fileUrl: 'http://x/hr.pdf',
        fileName: 'hr.pdf',
      },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('PENDING_REVIEW');
    expect(res.json().documents).toHaveLength(1);
  });

  it('KYB-4: gesperrte Firma kann kein KYB einreichen (403)', async () => {
    const app = await getApp();
    const { token } = await createActor({ status: 'SUSPENDED', vatId: null });
    const res = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        vatId: 'DE111222333',
        documents: [{ type: 'OTHER', fileUrl: 'http://x/d.pdf', fileName: 'd.pdf' }],
      },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Inserate: Ränder (INS-3, INS-6, SUCHE-2)
// ---------------------------------------------------------------------------

describe('Inserats-Ränder', () => {
  it('INS-6: eigene Inserate aller Status unter /mine, REMOVED ausgenommen', async () => {
    const app = await getApp();
    const actor = await createActor();
    await createListing({ companyId: actor.company.id, createdById: actor.user.id, status: 'ACTIVE' });
    await createListing({ companyId: actor.company.id, createdById: actor.user.id, status: 'PAUSED' });
    await createListing({ companyId: actor.company.id, createdById: actor.user.id, status: 'REMOVED' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings/mine',
      headers: { authorization: `Bearer ${actor.token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(2);
  });

  it('INS-3: „auf Anfrage" verwirft mitgesendeten Preis', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const category = await createCategory();
    const res = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        categoryId: category.id,
        title: 'Sondermaschine auf Anfrage',
        description: 'Preis wird individuell kalkuliert, bitte anfragen.',
        priceCents: 999999,
        priceType: 'ON_REQUEST',
        zip: '44145',
        city: 'Dortmund',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().listing.priceCents).toBeNull();
  });

  it('INS-6: Bearbeiten ersetzt Bilder in neuer Reihenfolge', async () => {
    const app = await getApp();
    const actor = await createActor();
    const listing = await createListing({ companyId: actor.company.id, createdById: actor.user.id });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/listings/${listing.id}`,
      headers: { authorization: `Bearer ${actor.token}` },
      payload: { imageUrls: ['http://x/b.jpg', 'http://x/a.jpg'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().listing.images.map((i: { url: string }) => i.url)).toEqual([
      'http://x/b.jpg',
      'http://x/a.jpg',
    ]);
  });

  it('INS-6: PATCH/DELETE/GET auf unbekannte Inserate → 404', async () => {
    const app = await getApp();
    const { token } = await createActor();
    for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
      const res = await app.inject({
        method,
        url: '/api/listings/gibtsnicht',
        headers: { authorization: `Bearer ${token}` },
        ...(method === 'PATCH' ? { payload: { title: 'Neuer Titel hier' } } : {}),
      });
      expect(res.statusCode, method).toBe(404);
    }
  });

  it('SUCHE-2: PLZ-Region und Firmen-Filter, Sortierung teuerste zuerst', async () => {
    const app = await getApp();
    const viewer = await createActor();
    const seller = await createActor();
    await createListing({ companyId: seller.company.id, createdById: seller.user.id, zip: '44145', priceCents: 100 });
    await createListing({ zip: '80331', priceCents: 200 });
    const zipFiltered = await app.inject({
      method: 'GET',
      url: '/api/listings?zip=44',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(zipFiltered.json().total).toBe(1);
    const byCompany = await app.inject({
      method: 'GET',
      url: `/api/listings?companyId=${seller.company.id}`,
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(byCompany.json().total).toBe(1);
    const desc = await app.inject({
      method: 'GET',
      url: '/api/listings?sort=price_desc',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(desc.json().items[0].priceCents).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Ablauf nach Laufzeit (INS-5)
// ---------------------------------------------------------------------------

describe('Inserats-Laufzeit', () => {
  it('INS-5: überfällige Inserate erscheinen nicht in der Suche, auch vor dem Sweep', async () => {
    const app = await getApp();
    const viewer = await createActor();
    const listing = await createListing();
    await prisma.listing.update({
      where: { id: listing.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/listings',
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(res.json().total).toBe(0);
  });

  it('INS-5: der Sweep markiert überfällige aktive Inserate als EXPIRED', async () => {
    const overdue = await createListing();
    const current = await createListing();
    const paused = await createListing({ status: 'PAUSED' });
    await prisma.listing.updateMany({
      where: { id: { in: [overdue.id, paused.id] } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const count = await expireOverdueListings();
    expect(count).toBe(1); // nur das aktive überfällige, PAUSED bleibt unangetastet
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: overdue.id } })).status).toBe('EXPIRED');
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: current.id } })).status).toBe('ACTIVE');
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: paused.id } })).status).toBe('PAUSED');
  });
});

// ---------------------------------------------------------------------------
// Kontakt-Telefon am Inserat (UI-Brief §6.4)
// ---------------------------------------------------------------------------

describe('Kontakt-Telefon', () => {
  it('INS-2: optionale Telefonnummer wird gespeichert und im Detail geliefert', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const category = await createCategory();
    const created = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        categoryId: category.id,
        title: 'Anhänger mit Rückrufnummer',
        description: 'Bei Fragen gerne direkt anrufen, werktags 8-17 Uhr.',
        priceCents: 250000,
        zip: '44145',
        city: 'Dortmund',
        contactPhone: '+49 231 555 0100',
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().listing.contactPhone).toBe('+49 231 555 0100');
    const viewer = await createActor();
    const detail = await app.inject({
      method: 'GET',
      url: `/api/listings/${created.json().listing.id}`,
      headers: { authorization: `Bearer ${viewer.token}` },
    });
    expect(detail.json().listing.contactPhone).toBe('+49 231 555 0100');
  });
});

// ---------------------------------------------------------------------------
// Chat-Ränder (CHAT-1, CHAT-4, CHAT-6)
// ---------------------------------------------------------------------------

describe('Chat-Ränder', () => {
  it('CHAT-1: Unterhaltung zu nicht-aktivem Inserat → 404', async () => {
    const app = await getApp();
    const listing = await createListing({ status: 'SOLD' });
    const buyer = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: listing.id, body: 'Noch da?' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('CHAT-6: Nachrichten/Respond auf unbekannte Unterhaltung → 404', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const messages = await app.inject({
      method: 'GET',
      url: '/api/conversations/gibtsnicht/messages',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(messages.statusCode).toBe(404);
    const post = await app.inject({
      method: 'POST',
      url: '/api/conversations/gibtsnicht/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'TEXT', body: 'Hallo?' },
    });
    expect(post.statusCode).toBe(404);
    const respond = await app.inject({
      method: 'POST',
      url: '/api/conversations/gibtsnicht/offers/auchnicht/respond',
      headers: { authorization: `Bearer ${token}` },
      payload: { action: 'ACCEPT' },
    });
    expect(respond.statusCode).toBe(404);
  });

  it('CHAT-4: Verkäufer-Angebot kann vom Verkäufer zurückgezogen werden; Nachricht anderer Unterhaltung → 404', async () => {
    const app = await getApp();
    const seller = await createActor();
    const listing = await createListing({ companyId: seller.company.id, createdById: seller.user.id });
    const buyer = await createActor();
    const started = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: listing.id, body: 'Interesse!' },
    });
    const conversationId = started.json().conversation.id;
    // Verkäufer macht Gegenangebot und zieht es zurück (WITHDRAW als Absender)
    const counter = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      headers: { authorization: `Bearer ${seller.token}` },
      payload: { type: 'OFFER', offerAmountCents: 150000 },
    });
    const withdraw = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/offers/${counter.json().message.id}/respond`,
      headers: { authorization: `Bearer ${seller.token}` },
      payload: { action: 'WITHDRAW' },
    });
    expect(withdraw.statusCode).toBe(200);
    expect(withdraw.json().message.offerStatus).toBe('WITHDRAWN');
    expect(withdraw.json().systemMessage.body).toMatch(/zurückgezogen/);

    // Respond mit falscher Conversation-ID in der URL → 404
    const other = await app.inject({
      method: 'POST',
      url: `/api/conversations/andere-id/offers/${counter.json().message.id}/respond`,
      headers: { authorization: `Bearer ${seller.token}` },
      payload: { action: 'ACCEPT' },
    });
    expect(other.statusCode).toBe(404);
  });

  it('CHAT-3: Erstkontakt nur mit Preisvorschlag (ohne Text) ist gültig', async () => {
    const app = await getApp();
    const listing = await createListing();
    const buyer = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: listing.id, offerAmountCents: 90000 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().message.type).toBe('OFFER');
    // Erstkontakt ganz ohne Inhalt → 400
    const empty = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: listing.id },
    });
    expect(empty.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Meldungen: alle Zieltypen (MOD-1)
// ---------------------------------------------------------------------------

describe('Meldungs-Zieltypen', () => {
  it('MOD-1: Firma und Nachricht sind meldbar; unbekannte Firma → 404', async () => {
    const app = await getApp();
    const seller = await createActor();
    const listing = await createListing({ companyId: seller.company.id, createdById: seller.user.id });
    const buyer = await createActor();
    const started = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { listingId: listing.id, body: 'Verdächtige Nachricht' },
    });
    const messageId = started.json().message.id;

    const companyReport = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { targetType: 'COMPANY', targetId: seller.company.id, reason: 'Fake-Firma', details: 'Impressum fehlt' },
    });
    expect(companyReport.statusCode).toBe(201);

    const messageReport = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: { authorization: `Bearer ${seller.token}` },
      payload: { targetType: 'MESSAGE', targetId: messageId, reason: 'Spam' },
    });
    expect(messageReport.statusCode).toBe(201);

    const missing = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: { authorization: `Bearer ${buyer.token}` },
      payload: { targetType: 'COMPANY', targetId: 'gibtsnicht', reason: 'Fake-Firma' },
    });
    expect(missing.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Admin: Dashboard, Listen, Ränder (BO-2…BO-6)
// ---------------------------------------------------------------------------

describe('Admin-Ränder', () => {
  it('BO-2: Dashboard-Statistiken zählen korrekt', async () => {
    const app = await getApp();
    await createActor({ status: 'VERIFIED' });
    await createActor({ status: 'PENDING_REVIEW' });
    const seller = await createActor();
    await createListing({ companyId: seller.company.id, createdById: seller.user.id });
    const listing = await createListing();
    const reporter = await createActor();
    await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: { authorization: `Bearer ${reporter.token}` },
      payload: { targetType: 'LISTING', targetId: listing.id, reason: 'Spam' },
    });
    const admin = await createAdmin();
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(res.statusCode).toBe(200);
    const stats = res.json();
    expect(stats.pendingKyb).toBe(1);
    expect(stats.openReports).toBe(1);
    expect(stats.listingsByStatus.ACTIVE).toBe(2);
    expect(stats.totalUsers).toBeGreaterThanOrEqual(4);
  });

  it('BO-3: Firmenliste filtert nach Status und Suchbegriff; Detail inkl. Nutzer', async () => {
    const app = await getApp();
    const { company } = await createActor({ name: 'Suchbare Stahl AG', status: 'VERIFIED' });
    await createActor({ status: 'PENDING_REVIEW' });
    const admin = await createAdmin();
    const filtered = await app.inject({
      method: 'GET',
      url: '/api/admin/companies?status=VERIFIED&q=suchbare',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(filtered.json().total).toBe(1);
    expect(filtered.json().items[0].name).toBe('Suchbare Stahl AG');

    const detail = await app.inject({
      method: 'GET',
      url: `/api/admin/companies/${company.id}`,
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().company.users).toHaveLength(1);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/admin/companies/gibtsnicht',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(missing.statusCode).toBe(404);
  });

  it('BO-4: Inseratsliste filtert nach Status und Titel', async () => {
    const app = await getApp();
    await createListing({ title: 'Filterbarer Gabelstapler', status: 'ACTIVE' });
    await createListing({ status: 'PAUSED' });
    const admin = await createAdmin();
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/listings?status=ACTIVE&q=filterbarer',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(res.json().total).toBe(1);
  });

  it('MOD-3/MOD-4/KYB-5: Admin-Aktionen auf unbekannte Ziele → 404', async () => {
    const app = await getApp();
    const admin = await createAdmin();
    const headers = { authorization: `Bearer ${admin.token}` };
    expect((await app.inject({ method: 'POST', url: '/api/admin/companies/x/verify', headers, payload: { approve: true } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/admin/companies/x/suspend', headers, payload: { suspend: true } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/admin/listings/x/remove', headers, payload: { reason: 'Test' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/admin/listings/x/restore', headers, payload: {} })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/admin/reports/x/resolve', headers, payload: { status: 'RESOLVED' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: '/api/admin/categories/x', headers, payload: { name: 'Neu' } })).statusCode).toBe(404);
  });

  it('MOD-4: Entsperren einer nie verifizierten Firma → UNVERIFIED', async () => {
    const app = await getApp();
    const { company } = await createActor({ status: 'SUSPENDED', verifiedAt: null });
    const admin = await createAdmin();
    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${company.id}/suspend`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { suspend: false },
    });
    expect(res.json().company.status).toBe('UNVERIFIED');
  });

  it('BO-6/BO-7: Kategorienliste mit Zählern und Audit-Log-Liste', async () => {
    const app = await getApp();
    const category = await createCategory();
    await createListing({ categoryId: category.id });
    const admin = await createAdmin();
    const categories = await app.inject({
      method: 'GET',
      url: '/api/admin/categories',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(categories.statusCode).toBe(200);
    expect(categories.json().categories[0]._count.listings).toBe(1);

    const listing = await createListing();
    await app.inject({
      method: 'POST',
      url: `/api/admin/listings/${listing.id}/remove`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { reason: 'Audit-Test' },
    });
    const audit = await app.inject({
      method: 'GET',
      url: '/api/admin/audit',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(audit.statusCode).toBe(200);
    expect(audit.json().total).toBe(1);
    expect(audit.json().items[0].action).toBe('listing.remove');
  });
});
