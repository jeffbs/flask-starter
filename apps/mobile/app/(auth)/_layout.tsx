import { Stack } from 'expo-router';
import { useColors } from '../../src/theme';

export default function AuthLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Anmelden', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Firmenkonto erstellen' }} />
    </Stack>
  );
}
