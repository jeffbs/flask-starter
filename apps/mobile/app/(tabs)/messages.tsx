import { useCallback } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useFetch } from '../../src/hooks';
import { radius, spacing, type, useColors } from '../../src/theme';
import type { ConversationListItem } from '../../src/types';
import { EmptyState, ErrorState, SkeletonRow } from '../../src/components/ui';
import { formatEuro, formatRelative } from '../../src/format';

export default function MessagesScreen() {
  const c = useColors();
  const router = useRouter();
  const { data, loading, error, reload } = useFetch<{ items: ConversationListItem[] }>(
    '/api/conversations',
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (loading) {
    return (
      <View style={{ padding: spacing.l, gap: spacing.m, backgroundColor: c.background, flex: 1 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={reload} />;

  function preview(item: ConversationListItem): string {
    const m = item.lastMessage;
    if (!m) return '';
    if (m.type === 'OFFER') return `Preisvorschlag: ${formatEuro(m.offerAmountCents ?? 0)}`;
    return m.body ?? '';
  }

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: spacing.l, flexGrow: 1 }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.m }} />}
      renderItem={({ item }) => {
        const thumb = item.listing.images[0]?.url;
        const unread = item.unreadCount > 0;
        return (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}`)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={[styles.thumb, { backgroundColor: c.skeleton }]}>
              {thumb ? (
                <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={22} color={c.muted} style={{ alignSelf: 'center' }} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.s }}>
                <Text
                  numberOfLines={1}
                  style={[type.body, { color: c.text, fontWeight: unread ? '700' : '600', flex: 1 }]}
                >
                  {item.counterpart.name}
                </Text>
                <Text style={[type.caption, { color: c.muted }]}>
                  {item.lastMessage ? formatRelative(item.lastMessage.createdAt) : ''}
                </Text>
              </View>
              <Text numberOfLines={1} style={[type.caption, { color: c.muted }]}>
                {item.listing.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s }}>
                <Text
                  numberOfLines={1}
                  style={[type.body, { color: unread ? c.text : c.muted, flex: 1, fontWeight: unread ? '600' : '400' }]}
                >
                  {preview(item)}
                </Text>
                {unread ? (
                  <View style={[styles.unreadBadge, { backgroundColor: c.accent }]}>
                    <Text style={{ color: c.onAccent, fontSize: 11, fontWeight: '700' }}>
                      {item.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="chatbubbles-outline"
          title="Noch keine Nachrichten"
          message="Anfragen zu Ihren Inseraten und Ihre eigenen Anfragen erscheinen hier."
          actionTitle="Jetzt stöbern"
          onAction={() => router.push('/(tabs)')}
        />
      }
    />
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
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.s,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
});
