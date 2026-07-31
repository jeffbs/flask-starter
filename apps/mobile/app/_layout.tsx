import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../src/auth';
import { useColors } from '../src/theme';

function RootNavigator() {
  const { ready, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const c = useColors();

  // Auth-Weiche (APP-1): ohne Konto nur Auth-Screens
  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) router.replace('/(auth)/login');
    if (user && inAuthGroup) router.replace('/(tabs)');
  }, [ready, user, segments, router]);

  // Push-Tap öffnet die betreffende Unterhaltung (APP-8)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const conversationId = response.notification.request.content.data?.conversationId;
      if (typeof conversationId === 'string') router.push(`/chat/${conversationId}`);
    });
    return () => sub.remove();
  }, [router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="listing/[id]" options={{ title: 'Inserat' }} />
      <Stack.Screen name="chat/[id]" options={{ title: 'Nachrichten' }} />
      <Stack.Screen name="company/[id]" options={{ title: 'Firmenprofil' }} />
      <Stack.Screen name="kyb" options={{ title: 'Verifizierung' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </AuthProvider>
  );
}
