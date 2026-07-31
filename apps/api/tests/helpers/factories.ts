import type { Company, CompanyStatus, User, UserRole, Listing, ListingStatus, Category } from '@prisma/client';
import { prisma } from '../../src/db.js';
import { hashPassword } from '../../src/lib/passwords.js';
import { getApp } from './testapp.js';

let seq = 0;
const next = () => ++seq;

export async function createCompany(overrides: Partial<{
  name: string;
  status: CompanyStatus;
  vatId: string | null;
  verifiedAt: Date | null;
}> = {}): Promise<Company> {
  const n = next();
  return prisma.company.create({
    data: {
      name: overrides.name ?? `Testfirma ${n} GmbH`,
      status: overrides.status ?? 'VERIFIED',
      vatId: overrides.vatId === undefined ? `DE${String(100000000 + n)}` : overrides.vatId,
      verifiedAt:
        overrides.verifiedAt !== undefined
          ? overrides.verifiedAt
          : (overrides.status ?? 'VERIFIED') === 'VERIFIED'
            ? new Date()
            : null,
      city: 'Dortmund',
      zip: '44145',
    },
  });
}

export async function createUser(overrides: Partial<{
  email: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
  password: string;
}> = {}): Promise<User> {
  const n = next();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user${n}@test.dev`,
      passwordHash: await hashPassword(overrides.password ?? 'test1234'),
      firstName: 'Test',
      lastName: `Nutzer${n}`,
      role: overrides.role ?? 'OWNER',
      companyId: overrides.companyId ?? null,
      isActive: overrides.isActive ?? true,
    },
  });
}

/** Firma + Owner + JWT in einem Schritt. */
export async function createActor(companyOverrides: Parameters<typeof createCompany>[0] = {}) {
  const company = await createCompany(companyOverrides);
  const user = await createUser({ companyId: company.id });
  const token = await signToken(user);
  return { company, user, token };
}

export async function createAdmin() {
  const user = await createUser({ role: 'ADMIN', companyId: null });
  const token = await signToken(user);
  return { user, token };
}

export async function signToken(user: User): Promise<string> {
  const app = await getApp();
  return app.jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId });
}

export async function createCategory(overrides: Partial<{
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
}> = {}): Promise<Category> {
  const n = next();
  return prisma.category.create({
    data: {
      name: overrides.name ?? `Kategorie ${n}`,
      slug: overrides.slug ?? `kategorie-${n}`,
      parentId: overrides.parentId ?? null,
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createListing(overrides: Partial<{
  companyId: string;
  createdById: string;
  categoryId: string;
  title: string;
  description: string;
  priceCents: number | null;
  status: ListingStatus;
  condition: 'NEW' | 'LIKE_NEW' | 'USED' | 'DEFECT' | null;
  zip: string;
  publishedAt: Date;
}> = {}): Promise<Listing> {
  const n = next();
  let companyId = overrides.companyId;
  let createdById = overrides.createdById;
  if (!companyId || !createdById) {
    const actor = await createActor();
    companyId = companyId ?? actor.company.id;
    createdById = createdById ?? actor.user.id;
  }
  const categoryId = overrides.categoryId ?? (await createCategory()).id;
  return prisma.listing.create({
    data: {
      companyId,
      createdById,
      categoryId,
      title: overrides.title ?? `Testinserat ${n} Maschine`,
      description: overrides.description ?? `Beschreibung für Testinserat ${n}, guter Zustand.`,
      priceCents: overrides.priceCents === undefined ? 100000 : overrides.priceCents,
      priceType: 'NEGOTIABLE',
      condition: overrides.condition ?? 'USED',
      zip: overrides.zip ?? '44145',
      city: 'Dortmund',
      status: overrides.status ?? 'ACTIVE',
      publishedAt: overrides.publishedAt ?? new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    },
  });
}
