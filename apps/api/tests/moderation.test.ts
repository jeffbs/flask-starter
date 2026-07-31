import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createAdmin, createListing } from './helpers/factories.js';
import { prisma } from '../src/db.js';

beforeEach(truncateAll);
afterAll(closeApp);

describe('Meldungen (MOD-1/MOD-2)', () => {
  it('MOD-1: Inserat melden; nicht existierendes Ziel → 404', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const listing = await createListing();
    const ok = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: { authorization: `Bearer ${token}` },
      payload: { targetType: 'LISTING', targetId: listing.id, reason: 'Verbotener Artikel' },
    });
    expect(ok.statusCode).toBe(201);
    const missing = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: { authorization: `Bearer ${token}` },
      payload: { targetType: 'LISTING', targetId: 'gibtsnicht', reason: 'Spam' },
    });
    expect(missing.statusCode).toBe(404);
  });

  it('MOD-2: Admin filtert nach Status und schließt mit Notiz ab', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const listing = await createListing();
    const created = await app.inject({
      method: 'POST',
      url: '/api/reports',
      headers: { authorization: `Bearer ${token}` },
      payload: { targetType: 'LISTING', targetId: listing.id, reason: 'Spam' },
    });
    const reportId = created.json().report.id;
    const admin = await createAdmin();
    const open = await app.inject({
      method: 'GET',
      url: '/api/admin/reports?status=OPEN',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(open.json().total).toBe(1);
    const resolve = await app.inject({
      method: 'POST',
      url: `/api/admin/reports/${reportId}/resolve`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { status: 'RESOLVED', note: 'Inserat entfernt' },
    });
    expect(resolve.statusCode).toBe(200);
    const stillOpen = await app.inject({
      method: 'GET',
      url: '/api/admin/reports?status=OPEN',
      headers: { authorization: `Bearer ${admin.token}` },
    });
    expect(stillOpen.json().total).toBe(0);
  });
});

describe('Inserats-Moderation (MOD-3)', () => {
  it('MOD-3: Admin entfernt mit Begründung und stellt wieder her', async () => {
    const app = await getApp();
    const listing = await createListing();
    const admin = await createAdmin();
    const removed = await app.inject({
      method: 'POST',
      url: `/api/admin/listings/${listing.id}/remove`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { reason: 'Verstößt gegen die Richtlinien' },
    });
    expect(removed.statusCode).toBe(200);
    let db = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(db.status).toBe('REMOVED');
    expect(db.moderationNote).toMatch(/Richtlinien/);
    const restored = await app.inject({
      method: 'POST',
      url: `/api/admin/listings/${listing.id}/restore`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: {},
    });
    expect(restored.statusCode).toBe(200);
    db = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(db.status).toBe('ACTIVE');
    expect(db.moderationNote).toBeNull();
  });
});

describe('Firmen-Sperrung (MOD-4)', () => {
  it('MOD-4: Sperren pausiert aktive Inserate; Entsperren stellt Verifizierung wieder her', async () => {
    const app = await getApp();
    const actor = await createActor({ status: 'VERIFIED' });
    const listing = await createListing({ companyId: actor.company.id, createdById: actor.user.id });
    const admin = await createAdmin();
    const suspend = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${actor.company.id}/suspend`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { suspend: true, reason: 'Betrugsverdacht' },
    });
    expect(suspend.statusCode).toBe(200);
    expect(suspend.json().company.status).toBe('SUSPENDED');
    const pausedListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(pausedListing.status).toBe('PAUSED');
    const unsuspend = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${actor.company.id}/suspend`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { suspend: false },
    });
    expect(unsuspend.json().company.status).toBe('VERIFIED');
  });
});

describe('Audit & Zugriff (MOD-5, NFA-2)', () => {
  it('MOD-5: Entfernen/Sperren erzeugen Audit-Log-Einträge', async () => {
    const app = await getApp();
    const listing = await createListing();
    const admin = await createAdmin();
    await app.inject({
      method: 'POST',
      url: `/api/admin/listings/${listing.id}/remove`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { reason: 'Test' },
    });
    const logs = await prisma.auditLog.findMany();
    expect(logs.map((l) => l.action)).toContain('listing.remove');
  });

  it('NFA-2: Admin-Endpunkte sind für normale Nutzer 403, ohne Token 401', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(forbidden.statusCode).toBe(403);
    const unauthorized = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    expect(unauthorized.statusCode).toBe(401);
  });
});
