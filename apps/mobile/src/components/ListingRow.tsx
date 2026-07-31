import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { radius, spacing, type, useColors } from '../theme';
import { formatPrice, formatRelative } from '../format';
import type { ListingRowData } from '../types';
import { StatusChip } from './ui';

/**
 * Die Standard-Inseratszeile (Brief §6.2): Thumbnail links, Titel 2-zeilig,
 * Preis fett + netto-Kennzeichen, Ort, Zeit — überall wiederverwendet.
 */
export function ListingRow({
  listing,
  showStatus = false,
  onPress,
}: {
  listing: ListingRowData;
  showStatus?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  const router = useRouter();
  const price = formatPrice(listing.priceCents, listing.priceType, listing.isNetPrice);
  const thumb = listing.images[0]?.url;
  const inactive = listing.status !== 'ACTIVE';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (() => router.push(`/listing/${listing.id}`))}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.thumbWrap, { backgroundColor: c.skeleton }]}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={28} color={c.muted} style={{ alignSelf: 'center' }} />
        )}
      </View>
      <View style={{ flex: 1, gap: 3, opacity: showStatus && inactive ? 0.6 : 1 }}>
        <Text numberOfLines={2} style={[type.body, { color: c.text, fontWeight: '500' }]}>
          {listing.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.s }}>
          <Text style={[type.price, { color: c.text }]}>{price.main}</Text>
          {price.suffix ? <Text style={[type.caption, { color: c.muted }]}>{price.suffix}</Text> : null}
        </View>
        {listing.quantity > 1 ? (
          <Text style={[type.caption, { color: c.muted }]}>
            {listing.quantity} {listing.unit ?? 'Stück'}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={[type.caption, { color: c.muted }]} numberOfLines={1}>
            {listing.zip} {listing.city}
            {listing.publishedAt ? ` · ${formatRelative(listing.publishedAt)}` : ''}
          </Text>
          {showStatus ? <StatusChip kind="listing" value={listing.status} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.m,
    padding: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.s,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  thumb: { width: '100%', height: '100%' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
});
