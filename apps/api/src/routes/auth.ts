import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';

const registerSchema = z.object({
  company: z.object({
    name: z.string().min(2).max(200),
    legalForm: z.string().max(50).optional(),
    street: z.string().max(200).optional(),
    zip: z.string().max(10).optional(),
    city: z.string().max(100).optional(),
    country: z.string().length(2).default('DE'),
    phone: z.string().max(50).optional(),
    website: z.string().max(200).optional(),
  }),
  user: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(200),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateMeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  password: z.string().min(8).max(200).optional(),
});

function publicUser(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    companyId: u.companyId,
  };
}

export default async function authRoutes(app: FastifyInstance) {
  // Firmenkonto registrieren (Firma + Inhaber-Nutzer)
  app.post('/register', async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.user.email.toLowerCase() } });
    if (existing) {
      return reply.code(409).send({ error: 'Für diese E-Mail-Adresse existiert bereits ein Konto.' });
    }

    const company = await prisma.company.create({ data: body.company });
    const user = await prisma.user.create({
      data: {
        email: body.user.email.toLowerCase(),
        passwordHash: await hashPassword(body.user.password),
        firstName: body.user.firstName,
        lastName: body.user.lastName,
        role: 'OWNER',
        companyId: company.id,
      },
    });

    const token = app.jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId });
    return reply.code(201).send({ token, user: publicUser(user), company });
  });

  app.post('/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { company: true },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'E-Mail oder Passwort ist falsch.' });
    }
    if (!user.isActive) {
      return reply.code(403).send({ error: 'Dieses Konto wurde deaktiviert.' });
    }
    const token = app.jwt.sign({ sub: user.id, role: user.role, companyId: user.companyId });
    return { token, user: publicUser(user), company: user.company };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { company: true },
    });
    if (!user) return reply.code(404).send({ error: 'Nutzer nicht gefunden.' });
    return { user: publicUser(user), company: user.company };
  });

  app.patch('/me', { preHandler: [app.authenticate] }, async (req) => {
    const body = updateMeSchema.parse(req.body);
    const data: Record<string, unknown> = {};
    if (body.firstName) data.firstName = body.firstName;
    if (body.lastName) data.lastName = body.lastName;
    if (body.password) data.passwordHash = await hashPassword(body.password);
    const user = await prisma.user.update({ where: { id: req.user.sub }, data });
    return { user: publicUser(user) };
  });
}
