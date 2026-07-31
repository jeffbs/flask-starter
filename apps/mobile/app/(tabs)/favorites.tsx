import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useFetch } from '../../src/hooks';
import { spacing, useColors } from '../../src/theme';
import type { FavoriteItem, ListingRowData } from '../../src/types';
import { ListingRow } from '../../src/components/ListingRow';
import { EmptyState, ErrorState, SkeletonRow } from '../../src/components/ui';

export default function FavoritesScreen() {
  const c = useColors();
  const router = useRouter();
  const { data, loading, error, reload } = useFetch<{ items: FavoriteItem[] }>('/api/favorites');

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

  const items = data?.items ?? [];
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: spacing.l, flexGrow: 1 }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.m }} />}
      renderItem={({ item }) => (
        // FAV-2: auch verkaufte/pausierte bleiben sichtbar — mit Status-Badge
        <ListingRow
          listing={{ ...item.listing, quantity: 1, unit: null, condition: null, createdAt: '', publishedAt: null, categoryId: '' } as ListingRowData}
          showStatus
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="heart-outline"
          title="Noch nichts gemerkt"
          message="Gemerkte Inserate finden Sie hier wieder — auch wenn sie später pausiert oder verkauft sind."
          actionTitle="Jetzt stöbern"
          onAction={() => router.push('/(tabs)')}
        />
      }
    />
  );
}
