import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../db.js';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  companyId: string | null;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: config.JWT_SECRET, sign: { expiresIn: '30d' } });

  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Nicht angemeldet.' });
    }
  });

  app.decorate('requireAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Nicht angemeldet.' });
    }
    if (req.user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Nur für Administratoren.' });
    }
  });
});

/**
 * Lädt die Firma des angemeldeten Nutzers und stellt sicher, dass sie
 * verifiziert ist — Voraussetzung fürs Inserieren und Kontaktieren (strenges KYB).
 * Gibt `null` zurück, wenn bereits eine Fehlerantwort gesendet wurde.
 */
export async function requireVerifiedCompany(req: FastifyRequest, reply: FastifyReply) {
  const companyId = req.user.companyId;
  if (!companyId) {
    await reply.code(403).send({ error: 'Kein Firmenkonto.' });
    return null;
  }
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    await reply.code(403).send({ error: 'Firma nicht gefunden.' });
    return null;
  }
  if (company.status !== 'VERIFIED') {
    await reply.code(403).send({
      error: 'Ihre Firma ist noch nicht verifiziert. Bitte schließen Sie die Verifizierung ab.',
      code: 'COMPANY_NOT_VERIFIED',
      companyStatus: company.status,
    });
    return null;
  }
  return company;
}
