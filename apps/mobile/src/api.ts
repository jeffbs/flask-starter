import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'b2bmarkt_token';

let currentToken: string | null = null;

export async function loadToken(): Promise<string | null> {
  currentToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return currentToken;
}

export async function storeToken(token: string): Promise<void> {
  currentToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  currentToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function getToken(): string | null {
  return currentToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener): () => void {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && currentToken) {
    await clearToken();
    unauthorizedListeners.forEach((fn) => fn());
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      issues?: Array<{ path: string; message: string }>;
    };
    throw new ApiError(res.status, data.error ?? `Fehler ${res.status}`, data.code, data.issues);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Datei-Upload (Bild/Dokument) → { url, fileName } */
export async function uploadFile(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<{ url: string; fileName: string }> {
  const form = new FormData();
  // React-Native-FormData akzeptiert {uri,name,type}
  form.append('file', file as unknown as Blob);
  const res = await fetch(`${BASE_URL}/api/uploads`, {
    method: 'POST',
    headers: { ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}) },
    body: form,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, data.error ?? 'Upload fehlgeschlagen');
  }
  return (await res.json()) as { url: string; fileName: string };
}

export function wsUrl(): string {
  return `${BASE_URL.replace(/^http/, 'ws')}/ws?token=${currentToken ?? ''}`;
}
