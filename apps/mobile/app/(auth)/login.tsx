import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { spacing, type, useColors } from '../../src/theme';
import { Button, FormField } from '../../src/components/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.logo, { backgroundColor: c.accent }]}>
          <Ionicons name="business" size={30} color={c.onAccent} />
        </View>
        <Text style={[type.title, { color: c.text, textAlign: 'center' }]}>B2BMarkt</Text>
        <Text style={[type.body, { color: c.muted, textAlign: 'center' }]}>
          Der Marktplatz für geprüfte Firmen
        </Text>
        <View style={{ height: spacing.l }} />
        <FormField
          label="Geschäftliche E-Mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="einkauf@firma.de"
        />
        <FormField
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          error={error}
        />
        <Button title="Anmelden" onPress={onSubmit} loading={busy} disabled={!email || !password} />
        <View style={styles.footer}>
          <Text style={[type.body, { color: c.muted }]}>Neu hier?</Text>
          <Link href="/(auth)/register" style={[type.body, { color: c.accent, fontWeight: '600' }]}>
            Firmenkonto erstellen
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.m },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  footer: { flexDirection: 'row', gap: spacing.s, justifyContent: 'center', marginTop: spacing.l },
});
