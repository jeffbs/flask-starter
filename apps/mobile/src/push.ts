import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Push-Registrierung — bewusst erst nach Login und bei Relevanz aufrufen
 * (APP-8), nie beim Kaltstart. Fehler sind nie fatal.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Benachrichtigungen',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api('/api/push/tokens', {
      method: 'POST',
      body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    });
  } catch (err) {
    console.warn('Push-Registrierung fehlgeschlagen:', err);
  }
}
