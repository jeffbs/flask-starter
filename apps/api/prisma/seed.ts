import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES: Array<{ name: string; slug: string; children?: Array<{ name: string; slug: string }> }> = [
  {
    name: 'Maschinen & Werkzeuge',
    slug: 'maschinen-werkzeuge',
    children: [
      { name: 'Baumaschinen', slug: 'baumaschinen' },
      { name: 'Metallbearbeitung', slug: 'metallbearbeitung' },
      { name: 'Holzbearbeitung', slug: 'holzbearbeitung' },
      { name: 'Werkzeuge', slug: 'werkzeuge' },
    ],
  },
  {
    name: 'Fahrzeuge & Nutzfahrzeuge',
    slug: 'fahrzeuge',
    children: [
      { name: 'Transporter', slug: 'transporter' },
      { name: 'LKW', slug: 'lkw' },
      { name: 'Stapler & Flurförderzeuge', slug: 'stapler' },
      { name: 'Anhänger', slug: 'anhaenger' },
    ],
  },
  {
    name: 'IT & Elektronik',
    slug: 'it-elektronik',
    children: [
      { name: 'Computer & Server', slug: 'computer-server' },
      { name: 'Netzwerktechnik', slug: 'netzwerktechnik' },
      { name: 'Bürogeräte', slug: 'buerogeraete' },
    ],
  },
  {
    name: 'Lager & Logistik',
    slug: 'lager-logistik',
    children: [
      { name: 'Regalsysteme', slug: 'regalsysteme' },
      { name: 'Verpackung', slug: 'verpackung' },
      { name: 'Paletten & Behälter', slug: 'paletten' },
    ],
  },
  {
    name: 'Gastronomie & Hotellerie',
    slug: 'gastro',
    children: [
      { name: 'Küchentechnik', slug: 'kuechentechnik' },
      { name: 'Einrichtung', slug: 'gastro-einrichtung' },
    ],
  },
  { name: 'Büromöbel & Einrichtung', slug: 'bueromoebel' },
  { name: 'Rohstoffe & Material', slug: 'rohstoffe' },
  { name: 'Restposten & Sonderposten', slug: 'restposten' },
  { name: 'Gewerbeimmobilien', slug: 'gewerbeimmobilien' },
  { name: 'Dienstleistungen', slug: 'dienstleistungen' },
];

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  // Admin für das Backoffice
  await prisma.user.upsert({
    where: { email: 'admin@b2bmarkt.dev' },
    create: {
      email: 'admin@b2bmarkt.dev',
      passwordHash,
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'ADMIN',
    },
    update: {},
  });

  // Kategoriebaum
  for (const [i, cat] of CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug, sortOrder: i },
      update: {},
    });
    for (const [j, child] of (cat.children ?? []).entries()) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        create: { name: child.name, slug: child.slug, parentId: parent.id, sortOrder: j },
        update: {},
      });
    }
  }

  // Demo-Firma 1: verifiziert, mit Inseraten
  const stahlbau = await prisma.company.upsert({
    where: { vatId: 'DE123456789' },
    create: {
      name: 'Stahlbau Müller GmbH',
      legalForm: 'GmbH',
      vatId: 'DE123456789',
      registrationNumber: 'HRB 12345',
      registrationCourt: 'Amtsgericht Dortmund',
      street: 'Industriestraße 12',
      zip: '44145',
      city: 'Dortmund',
      phone: '+49 231 555 0100',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
    update: {},
  });
  const mueller = await prisma.user.upsert({
    where: { email: 'einkauf@stahlbau-mueller.dev' },
    create: {
      email: 'einkauf@stahlbau-mueller.dev',
      passwordHash,
      firstName: 'Max',
      lastName: 'Müller',
      role: 'OWNER',
      companyId: stahlbau.id,
    },
    update: {},
  });

  // Demo-Firma 2: wartet auf KYB-Freigabe
  const gastro = await prisma.company.upsert({
    where: { vatId: 'DE987654321' },
    create: {
      name: 'Gastro Solutions UG',
      legalForm: 'UG (haftungsbeschränkt)',
      vatId: 'DE987654321',
      registrationNumber: 'HRB 98765',
      registrationCourt: 'Amtsgericht Hamburg',
      street: 'Hafenweg 3',
      zip: '20457',
      city: 'Hamburg',
      status: 'PENDING_REVIEW',
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { email: 'info@gastro-solutions.dev' },
    create: {
      email: 'info@gastro-solutions.dev',
      passwordHash,
      firstName: 'Gül',
      lastName: 'Yilmaz',
      role: 'OWNER',
      companyId: gastro.id,
    },
    update: {},
  });

  // Demo-Inserate für die verifizierte Firma
  const listingCount = await prisma.listing.count({ where: { companyId: stahlbau.id } });
  if (listingCount === 0) {
    const baumaschinen = await prisma.category.findUniqueOrThrow({ where: { slug: 'baumaschinen' } });
    const metall = await prisma.category.findUniqueOrThrow({ where: { slug: 'metallbearbeitung' } });
    const paletten = await prisma.category.findUniqueOrThrow({ where: { slug: 'paletten' } });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    await prisma.listing.createMany({
      data: [
        {
          companyId: stahlbau.id,
          createdById: mueller.id,
          categoryId: baumaschinen.id,
          title: 'Minibagger Kubota KX019-4, Bj. 2019, 1.850 Bh',
          description:
            'Gut gewarteter Minibagger aus erster Hand. Inkl. 3 Löffel und hydraulischem Schnellwechsler. Wartungsheft vorhanden, letzter Service 03/2026. Besichtigung nach Absprache in Dortmund.',
          priceCents: 2190000,
          priceType: 'NEGOTIABLE',
          condition: 'USED',
          zip: '44145',
          city: 'Dortmund',
          status: 'ACTIVE',
          publishedAt: now,
          expiresAt,
        },
        {
          companyId: stahlbau.id,
          createdById: mueller.id,
          categoryId: metall.id,
          title: 'Schweißgerät Fronius TPS 320i — Neuwertig',
          description:
            'MIG/MAG-Schweißgerät, nur 40 Betriebsstunden, inkl. Brenner und Massekabel. Originalverpackung vorhanden. Verkauf wegen Betriebsumstellung.',
          priceCents: 850000,
          priceType: 'FIXED',
          condition: 'LIKE_NEW',
          zip: '44145',
          city: 'Dortmund',
          status: 'ACTIVE',
          publishedAt: now,
          expiresAt,
        },
        {
          companyId: stahlbau.id,
          createdById: mueller.id,
          categoryId: paletten.id,
          title: 'Europaletten gebraucht, tauschfähig — 200 Stück',
          description:
            'EPAL-Europaletten, gebraucht, tauschfähig (Klasse B). Abholung ab Lager Dortmund, Verladung möglich. Preis pro Stück netto, Menge verhandelbar.',
          priceCents: 750,
          priceType: 'NEGOTIABLE',
          condition: 'USED',
          quantity: 200,
          unit: 'Stück',
          zip: '44145',
          city: 'Dortmund',
          status: 'ACTIVE',
          publishedAt: now,
          expiresAt,
        },
      ],
    });
  }

  console.log('Seed abgeschlossen.');
  console.log('  Backoffice-Login: admin@b2bmarkt.dev / demo1234');
  console.log('  App-Login (verifiziert): einkauf@stahlbau-mueller.dev / demo1234');
  console.log('  App-Login (KYB offen):   info@gastro-solutions.dev / demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
