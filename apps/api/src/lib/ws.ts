import type { WebSocket } from 'ws';

/**
 * In-Memory-Registry der offenen WebSocket-Verbindungen je Nutzer.
 * Bei horizontaler Skalierung durch Redis-PubSub ersetzen (siehe FEATURES.md).
 */
const sockets = new Map<string, Set<WebSocket>>();

export function addSocket(userId: string, ws: WebSocket): void {
  let set = sockets.get(userId);
  if (!set) {
    set = new Set();
    sockets.set(userId, set);
  }
  set.add(ws);
}

export function removeSocket(userId: string, ws: WebSocket): void {
  const set = sockets.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) sockets.delete(userId);
}

export function isOnline(userId: string): boolean {
  return sockets.has(userId);
}

export function sendToUsers(userIds: string[], event: { type: string; payload: unknown }): void {
  const raw = JSON.stringify(event);
  for (const userId of userIds) {
    const set = sockets.get(userId);
    if (!set) continue;
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) ws.send(raw);
    }
  }
}
