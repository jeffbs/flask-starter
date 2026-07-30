import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const tokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android']).optional(),
});

export default async function pushRoutes(app: FastifyInstance) {
  // Expo-Push-Token registrieren
  app.post('/tokens', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = tokenSchema.parse(req.body);
    await prisma.pushToken.upsert({
      where: { token: body.token },
      create: { token: body.token, platform: body.platform, userId: req.user.sub },
      update: { userId: req.user.sub, platform: body.platform },
    });
    return reply.code(201).send({ ok: true });
  });

  // Token abmelden (Logout)
  app.delete('/tokens', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = tokenSchema.parse(req.body);
    await prisma.pushToken.deleteMany({ where: { token: body.token, userId: req.user.sub } });
    return reply.code(204).send();
  });
}
