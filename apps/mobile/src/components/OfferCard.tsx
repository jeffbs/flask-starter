import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, type, useColors } from '../theme';
import { formatEuro } from '../format';
import type { Message } from '../types';
import { Button, StatusChip } from './ui';

/**
 * Preisvorschlag-Karte (Brief §6.6, Signatur-Moment): Betrag groß,
 * Status-Chip, Aktionen je nach Rolle und Zustand.
 */
export function OfferCard({
  message,
  isMine,
  onRespond,
  busy,
}: {
  message: Message;
  isMine: boolean;
  onRespond: (action: 'ACCEPT' | 'DECLINE' | 'WITHDRAW') => void;
  busy?: boolean;
}) {
  const c = useColors();
  const open = message.offerStatus === 'PENDING';

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[type.label, { color: c.muted }]}>
        {isMine ? 'Ihr Preisvorschlag' : 'Preisvorschlag'}
      </Text>
      <Text style={[styles.amount, { color: c.text }]}>
        {formatEuro(message.offerAmountCents ?? 0)}
      </Text>
      <StatusChip kind="offer" value={message.offerStatus ?? 'PENDING'} />
      {open && !isMine ? (
        <View style={styles.actions}>
          <Button title="Annehmen" onPress={() => onRespond('ACCEPT')} loading={busy} style={{ flex: 1 }} />
          <Button
            title="Ablehnen"
            variant="secondary"
            onPress={() => onRespond('DECLINE')}
            loading={busy}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
      {open && isMine ? (
        <Button title="Zurückziehen" variant="ghost" onPress={() => onRespond('WITHDRAW')} loading={busy} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.m,
    borderWidth: 1,
    padding: spacing.l,
    gap: spacing.s,
    maxWidth: '85%',
  },
  amount: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.xs },
});
