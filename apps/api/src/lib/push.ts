import { Expo } from 'expo-server-sdk';
import { prisma } from '../db.js';

const expo = new Expo();

/**
 * Sendet eine Push-Benachrichtigung an alle registrierten Geräte der
 * angegebenen Nutzer. Fehler werden geloggt, aber nie nach außen geworfen —
 * Push ist Best-Effort.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } } });
    const messages = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({ to: t.token, sound: 'default' as const, title, body, data }));
    if (messages.length === 0) return;
    for (const chunk of expo.chunkPushNotifications(messages)) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error('Push-Versand fehlgeschlagen:', err);
  }
}
