import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { radius, spacing, type, useColors } from '../theme';
import type { CompanyStatus } from '../types';
import { Button } from './ui';

const COPY: Record<string, { title: string; message: string; cta: string | null }> = {
  UNVERIFIED: {
    title: 'Verifizierung erforderlich',
    message:
      'Auf B2BMarkt handeln nur geprüfte Firmen. Reichen Sie einmalig Ihre USt-IdNr. und einen Nachweis ein — die Prüfung erfolgt manuell durch unser Team.',
    cta: 'Verifizierung starten',
  },
  PENDING_REVIEW: {
    title: 'Ihre Verifizierung wird geprüft',
    message:
      'Ihre Unterlagen liegen unserem Prüfteam vor. Sie erhalten eine Benachrichtigung, sobald die Prüfung abgeschlossen ist.',
    cta: 'Status ansehen',
  },
  REJECTED: {
    title: 'Verifizierung abgelehnt',
    message: 'Ihre Einreichung wurde abgelehnt. Sie können sie mit korrigierten Angaben erneut einreichen.',
    cta: 'Erneut einreichen',
  },
  SUSPENDED: {
    title: 'Konto gesperrt',
    message: 'Dieses Firmenkonto wurde gesperrt. Bei Fragen wenden Sie sich an den Support.',
    cta: null,
  },
};

/**
 * KYB-Gate (Brief §6.8): erklärt Unverifizierten, warum eine Aktion gesperrt
 * ist — niemals kommentarloses Deaktivieren.
 */
export function KybGateSheet({
  status,
  visible,
  onClose,
}: {
  status: CompanyStatus;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useColors();
  const router = useRouter();
  const copy = COPY[status] ?? COPY.UNVERIFIED!;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen">
        <View />
      </Pressable>
      <View style={[styles.sheet, { backgroundColor: c.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="shield-checkmark" size={28} color={c.accent} />
        </View>
        <Text style={[type.title, { color: c.text, textAlign: 'center' }]}>{copy.title}</Text>
        <Text style={[type.body, { color: c.muted, textAlign: 'center' }]}>{copy.message}</Text>
        {copy.cta ? (
          <Button
            title={copy.cta}
            onPress={() => {
              onClose();
              router.push('/kyb');
            }}
          />
        ) : null}
        <Button title="Später" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.m,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
