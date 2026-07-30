import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1).default('dev-secret-change-me'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
});

export const config = EnvSchema.parse(process.env);

/** Ablageort für hochgeladene Dateien (Bilder, KYB-Dokumente). */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

/** Laufzeit neuer Inserate in Tagen. */
export const LISTING_TTL_DAYS = 60;
