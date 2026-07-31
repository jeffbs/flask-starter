import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor, createAdmin, createCategory, createListing } from './helpers/factories.js';
import { prisma } from '../src/db.js';

beforeEach(truncateAll);
afterAll(closeApp);

describe('Kategorien', () => {
  it('KAT-1/KAT-2: App erhält aktiven Baum (flach mit parentId), inaktive fehlen', async () => {
    const app = await getApp();
    const parent = await createCategory({ name: 'Maschinen', slug: 'maschinen' });
    await createCategory({ name: 'Baumaschinen', slug: 'baumaschinen', parentId: parent.id });
    await createCategory({ name: 'Alt', slug: 'alt', isActive: false });
    const res = await app.inject({ method: 'GET', url: '/api/categories' });
    expect(res.statusCode).toBe(200);
    const { categories } = res.json();
    expect(categories).toHaveLength(2);
    const child = categories.find((c: { slug: string }) => c.slug === 'baumaschinen');
    expect(child.parentId).toBe(parent.id);
  });

  it('KAT-1: Slug ist eindeutig — Duplikat schlägt fehl', async () => {
    const app = await getApp();
    const admin = await createAdmin();
    await createCategory({ slug: 'doppelt' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/categories',
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { name: 'Doppelt', slug: 'doppelt' },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('KAT-3: Admin legt an und deaktiviert; Inserate bleiben bestehen', async () => {
    const app = await getApp();
    const admin = await createAdmin();
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/categories',
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { name: 'Neue Kategorie', slug: 'neue-kategorie' },
    });
    expect(created.statusCode).toBe(201);
    const categoryId = created.json().category.id;
    const listing = await createListing({ categoryId });
    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/admin/categories/${categoryId}`,
      headers: { authorization: `Bearer ${admin.token}` },
      payload: { isActive: false },
    });
    expect(patched.statusCode).toBe(200);
    expect(await prisma.listing.findUnique({ where: { id: listing.id } })).not.toBeNull();
    const publicList = await app.inject({ method: 'GET', url: '/api/categories' });
    expect(publicList.json().categories.map((c: { id: string }) => c.id)).not.toContain(categoryId);
  });

  it('NFA-2: Kategorie-Verwaltung nur für Admins (403)', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/categories',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Hack', slug: 'hack' },
    });
    expect(res.statusCode).toBe(403);
  });
});
