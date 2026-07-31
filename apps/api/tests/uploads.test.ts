import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeApp, getApp, truncateAll } from './helpers/testapp.js';
import { createActor } from './helpers/factories.js';

beforeEach(truncateAll);
afterAll(closeApp);

const BOUNDARY = '----vitestformboundary';

function multipartBody(fileName: string, contentType: string, content: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
}

// Minimales gültiges 1x1-PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('POST /api/uploads (NFA-4)', () => {
  it('NFA-4: lädt ein PNG hoch und liefert eine abrufbare URL', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload: multipartBody('foto.png', 'image/png', PNG),
    });
    expect(res.statusCode).toBe(201);
    const { url, fileName } = res.json();
    expect(fileName).toBe('foto.png');
    // Zufälliger Dateiname, keine Original-Namen im Pfad (NFA-4)
    expect(url).not.toContain('foto');
    expect(url).toMatch(/\/uploads\/[0-9a-f-]{36}\.png$/);

    // Datei ist über den Static-Handler abrufbar
    const path = new URL(url).pathname;
    const served = await app.inject({ method: 'GET', url: path });
    expect(served.statusCode).toBe(200);
    expect(served.rawPayload.equals(PNG)).toBe(true);
  });

  it('NFA-4: lehnt nicht erlaubte Dateitypen ab (400)', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload: multipartBody('schadcode.exe', 'application/octet-stream', Buffer.from('MZ')),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/nicht erlaubt/);
  });

  it('NFA-4: ohne Datei → 400; ohne Auth → 401 (AUTH-7)', async () => {
    const app = await getApp();
    const { token } = await createActor();
    const empty = await app.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload: Buffer.from(`--${BOUNDARY}--\r\n`),
    });
    expect(empty.statusCode).toBe(400);
    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
      payload: multipartBody('foto.png', 'image/png', PNG),
    });
    expect(unauthorized.statusCode).toBe(401);
  });
});
