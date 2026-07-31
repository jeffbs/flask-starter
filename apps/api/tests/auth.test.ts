import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createUser, signToken } from './helpers/factories.js';

beforeEach(truncateAll);
afterAll(closeApp);

const validRegister = {
  company: { name: 'Neue Firma GmbH', city: 'Berlin', country: 'DE' },
  user: { email: 'owner@neu.dev', password: 'geheim1234', firstName: 'Nina', lastName: 'Neu' },
};

describe('POST /api/auth/register', () => {
  it('AUTH-1: legt Firma + Owner-Nutzer in einem Schritt an und liefert Token', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: validRegister });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.role).toBe('OWNER');
    expect(body.company.name).toBe('Neue Firma GmbH');
    expect(body.company.status).toBe('UNVERIFIED');
  });

  it('AUTH-2: lehnt bereits vergebene E-Mail mit 409 ab', async () => {
    const app = await getApp();
    await createUser({ email: 'owner@neu.dev' });
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: validRegister });
    expect(res.statusCode).toBe(409);
  });

  it('AUTH-3: lehnt Passwörter unter 8 Zeichen mit 400 ab', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...validRegister, user: { ...validRegister.user, password: 'kurz12' } },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues).toBeTruthy();
  });
});

describe('POST /api/auth/login', () => {
  it('AUTH-4: liefert Token bei korrekten Zugangsdaten', async () => {
    const app = await getApp();
    const { company } = await createActor();
    await createUser({ email: 'login@test.dev', companyId: company.id, password: 'geheim1234' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@test.dev', password: 'geheim1234' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().token).toBeTruthy();
  });

  it('AUTH-4: falsches Passwort → 401 ohne Feld-Hinweis', async () => {
    const app = await getApp();
    await createUser({ email: 'login@test.dev', password: 'geheim1234' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@test.dev', password: 'falsch1234' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).not.toMatch(/passwort.*falsch.*feld/i);
  });

  it('AUTH-5: deaktivierte Nutzer können sich nicht anmelden (403)', async () => {
    const app = await getApp();
    await createUser({ email: 'inaktiv@test.dev', password: 'geheim1234', isActive: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'inaktiv@test.dev', password: 'geheim1234' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET/PATCH /api/auth/me', () => {
  it('AUTH-6: liefert Nutzer- und Firmenprofil', async () => {
    const app = await getApp();
    const { token, company } = await createActor();
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().company.id).toBe(company.id);
  });

  it('AUTH-6: Name und Passwort sind änderbar', async () => {
    const app = await getApp();
    const { token, user } = await createActor();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { firstName: 'Geändert', password: 'neues-pass-123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.firstName).toBe('Geändert');
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: user.email, password: 'neues-pass-123' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('AUTH-7: fachliche Endpunkte ohne gültiges JWT → 401', async () => {
    const app = await getApp();
    for (const url of ['/api/auth/me', '/api/listings', '/api/favorites', '/api/conversations']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(401);
    }
    const bad = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer kaputt' },
    });
    expect(bad.statusCode).toBe(401);
  });
});
