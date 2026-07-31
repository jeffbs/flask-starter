import { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useFetch } from '../../src/hooks';
import { radius, spacing, touch, type, useColors } from '../../src/theme';
import type { ListingDetail } from '../../src/types';
import {
  Button,
  Card,
  ErrorState,
  FormField,
  SectionHeader,
  StatusChip,
  VerifiedBadge,
} from '../../src/components/ui';
import { KybGateSheet } from '../../src/components/KybGateSheet';
import { CONDITION_LABELS, formatPrice, formatRelative } from '../../src/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DetailResponse {
  listing: ListingDetail;
  isOwner: boolean;
  isFavorite: boolean;
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const { company } = useAuth();
  const { data, loading, error, reload, setData } = useFetch<DetailResponse>(`/api/listings/${id}`);
  const [gateOpen, setGateOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: c.background }} />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? undefined} onRetry={reload} />;
  }
  const { listing, isOwner, isFavorite } = data;
  const price = formatPrice(listing.priceCents, listing.priceType, listing.isNetPrice);
  const verified = listing.company.status === 'VERIFIED';

  async function toggleFavorite() {
    if (!data) return;
    const next = !data.isFavorite;
    setData({ ...data, isFavorite: next });
    try {
      await api(`/api/favorites/${listing.id}`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setData({ ...data, isFavorite: !next });
    }
  }

  function requireVerified(action: () => void) {
    if (company?.status === 'VERIFIED') action();
    else setGateOpen(true);
  }

  async function startConversation(body?: string, offerAmountCents?: number) {
    try {
      const res = await api<{ conversation: { id: string } }>('/api/conversations', {
        method: 'POST',
        body: { listingId: listing.id, body, offerAmountCents },
      });
      router.push(`/chat/${res.conversation.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'COMPANY_NOT_VERIFIED') setGateOpen(true);
      else Alert.alert('Fehler', err instanceof Error ? err.message : 'Aktion fehlgeschlagen.');
    }
  }

  function report() {
    Alert.alert('Inserat melden', 'Warum möchten Sie dieses Inserat melden?', [
      ...['Verbotener Artikel', 'Betrugsverdacht', 'Falsche Kategorie', 'Sonstiges'].map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await api('/api/reports', {
              method: 'POST',
              body: { targetType: 'LISTING', targetId: listing.id, reason },
            });
            Alert.alert('Danke', 'Ihre Meldung wurde an die Moderation übermittelt.');
          } catch (err) {
            Alert.alert('Fehler', err instanceof Error ? err.message : 'Meldung fehlgeschlagen.');
          }
        },
      })),
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={toggleFavorite} hitSlop={12} accessibilityLabel="Merken">
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? c.danger : c.text}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Galerie (Brief §6.3) */}
        <View style={{ backgroundColor: c.skeleton }}>
          {listing.images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                  setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
                }
              >
                {listing.images.map((img) => (
                  <Image
                    key={img.id}
                    source={{ uri: img.url }}
                    style={{ width: SCREEN_WIDTH, height: 280 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {listing.images.length > 1 ? (
                <View style={styles.dots}>
                  {listing.images.map((img, i) => (
                    <View
                      key={img.id}
                      style={[
                        styles.dot,
                        { backgroundColor: i === galleryIndex ? '#fff' : 'rgba(255,255,255,0.5)' },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.noImage]}>
              <Ionicons name="image-outline" size={44} color={c.muted} />
            </View>
          )}
        </View>

        <View style={{ padding: spacing.l, gap: spacing.m }}>
          {/* Preisblock */}
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.s, flexWrap: 'wrap' }}>
              <Text style={[styles.price, { color: c.text }]}>{price.main}</Text>
              {price.suffix ? <Text style={[type.body, { color: c.muted }]}>{price.suffix}</Text> : null}
              {listing.status !== 'ACTIVE' ? <StatusChip kind="listing" value={listing.status} /> : null}
            </View>
            <Text style={[type.title, { color: c.text }]}>{listing.title}</Text>
            <Text style={[type.caption, { color: c.muted }]}>
              {listing.category.name}
              {listing.condition ? ` · ${CONDITION_LABELS[listing.condition]}` : ''}
              {listing.quantity > 1 ? ` · ${listing.quantity} ${listing.unit ?? 'Stück'}` : ''}
            </Text>
            <Text style={[type.caption, { color: c.muted }]}>
              {listing.zip} {listing.city}
              {listing.publishedAt ? ` · ${formatRelative(listing.publishedAt)}` : ''} ·{' '}
              {listing.viewCount} Aufrufe
            </Text>
          </View>

          {/* Firmen-Card */}
          <Pressable onPress={() => router.push(`/company/${listing.company.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
                <View style={[styles.companyAvatar, { backgroundColor: c.accentSoft }]}>
                  <Ionicons name="business" size={22} color={c.accent} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.heading, { color: c.text }]}>{listing.company.name}</Text>
                  <VerifiedBadge verified={verified} />
                  {verified && listing.company.verifiedAt ? (
                    <Text style={[type.caption, { color: c.muted }]}>
                      Geprüft seit{' '}
                      {new Date(listing.company.verifiedAt).toLocaleDateString('de-DE', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.muted} />
              </View>
            </Card>
          </Pressable>

          {listing.contactPhone ? (
            <Pressable
              onPress={() => void Linking.openURL(`tel:${listing.contactPhone}`)}
              accessibilityRole="link"
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s }}
            >
              <Ionicons name="call-outline" size={18} color={c.accent} />
              <Text style={[type.body, { color: c.accent, fontWeight: '600' }]}>
                {listing.contactPhone}
              </Text>
            </Pressable>
          ) : null}

          <SectionHeader title="Beschreibung" />
          <Text style={[type.body, { color: c.text, lineHeight: 22 }]}>{listing.description}</Text>

          {!isOwner ? (
            <Pressable onPress={report} style={{ paddingVertical: spacing.m }}>
              <Text style={[type.caption, { color: c.muted, textDecorationLine: 'underline' }]}>
                Inserat melden
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom-Bar (Brief §6.3) */}
      <View style={[styles.actionBar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        {isOwner ? (
          <Button title="Zu meinen Inseraten" variant="secondary" onPress={() => router.push('/(tabs)/profile')} style={{ flex: 1 }} />
        ) : (
          <>
            <Button
              title="Nachricht"
              variant="secondary"
              onPress={() =>
                requireVerified(() => {
                  void startConversation('Guten Tag, ist das Inserat noch verfügbar?');
                })
              }
              style={{ flex: 1 }}
            />
            {listing.priceType !== 'ON_REQUEST' ? (
              <Button
                title="Preis vorschlagen"
                onPress={() => requireVerified(() => setOfferOpen(true))}
                style={{ flex: 1 }}
              />
            ) : null}
          </>
        )}
      </View>

      <KybGateSheet
        status={company?.status ?? 'UNVERIFIED'}
        visible={gateOpen}
        onClose={() => setGateOpen(false)}
      />
      <OfferSheet
        visible={offerOpen}
        onClose={() => setOfferOpen(false)}
        onSubmit={(cents) => {
          setOfferOpen(false);
          void startConversation(undefined, cents);
        }}
      />
    </View>
  );
}

function OfferSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (cents: number) => void;
}) {
  const c = useColors();
  const [value, setValue] = useState('');
  if (!visible) return null;
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  return (
    <View style={[styles.offerSheet, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[type.heading, { color: c.text }]}>Preis vorschlagen</Text>
      <FormField
        label="Ihr Angebot (€, netto)"
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder="z. B. 19500"
        autoFocus
      />
      <View style={{ flexDirection: 'row', gap: spacing.s }}>
        <Button title="Abbrechen" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Button
          title="Senden"
          onPress={() => onSubmit(cents)}
          disabled={!Number.isFinite(cents) || cents <= 0}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: spacing.m,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  noImage: { height: 200, alignItems: 'center', justifyContent: 'center' },
  price: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  companyAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.s,
    padding: spacing.l,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  offerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.l,
    paddingBottom: spacing.xxl,
    gap: spacing.m,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    borderWidth: 1,
    minHeight: touch.minSize,
  },
});
