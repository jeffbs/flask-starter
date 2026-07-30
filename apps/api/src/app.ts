import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { ZodError } from 'zod';
import { mkdir } from 'node:fs/promises';
import { UPLOAD_DIR } from './config.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import categoryRoutes from './routes/categories.js';
import listingRoutes from './routes/listings.js';
import uploadRoutes from './routes/uploads.js';
import favoriteRoutes from './routes/favorites.js';
import conversationRoutes from './routes/conversations.js';
import reportRoutes from './routes/reports.js';
import pushRoutes from './routes/push.js';
import adminRoutes from './routes/admin.js';
import { addSocket, removeSocket } from './lib/ws.js';
import type { JwtPayload } from './plugins/auth.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(authPlugin);
  await app.register(multipart);
  await app.register(websocket);

  await mkdir(UPLOAD_DIR, { recursive: true });
  await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/' });

  // Einheitliche Validierungsfehler
  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: 'Ungültige Eingabe.',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req.log.error(err);
    const e = err as { statusCode?: number; message?: string };
    const statusCode = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? 'Interner Serverfehler.' : (e.message ?? 'Fehler'),
    });
  });

  app.get('/api/health', async () => ({ ok: true }));

  // WebSocket für Chat-Echtzeit: /ws?token=<JWT>
  app.get('/ws', { websocket: true }, (socket, req) => {
    const { token } = req.query as { token?: string };
    let payload: JwtPayload;
    try {
      payload = app.jwt.verify<JwtPayload>(token ?? '');
    } catch {
      socket.close(4401, 'Ungültiges Token');
      return;
    }
    addSocket(payload.sub, socket);
    socket.on('close', () => removeSocket(payload.sub, socket));
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(companyRoutes, { prefix: '/api/companies' });
  await app.register(categoryRoutes, { prefix: '/api/categories' });
  await app.register(listingRoutes, { prefix: '/api/listings' });
  await app.register(uploadRoutes, { prefix: '/api/uploads' });
  await app.register(favoriteRoutes, { prefix: '/api/favorites' });
  await app.register(conversationRoutes, { prefix: '/api/conversations' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
  await app.register(pushRoutes, { prefix: '/api/push' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
