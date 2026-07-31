import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../auth';
import { radius, spacing, type, useColors } from '../theme';
import { Button, Card } from './ui';

/**
 * Verifizierungsstatus mit Zeitleiste und nächster Aktion (Brief §6.7/6.8) —
 * „Ehrliche Zustände": Wartezeiten und Ablehnungsgründe werden klar benannt.
 */
export function KybStatusView({ embedded }: { embedded?: boolean }) {
  const c = useColors();
  const router = useRouter();
  const { company } = useAuth();
  const status = company?.status ?? 'UNVERIFIED';

  const steps = [
    { key: 'submitted', label: 'Unterlagen eingereicht' },
    { key: 'review', label: 'Manuelle Prüfung' },
    { key: 'done', label: 'Verifiziert' },
  ];
  const activeIndex = status === 'UNVERIFIED' ? -1 : status === 'PENDING_REVIEW' ? 1 : status === 'VERIFIED' ? 2 : 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: spacing.l, gap: spacing.l }}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.accentSoft }]}>
        <Ionicons name="shield-checkmark" size={30} color={c.accent} />
      </View>
      <Text style={[type.title, { color: c.text, textAlign: 'center' }]}>
        {status === 'UNVERIFIED' && 'Werden Sie eine geprüfte Firma'}
        {status === 'PENDING_REVIEW' && 'Prüfung läuft'}
        {status === 'REJECTED' && 'Verifizierung abgelehnt'}
        {status === 'SUSPENDED' && 'Konto gesperrt'}
        {status === 'VERIFIED' && 'Ihre Firma ist verifiziert'}
      </Text>
      <Text style={[type.body, { color: c.muted, textAlign: 'center' }]}>
        {status === 'UNVERIFIED' &&
          'Auf B2BMarkt handeln nur geprüfte Firmen. Reichen Sie USt-IdNr. und einen Firmennachweis ein — unser Team prüft manuell, meist innerhalb von 1–2 Werktagen.'}
        {status === 'PENDING_REVIEW' &&
          'Ihre Unterlagen liegen unserem Prüfteam vor. Sie erhalten eine Push-Benachrichtigung, sobald die Prüfung abgeschlossen ist.'}
        {status === 'REJECTED' && 'Ihre Einreichung wurde abgelehnt:'}
        {status === 'SUSPENDED' &&
          'Dieses Firmenkonto wurde von der Moderation gesperrt. Bei Fragen wenden Sie sich an den Support.'}
        {status === 'VERIFIED' && 'Sie können inserieren und Anbieter kontaktieren.'}
      </Text>

      {status === 'REJECTED' && company?.rejectionReason ? (
        <Card style={{ borderColor: c.danger, backgroundColor: c.dangerSoft }}>
          <Text style={[type.body, { color: c.danger }]}>{company.rejectionReason}</Text>
        </Card>
      ) : null}

      {status !== 'SUSPENDED' && status !== 'VERIFIED' ? (
        <Card>
          {steps.map((step, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex && status === 'PENDING_REVIEW';
            return (
              <View key={step.key} style={styles.stepRow}>
                <Ionicons
                  name={done ? 'checkmark-circle' : active ? 'time' : 'ellipse-outline'}
                  size={22}
                  color={done || active ? c.accent : c.muted}
                />
                <Text style={[type.body, { color: done || active ? c.text : c.muted }]}>{step.label}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {(status === 'UNVERIFIED' || status === 'REJECTED') && (
        <Button
          title={status === 'REJECTED' ? 'Erneut einreichen' : 'Verifizierung starten'}
          onPress={() => router.push('/kyb')}
        />
      )}
      {embedded && status === 'PENDING_REVIEW' ? (
        <Text style={[type.caption, { color: c.muted, textAlign: 'center' }]}>
          Sobald Ihre Firma verifiziert ist, können Sie hier inserieren.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.xl,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.s },
});
