import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { api, ApiError, uploadFile } from '../src/api';
import { useAuth } from '../src/auth';
import { radius, spacing, touch, type, useColors } from '../src/theme';
import { Button, Card, FormField, SectionHeader } from '../src/components/ui';
import { KybStatusView } from '../src/components/KybStatusView';

const DOC_TYPES = [
  { value: 'TRADE_REGISTER', label: 'Handelsregisterauszug' },
  { value: 'VAT_CERTIFICATE', label: 'USt-Bescheinigung' },
  { value: 'BUSINESS_LICENSE', label: 'Gewerbeanmeldung' },
  { value: 'OTHER', label: 'Sonstiger Nachweis' },
] as const;

interface PendingDoc {
  uri: string;
  name: string;
  mime: string;
  docType: (typeof DOC_TYPES)[number]['value'];
}

/** KYB-Einreichung (Brief §6.8, KYB-2). */
export default function KybScreen() {
  const c = useColors();
  const router = useRouter();
  const { company, refresh } = useAuth();
  const status = company?.status ?? 'UNVERIFIED';

  // Nur UNVERIFIED/REJECTED reichen ein — sonst Status anzeigen
  if (status !== 'UNVERIFIED' && status !== 'REJECTED') {
    return <KybStatusView />;
  }
  return <KybForm onSubmitted={async () => { await refresh(); router.back(); }} />;
}

function KybForm({ onSubmitted }: { onSubmitted: () => Promise<void> }) {
  const c = useColors();
  const { company } = useAuth();
  const [vatId, setVatId] = useState(company?.vatId ?? '');
  const [regNumber, setRegNumber] = useState(company?.registrationNumber ?? '');
  const [regCourt, setRegCourt] = useState(company?.registrationCourt ?? '');
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addDocument(docType: PendingDoc['docType']) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    setDocs((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: `nachweis-${prev.length + 1}.${ext}`,
        mime: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        docType,
      },
    ]);
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const uploaded = [] as Array<{ type: string; fileUrl: string; fileName: string }>;
      for (const doc of docs) {
        const res = await uploadFile({ uri: doc.uri, name: doc.name, type: doc.mime });
        uploaded.push({ type: doc.docType, fileUrl: res.url, fileName: doc.name });
      }
      await api('/api/companies/mine/kyb', {
        method: 'POST',
        body: {
          vatId: vatId.trim(),
          registrationNumber: regNumber.trim() || undefined,
          registrationCourt: regCourt.trim() || undefined,
          documents: uploaded,
        },
      });
      Alert.alert(
        'Eingereicht',
        'Ihre Verifizierung wird jetzt manuell geprüft. Sie erhalten eine Benachrichtigung.',
      );
      await onSubmitted();
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) {
        setError(err.issues.map((i) => i.message).join(' '));
      } else {
        setError(err instanceof Error ? err.message : 'Einreichen fehlgeschlagen.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.l, gap: spacing.m }} keyboardShouldPersistTaps="handled">
        <Text style={[type.body, { color: c.muted }]}>
          Ihre Angaben werden manuell von unserem Team geprüft. Pflicht: USt-IdNr. und mindestens ein
          Nachweisdokument.
        </Text>
        <FormField
          label="USt-IdNr. *"
          value={vatId}
          onChangeText={setVatId}
          autoCapitalize="characters"
          placeholder="DE123456789"
          hint="Umsatzsteuer-Identifikationsnummer Ihrer Firma"
        />
        <FormField
          label="Handelsregisternummer"
          value={regNumber}
          onChangeText={setRegNumber}
          placeholder="HRB 12345"
        />
        <FormField
          label="Registergericht"
          value={regCourt}
          onChangeText={setRegCourt}
          placeholder="Amtsgericht Dortmund"
        />

        <SectionHeader title="Nachweisdokumente *" />
        {docs.map((doc, i) => (
          <Card key={`${doc.uri}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
            <Ionicons name="document-attach-outline" size={22} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: c.text }]}>
                {DOC_TYPES.find((d) => d.value === doc.docType)?.label}
              </Text>
              <Text style={[type.caption, { color: c.muted }]}>{doc.name}</Text>
            </View>
            <Pressable onPress={() => setDocs(docs.filter((d) => d !== doc))} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={c.danger} />
            </Pressable>
          </Card>
        ))}
        <View style={{ gap: spacing.s }}>
          {DOC_TYPES.map((docType) => (
            <Pressable
              key={docType.value}
              onPress={() => void addDocument(docType.value)}
              style={[styles.addDoc, { borderColor: c.border, backgroundColor: c.card }]}
            >
              <Ionicons name="add" size={20} color={c.accent} />
              <Text style={[type.body, { color: c.accent }]}>{docType.label} hochladen</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={[type.body, { color: c.danger }]}>{error}</Text> : null}
        <Button
          title="Zur Prüfung einreichen"
          onPress={onSubmit}
          loading={busy}
          disabled={vatId.trim().length < 4 || docs.length === 0}
          style={{ marginBottom: spacing.xxl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addDoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.m,
    padding: spacing.m,
    minHeight: touch.minSize,
  },
});
