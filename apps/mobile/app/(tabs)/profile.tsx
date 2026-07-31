import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useFetch } from '../../src/hooks';
import { registerForPush } from '../../src/push';
import { radius, spacing, touch, type, useColors } from '../../src/theme';
import type { ListingRowData } from '../../src/types';
import { ListingRow } from '../../src/components/ListingRow';
import { Button, Card, EmptyState, SectionHeader, VerifiedBadge } from '../../src/components/ui';

const STATUS_COPY: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  UNVERIFIED: { label: 'Nicht verifiziert', icon: 'alert-circle-outline' },
  PENDING_REVIEW: { label: 'Prüfung läuft', icon: 'time-outline' },
  VERIFIED: { label: 'Geprüfte Firma', icon: 'shield-checkmark' },
  REJECTED: { label: 'Verifizierung abgelehnt', icon: 'close-circle-outline' },
  SUSPENDED: { label: 'Konto gesperrt', icon: 'ban-outline' },
};

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();
  const { user, company, logout, refresh } = useAuth();
  const { data, reload } = useFetch<{ items: ListingRowData[] }>('/api/listings/mine');
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void refresh();
    }, [reload, refresh]),
  );

  async function changeStatus(listing: ListingRowData, status: 'ACTIVE' | 'PAUSED' | 'SOLD') {
    setBusyId(listing.id);
    try {
      await api(`/api/listings/${listing.id}`, { method: 'PATCH', body: { status } });
      await reload();
    } catch (err) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Aktion fehlgeschlagen.');
    } finally {
      setBusyId(null);
    }
  }

  function listingActions(listing: ListingRowData) {
    const options: Array<{ label: string; action: () => void; destructive?: boolean }> = [];
    if (listing.status === 'ACTIVE') {
      options.push({ label: 'Pausieren', action: () => void changeStatus(listing, 'PAUSED') });
      options.push({ label: 'Als verkauft markieren', action: () => void changeStatus(listing, 'SOLD') });
    }
    if (listing.status === 'PAUSED') {
      options.push({ label: 'Reaktivieren', action: () => void changeStatus(listing, 'ACTIVE') });
    }
    options.push({
      label: 'Löschen',
      destructive: true,
      action: () =>
        Alert.alert('Inserat löschen?', 'Das kann nicht rückgängig gemacht werden.', [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Löschen',
            style: 'destructive',
            onPress: async () => {
              await api(`/api/listings/${listing.id}`, { method: 'DELETE' });
              await reload();
            },
          },
        ]),
    });
    Alert.alert(listing.title, undefined, [
      ...options.map((o) => ({
        text: o.label,
        style: o.destructive ? ('destructive' as const) : undefined,
        onPress: o.action,
      })),
      { text: 'Abbrechen', style: 'cancel' as const },
    ]);
  }

  const status = company?.status ?? 'UNVERIFIED';
  const statusCopy = STATUS_COPY[status] ?? STATUS_COPY.UNVERIFIED!;

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ListingRow
          listing={item}
          showStatus
          onPress={() => (busyId ? undefined : listingActions(item))}
        />
      )}
      ListHeaderComponent={
        <View style={{ gap: spacing.m }}>
          {/* Firmen-Kopf (Brief §6.7) */}
          <Card>
            <Text style={[type.title, { color: c.text }]}>{company?.name ?? '—'}</Text>
            <Text style={[type.body, { color: c.muted }]}>
              {user?.firstName} {user?.lastName} · {user?.email}
            </Text>
            <VerifiedBadge verified={status === 'VERIFIED'} />
          </Card>

          {/* Verifizierungsstatus-Karte */}
          <Pressable onPress={() => router.push('/kyb')}>
            <Card style={status === 'VERIFIED' ? {} : { borderColor: c.warning }}>
              <View style={styles.statusRow}>
                <Ionicons
                  name={statusCopy.icon}
                  size={24}
                  color={status === 'VERIFIED' ? c.accent : status === 'SUSPENDED' || status === 'REJECTED' ? c.danger : c.warning}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: c.text }]}>{statusCopy.label}</Text>
                  {status !== 'VERIFIED' ? (
                    <Text style={[type.caption, { color: c.muted }]}>
                      {status === 'PENDING_REVIEW'
                        ? 'Wir prüfen Ihre Unterlagen.'
                        : status === 'REJECTED'
                          ? 'Tippen für Details und erneute Einreichung.'
                          : status === 'SUSPENDED'
                            ? 'Tippen für Details.'
                            : 'Jetzt verifizieren, um zu inserieren.'}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.muted} />
              </View>
            </Card>
          </Pressable>

          <MenuRow
            icon="notifications-outline"
            label="Push-Benachrichtigungen aktivieren"
            onPress={() => void registerForPush()}
          />
          <SectionHeader title="Meine Inserate" />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="pricetags-outline"
          title="Noch keine Inserate"
          message={
            status === 'VERIFIED'
              ? 'Stellen Sie Ihr erstes Inserat ein — kostenlos.'
              : 'Nach der Verifizierung können Sie hier inserieren.'
          }
          actionTitle={status === 'VERIFIED' ? 'Inserat einstellen' : undefined}
          onAction={status === 'VERIFIED' ? () => router.push('/(tabs)/post') : undefined}
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.m }} />}
      ListFooterComponent={
        <View style={{ gap: spacing.m, marginTop: spacing.xl }}>
          <Button title="Abmelden" variant="secondary" onPress={() => void logout()} />
          <Text style={[type.caption, { color: c.muted, textAlign: 'center' }]}>
            B2BMarkt 0.1.0 · Nur für Gewerbetreibende
          </Text>
        </View>
      }
    />
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color={c.text} />
      <Text style={[type.body, { color: c.text, flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1,
    minHeight: touch.minSize,
  },
});
