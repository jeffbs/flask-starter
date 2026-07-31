import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createAdmin, createCategory, createListing } from './helpers/factories.js';
import { prisma } from '../src/db.js';

beforeEach(truncateAll);
afterAll(closeApp);

const kybPayload = {
  vatId: 'DE 812 345 678',
  registrationNumber: 'HRB 999',
  registrationCourt: 'AG Berlin',
  documents: [{ type: 'TRADE_REGISTER', fileUrl: 'http://x/doc.pdf', fileName: 'hr-auszug.pdf' }],
};

describe('KYB-Gating', () => {
  it('KYB-1: unverifizierte Firma kann nicht inserieren (403 COMPANY_NOT_VERIFIED)', async () => {
    const app = await getApp();
    const { token } = await createActor({ status: 'UNVERIFIED' });
    const category = await createCategory();
    const res = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        categoryId: category.id,
        title: 'Testmaschine abzugeben',
        description: 'Beschreibung mit ausreichend Länge.',
        priceCents: 1000,
        zip: '10115',
        city: 'Berlin',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('COMPANY_NOT_VERIFIED');
  });

  it('KYB-1: unverifizierte Firma kann keine Unterhaltung beginnen (403)', async () => {
    const app = await getApp();
    const listing = await createListing();
    const { token } = await createActor({ status: 'PENDING_REVIEW' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${token}` },
      payload: { listingId: listing.id, body: 'Ist das noch zu haben?' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/companies/mine/kyb', () => {
  it('KYB-2: Einreichung mit gültiger USt-Id + Dokument → PENDING_REVIEW', async () => {
    const app = await getApp();
    const { token, company } = await createActor({ status: 'UNVERIFIED', vatId: null });
    const res = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${token}` },
      payload: kybPayload,
    });
    expect(res.statusCode).toBe(201);
    const updated = await prisma.company.findUniqueOrThrow({ where: { id: company.id } });
    expect(updated.status).toBe('PENDING_REVIEW');
    expect(updated.vatId).toBe('DE812345678');
  });

  it('KYB-2: ohne Dokument → 400; ungültiges USt-Id-Format → 400', async () => {
    const app = await getApp();
    const { token } = await createActor({ status: 'UNVERIFIED', vatId: null });
    const noDoc = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...kybPayload, documents: [] },
    });
    expect(noDoc.statusCode).toBe(400);
    const badVat = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...kybPayload, vatId: 'DE12345' },
    });
    expect(badVat.statusCode).toBe(400);
  });

  it('KYB-3: bereits registrierte USt-IdNr. → 409', async () => {
    const app = await getApp();
    await createActor({ vatId: 'DE812345678' });
    const { token } = await createActor({ status: 'UNVERIFIED', vatId: null });
    const res = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${token}` },
      payload: kybPayload,
    });
    expect(res.statusCode).toBe(409);
  });

  it('KYB-4: erneute Einreichung während Prüfung → 409; bei VERIFIED → 409', async () => {
    const app = await getApp();
    const pending = await createActor({ status: 'PENDING_REVIEW', vatId: null });
    const r1 = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${pending.token}` },
      payload: kybPayload,
    });
    expect(r1.statusCode).toBe(409);
    const verified = await createActor({ status: 'VERIFIED' });
    const r2 = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${verified.token}` },
      payload: { ...kybPayload, vatId: 'DE999888777' },
    });
    expect(r2.statusCode).toBe(409);
  });
});

describe('Admin-KYB-Entscheidung', () => {
  it('KYB-5: Admin gibt frei → VERIFIED mit verifiedAt', async () => {
    const app = await getApp();
    const { company } = await createActor({ status: 'PENDING_REVIEW' });
    const admin = await createAdmin();
    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${company.id}/verify`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { approve: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().company.status).toBe('VERIFIED');
    expect(res.json().company.verifiedAt).toBeTruthy();
  });

  it('KYB-5: Ablehnung ohne Begründung → 400; mit Begründung → REJECTED', async () => {
    const app = await getApp();
    const { company } = await createActor({ status: 'PENDING_REVIEW' });
    const admin = await createAdmin();
    const noReason = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${company.id}/verify`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { approve: false },
    });
    expect(noReason.statusCode).toBe(400);
    const rejected = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${company.id}/verify`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { approve: false, reason: 'Handelsregisterauszug unleserlich' },
    });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.json().company.status).toBe('REJECTED');
    expect(rejected.json().company.rejectionReason).toMatch(/unleserlich/);
  });

  it('KYB-5: Firma ohne offene Prüfung → 409; Nicht-Admin → 403 (NFA-2)', async () => {
    const app = await getApp();
    const { company, token } = await createActor({ status: 'VERIFIED' });
    const admin = await createAdmin();
    const conflict = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${company.id}/verify`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { approve: true },
    });
    expect(conflict.statusCode).toBe(409);
    const forbidden = await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${company.id}/verify`,
      headers: { authorization: `Bearer ${token}` },
      payload: { approve: true },
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('KYB-6/MOD-5: Entscheidung landet im Audit-Log', async () => {
    const app = await getApp();
    const { company } = await createActor({ status: 'PENDING_REVIEW' });
    const admin = await createAdmin();
    await app.inject({
      method: 'POST',
      url: `/api/admin/companies/${company.id}/verify`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { approve: true },
    });
    const logs = await prisma.auditLog.findMany({ where: { targetId: company.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.action).toBe('company.verify');
    expect(logs[0]!.adminId).toBe(admin.user.id);
  });

  it('KYB-7: abgelehnte Firma kann korrigiert erneut einreichen', async () => {
    const app = await getApp();
    const { token, company } = await createActor({ status: 'REJECTED', vatId: null });
    const res = await app.inject({
      method: 'POST',
      url: '/api/companies/mine/kyb',
      headers: { authorization: `Bearer ${token}` },
      payload: kybPayload,
    });
    expect(res.statusCode).toBe(201);
    const updated = await prisma.company.findUniqueOrThrow({ where: { id: company.id } });
    expect(updated.status).toBe('PENDING_REVIEW');
    expect(updated.rejectionReason).toBeNull();
  });
});
