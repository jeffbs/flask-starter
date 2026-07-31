import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth';
import { spacing, type, useColors } from '../../src/theme';
import { Button, FormField } from '../../src/components/ui';
import { ApiError } from '../../src/api';

/** Registrierung in zwei Schritten (Brief §6.1): 1/2 Firma → 2/2 Zugang. */
export default function RegisterScreen() {
  const { register } = useAuth();
  const c = useColors();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [company, setCompany] = useState({ name: '', legalForm: '', street: '', zip: '', city: '' });
  const [account, setAccount] = useState({ firstName: '', lastName: '', email: '', password: '' });

  const companyValid = company.name.trim().length >= 2;
  const accountValid =
    account.firstName.trim() &&
    account.lastName.trim() &&
    /\S+@\S+\.\S+/.test(account.email) &&
    account.password.length >= 8;

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await register({
        company: {
          name: company.name.trim(),
          legalForm: company.legalForm.trim() || undefined,
          street: company.street.trim() || undefined,
          zip: company.zip.trim() || undefined,
          city: company.city.trim() || undefined,
        },
        user: {
          email: account.email.trim(),
          password: account.password,
          firstName: account.firstName.trim(),
          lastName: account.lastName.trim(),
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setFieldErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
      }
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.');
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
        <Text style={[type.label, { color: c.accent }]}>
          Schritt {step}/2 · {step === 1 ? 'Ihre Firma' : 'Ihr Zugang'}
        </Text>
        {step === 1 ? (
          <View style={{ gap: spacing.m }}>
            <FormField
              label="Firmenname *"
              value={company.name}
              onChangeText={(v) => setCompany({ ...company, name: v })}
              placeholder="Mustermann Maschinenbau"
              error={fieldErrors['company.name']}
            />
            <FormField
              label="Rechtsform"
              value={company.legalForm}
              onChangeText={(v) => setCompany({ ...company, legalForm: v })}
              placeholder="GmbH, UG, e.K. …"
            />
            <FormField
              label="Straße und Hausnummer"
              value={company.street}
              onChangeText={(v) => setCompany({ ...company, street: v })}
              placeholder="Industriestraße 12"
            />
            <View style={{ flexDirection: 'row', gap: spacing.m }}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="PLZ"
                  value={company.zip}
                  onChangeText={(v) => setCompany({ ...company, zip: v })}
                  keyboardType="number-pad"
                  placeholder="44145"
                />
              </View>
              <View style={{ flex: 2 }}>
                <FormField
                  label="Ort"
                  value={company.city}
                  onChangeText={(v) => setCompany({ ...company, city: v })}
                  placeholder="Dortmund"
                />
              </View>
            </View>
            <Button title="Weiter" onPress={() => setStep(2)} disabled={!companyValid} />
          </View>
        ) : (
          <View style={{ gap: spacing.m }}>
            <View style={{ flexDirection: 'row', gap: spacing.m }}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Vorname *"
                  value={account.firstName}
                  onChangeText={(v) => setAccount({ ...account, firstName: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Nachname *"
                  value={account.lastName}
                  onChangeText={(v) => setAccount({ ...account, lastName: v })}
                />
              </View>
            </View>
            <FormField
              label="Geschäftliche E-Mail *"
              value={account.email}
              onChangeText={(v) => setAccount({ ...account, email: v })}
              autoCapitalize="none"
              keyboardType="email-address"
              error={fieldErrors['user.email']}
            />
            <FormField
              label="Passwort *"
              value={account.password}
              onChangeText={(v) => setAccount({ ...account, password: v })}
              secureTextEntry
              hint="Mindestens 8 Zeichen"
              error={fieldErrors['user.password'] ?? error}
            />
            <Button title="Firmenkonto erstellen" onPress={onSubmit} loading={busy} disabled={!accountValid} />
            <Button title="Zurück" variant="ghost" onPress={() => setStep(1)} />
            <Text style={[type.caption, { color: c.muted, textAlign: 'center' }]}>
              Nach der Registrierung können Sie sofort stöbern. Inserieren und Anfragen sind nach der
              Firmen-Verifizierung möglich.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.l },
});
