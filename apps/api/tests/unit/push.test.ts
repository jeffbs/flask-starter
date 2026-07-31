import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn(async () => [{ status: 'ok' }]));

vi.mock('expo-server-sdk', () => {
  class FakeExpo {
    static isExpoPushToken(token: string) {
      return token.startsWith('ExponentPushToken');
    }
    chunkPushNotifications(messages: unknown[]) {
      // zwei Chunks erzwingen, um die Schleife abzudecken
      const mid = Math.ceil(messages.length / 2);
      return messages.length > 1 ? [messages.slice(0, mid), messages.slice(mid)] : [messages];
    }
    sendPushNotificationsAsync = sendMock;
  }
  return { Expo: FakeExpo };
});

vi.mock('../../src/db.js', () => ({
  prisma: {
    pushToken: {
      findMany: vi.fn(async ({ where }: { where: { userId: { in: string[] } } }) =>
        where.userId.in.flatMap((userId) =>
          userId === 'user-mit-tokens'
            ? [
                { token: 'ExponentPushToken[a]', userId },
                { token: 'ExponentPushToken[b]', userId },
                { token: 'kein-expo-token', userId },
              ]
            : [],
        ),
      ),
    },
  },
}));

import { sendPushToUsers } from '../../src/lib/push.js';

beforeEach(() => sendMock.mockClear());

describe('sendPushToUsers (PUSH-2/PUSH-3)', () => {
  it('PUSH-2: sendet an alle gültigen Expo-Tokens, gechunkt', async () => {
    await sendPushToUsers(['user-mit-tokens'], 'Titel', 'Text', { conversationId: 'c1' });
    // 2 gültige Tokens → 2 Chunks à 1 Nachricht
    expect(sendMock).toHaveBeenCalledTimes(2);
    const sent = sendMock.mock.calls.flatMap((c) => (c as unknown[])[0] as unknown[]);
    expect(sent).toHaveLength(2);
  });

  it('PUSH-3: leere Empfängerliste → kein Versand', async () => {
    await sendPushToUsers([], 'Titel', 'Text');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('PUSH-3: Nutzer ohne gültige Tokens → kein Versand', async () => {
    await sendPushToUsers(['user-ohne-tokens'], 'Titel', 'Text');
    expect(sendMock).not.toHaveBeenCalled();
  });
});
