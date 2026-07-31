import { describe, expect, it, vi } from 'vitest';
import { addSocket, isOnline, removeSocket, sendToUsers } from '../../src/lib/ws.js';
import type { WebSocket } from 'ws';

function fakeSocket(open = true): WebSocket {
  return {
    OPEN: 1,
    readyState: open ? 1 : 3,
    send: vi.fn(),
  } as unknown as WebSocket;
}

describe('WS-Registry (CHAT-7)', () => {
  it('registriert mehrere Sockets pro Nutzer und räumt vollständig auf', () => {
    const a = fakeSocket();
    const b = fakeSocket();
    addSocket('user-1', a);
    addSocket('user-1', b);
    expect(isOnline('user-1')).toBe(true);
    removeSocket('user-1', a);
    expect(isOnline('user-1')).toBe(true);
    removeSocket('user-1', b);
    expect(isOnline('user-1')).toBe(false);
  });

  it('removeSocket für unbekannte Nutzer ist ein No-Op', () => {
    expect(() => removeSocket('unbekannt', fakeSocket())).not.toThrow();
  });

  it('sendToUsers sendet nur an offene Sockets und überspringt Offline-Nutzer', () => {
    const open = fakeSocket(true);
    const closed = fakeSocket(false);
    addSocket('user-2', open);
    addSocket('user-2', closed);
    sendToUsers(['user-2', 'user-offline'], { type: 'test', payload: { x: 1 } });
    expect(open.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test', payload: { x: 1 } }));
    expect(closed.send).not.toHaveBeenCalled();
    removeSocket('user-2', open);
    removeSocket('user-2', closed);
  });
});
