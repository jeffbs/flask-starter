import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, string>());

vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => store.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void store.set(k, v),
  deleteItemAsync: async (k: string) => void store.delete(k),
}));

import {
  api,
  ApiError,
  clearToken,
  getToken,
  loadToken,
  onUnauthorized,
  storeToken,
  uploadFile,
  wsUrl,
} from '../src/api';

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  store.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
  await clearToken();
  vi.unstubAllGlobals();
});

describe('Token-Verwaltung (APP-1)', () => {
  it('APP-1: Token wird in SecureStore persistiert und wieder geladen', async () => {
    await storeToken('mein-token');
    expect(getToken()).toBe('mein-token');
    expect(store.get('b2bmarkt_token')).toBe('mein-token');
    await clearToken();
    expect(getToken()).toBeNull();
    await storeToken('anderes');
    expect(await loadToken()).toBe('anderes');
  });
});

describe('api()', () => {
  it('sendet Authorization-Header und JSON-Body', async () => {
    await storeToken('t0ken');
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const result = await api<{ ok: boolean }>('/api/test', { method: 'POST', body: { a: 1 } });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/api/test');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer t0ken');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
  });

  it('GET ohne Body sendet keinen Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await api('/api/x');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('AUTH-7: 401 mit gespeichertem Token → Token gelöscht + Listener benachrichtigt', async () => {
    await storeToken('abgelaufen');
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Nicht angemeldet.' }));
    await expect(api('/api/auth/me')).rejects.toThrow('Nicht angemeldet.');
    expect(getToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    // Nach Unsubscribe keine weiteren Aufrufe
    await storeToken('nochmal');
    await expect(api('/api/auth/me')).rejects.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('NFA-1: ApiError transportiert Status, Code und Feld-Issues', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: 'Ungültige Eingabe.',
        code: 'COMPANY_NOT_VERIFIED',
        issues: [{ path: 'title', message: 'Zu kurz' }],
      }),
    );
    try {
      await api('/api/listings', { method: 'POST', body: {} });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe('COMPANY_NOT_VERIFIED');
      expect(apiErr.issues?.[0]?.path).toBe('title');
    }
  });

  it('Fehler ohne JSON-Body → generische Meldung mit Status', async () => {
    fetchMock.mockResolvedValue(new Response('kein json', { status: 502 }));
    await expect(api('/api/x')).rejects.toThrow('Fehler 502');
  });

  it('204 → undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api('/api/favorites/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('uploadFile()', () => {
  it('INS-4: sendet FormData mit Auth-Header und liefert URL', async () => {
    await storeToken('t');
    fetchMock.mockResolvedValue(jsonResponse(201, { url: 'http://x/uploads/a.jpg', fileName: 'foto.jpg' }));
    const result = await uploadFile({ uri: 'file:///tmp/a.jpg', name: 'foto.jpg', type: 'image/jpeg' });
    expect(result.url).toContain('/uploads/');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/api/uploads');
    expect(init.headers.Authorization).toBe('Bearer t');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('NFA-4: Fehlerantwort → ApiError mit Servermeldung', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'Dateityp nicht erlaubt.' }));
    await expect(
      uploadFile({ uri: 'file:///x.exe', name: 'x.exe', type: 'application/octet-stream' }),
    ).rejects.toThrow('Dateityp nicht erlaubt.');
  });

  it('Upload-Fehler ohne JSON → generische Meldung', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(
      uploadFile({ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }),
    ).rejects.toThrow('Upload fehlgeschlagen');
  });
});

describe('wsUrl()', () => {
  it('CHAT-7: leitet ws-URL mit Token aus der Basis-URL ab', async () => {
    await storeToken('ws-token');
    expect(wsUrl()).toMatch(/^ws:\/\/.+\/ws\?token=ws-token$/);
    await clearToken();
    expect(wsUrl()).toMatch(/token=$/);
  });
});
