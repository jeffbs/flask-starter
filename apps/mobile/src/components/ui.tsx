import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, touch, type, useColors } from '../theme';
import { LISTING_STATUS_LABELS, OFFER_STATUS_LABELS } from '../format';

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const background =
    variant === 'primary' ? c.accent : variant === 'danger' ? c.danger : variant === 'secondary' ? c.accentSoft : 'transparent';
  const color =
    variant === 'primary' || variant === 'danger' ? c.onAccent : variant === 'secondary' ? c.accent : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[type.heading, { color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Badges & Chips
// ---------------------------------------------------------------------------

/** Geprüft-Siegel am Firmennamen — Produktwahrheit, überall gleich (Brief §2). */
export function VerifiedBadge({ verified, size = 'small' }: { verified: boolean; size?: 'small' | 'large' }) {
  const c = useColors();
  if (!verified) return null;
  const iconSize = size === 'large' ? 18 : 14;
  return (
    <View style={[styles.verified, { backgroundColor: c.accentSoft }]}>
      <Ionicons name="shield-checkmark" size={iconSize} color={c.accent} />
      <Text style={[type.caption, { color: c.accent, fontWeight: '600' }]}>Geprüfte Firma</Text>
    </View>
  );
}

export function StatusChip({
  kind,
  value,
}: {
  kind: 'listing' | 'offer';
  value: string;
}) {
  const c = useColors();
  const label = (kind === 'listing' ? LISTING_STATUS_LABELS : OFFER_STATUS_LABELS)[value] ?? value;
  const colors: Record<string, { bg: string; fg: string }> = {
    ACTIVE: { bg: c.accentSoft, fg: c.accent },
    ACCEPTED: { bg: c.accentSoft, fg: c.accent },
    PENDING: { bg: c.warningSoft, fg: c.warning },
    PAUSED: { bg: c.warningSoft, fg: c.warning },
    SOLD: { bg: c.infoSoft, fg: c.info },
    EXPIRED: { bg: c.infoSoft, fg: c.info },
    DECLINED: { bg: c.dangerSoft, fg: c.danger },
    REMOVED: { bg: c.dangerSoft, fg: c.danger },
    WITHDRAWN: { bg: c.skeleton, fg: c.muted },
    DRAFT: { bg: c.skeleton, fg: c.muted },
  };
  const { bg, fg } = colors[value] ?? { bg: c.skeleton, fg: c.muted };
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[type.caption, { color: fg, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Formulare
// ---------------------------------------------------------------------------

export function FormField({
  label,
  error,
  hint,
  ...inputProps
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[type.label, { color: c.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        {...inputProps}
        style={[
          styles.input,
          {
            backgroundColor: c.inputBackground,
            borderColor: error ? c.danger : c.border,
            color: c.text,
          },
          inputProps.multiline ? { minHeight: 96, textAlignVertical: 'top' } : null,
          inputProps.style,
        ]}
      />
      {error ? (
        <Text style={[type.caption, { color: c.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[type.caption, { color: c.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Zustände (Laden / Leer / Fehler) — jeder Screen definiert sie (Brief §7)
// ---------------------------------------------------------------------------

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionTitle,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={c.muted} />
      <Text style={[type.heading, { color: c.text, textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text style={[type.body, { color: c.muted, textAlign: 'center' }]}>{message}</Text>
      ) : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Etwas ist schiefgelaufen"
      message={message ?? 'Bitte überprüfen Sie Ihre Verbindung.'}
      actionTitle="Erneut versuchen"
      onAction={onRetry}
    />
  );
}

export function SkeletonRow() {
  const c = useColors();
  return (
    <View style={[styles.skeletonRow, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.skeletonThumb, { backgroundColor: c.skeleton }]} />
      <View style={{ flex: 1, gap: spacing.s }}>
        <View style={[styles.skeletonLine, { backgroundColor: c.skeleton, width: '80%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: c.skeleton, width: '40%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: c.skeleton, width: '55%' }]} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Layout-Bausteine
// ---------------------------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function SectionHeader({ title }: { title: string }) {
  const c = useColors();
  return <Text style={[type.heading, { color: c.text, marginTop: spacing.l, marginBottom: spacing.s }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.minSize,
    borderRadius: radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
    flexDirection: 'row',
    gap: spacing.s,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  chip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    fontSize: type.body.fontSize,
    minHeight: touch.minSize,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
    padding: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    borderRadius: radius.m,
    borderWidth: 1,
    padding: spacing.l,
    gap: spacing.s,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.m,
    padding: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1,
  },
  skeletonThumb: { width: 96, height: 96, borderRadius: radius.s },
  skeletonLine: { height: 14, borderRadius: 7 },
});
