import type { FastifyInstance } from 'fastify';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { config, UPLOAD_DIR } from '../config.js';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * Datei-Upload auf lokale Platte (Dev). Für Produktion auf S3-kompatiblen
 * Object-Storage umstellen — nur diese Datei betroffen (siehe FEATURES.md).
 */
export default async function uploadRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const file = await req.file({ limits: { fileSize: MAX_FILE_SIZE } });
    if (!file) return reply.code(400).send({ error: 'Keine Datei übermittelt.' });

    const ext = path.extname(file.filename ?? '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return reply.code(400).send({ error: `Dateityp ${ext || '(unbekannt)'} ist nicht erlaubt.` });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${crypto.randomUUID()}${ext}`;
    await pipeline(file.file, createWriteStream(path.join(UPLOAD_DIR, name)));

    if (file.file.truncated) {
      return reply.code(413).send({ error: 'Datei ist zu groß (max. 15 MB).' });
    }

    return reply.code(201).send({
      url: `${config.PUBLIC_BASE_URL}/uploads/${name}`,
      fileName: file.filename,
    });
  });
}
