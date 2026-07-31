import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useDebounced, useFetch } from '../../src/hooks';
import { radius, spacing, touch, type, useColors } from '../../src/theme';
import type { Category, Condition, ListingRowData } from '../../src/types';
import { ListingRow } from '../../src/components/ListingRow';
import { Button, EmptyState, ErrorState, FormField, SkeletonRow } from '../../src/components/ui';
import { CONDITION_LABELS } from '../../src/format';

const PAGE_SIZE = 20;

interface Filters {
  categoryId: string | null;
  priceMin: string;
  priceMax: string;
  condition: Condition | null;
  zip: string;
  sort: 'newest' | 'price_asc' | 'price_desc';
}

const defaultFilters: Filters = {
  categoryId: null,
  priceMin: '',
  priceMax: '',
  condition: null,
  zip: '',
  sort: 'newest',
};

function buildQuery(q: string, f: Filters, page: number): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (f.categoryId) params.set('categoryId', f.categoryId);
  if (f.priceMin) params.set('priceMin', String(Math.round(Number(f.priceMin) * 100)));
  if (f.priceMax) params.set('priceMax', String(Math.round(Number(f.priceMax) * 100)));
  if (f.condition) params.set('condition', f.condition);
  if (f.zip.trim()) params.set('zip', f.zip.trim());
  params.set('sort', f.sort);
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  return `/api/listings?${params.toString()}`;
}

export default function DiscoverScreen() {
  const c = useColors();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filterSheet, setFilterSheet] = useState(false);

  const [items, setItems] = useState<ListingRowData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categoryData } = useFetch<{ categories: Category[] }>('/api/categories');
  const rootCategories = useMemo(
    () => (categoryData?.categories ?? []).filter((cat) => !cat.parentId),
    [categoryData],
  );

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      try {
        setError(null);
        const data = await api<{ items: ListingRowData[]; total: number }>(
          buildQuery(debouncedQuery, filters, nextPage),
        );
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setPage(nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      }
    },
    [debouncedQuery, filters],
  );

  useEffect(() => {
    setLoading(true);
    void load(1, true).finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  }

  async function onEndReached() {
    if (loadingMore || loading || items.length >= total) return;
    setLoadingMore(true);
    await load(page + 1, false);
    setLoadingMore(false);
  }

  const activeFilterCount =
    Number(Boolean(filters.categoryId)) +
    Number(Boolean(filters.priceMin || filters.priceMax)) +
    Number(Boolean(filters.condition)) +
    Number(Boolean(filters.zip)) +
    Number(filters.sort !== 'newest');

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Suchkopf (Brief §6.2) */}
      <View style={[styles.searchHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={[styles.searchBox, { backgroundColor: c.background, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Wonach sucht Ihr Betrieb?"
            placeholderTextColor={c.muted}
            style={[styles.searchInput, { color: c.text }]}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Suche leeren">
              <Ionicons name="close-circle" size={18} color={c.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setFilterSheet(true)}
          style={[styles.filterButton, { borderColor: c.border }]}
          accessibilityLabel="Filter öffnen"
        >
          <Ionicons name="options-outline" size={20} color={c.text} />
          {activeFilterCount > 0 ? (
            <View style={[styles.filterBadge, { backgroundColor: c.accent }]}>
              <Text style={{ color: c.onAccent, fontSize: 10, fontWeight: '700' }}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Kategorie-Chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {rootCategories.map((cat) => {
            const active = filters.categoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() =>
                  setFilters({ ...filters, categoryId: active ? null : cat.id })
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.accent : c.card,
                    borderColor: active ? c.accent : c.border,
                  },
                ]}
              >
                <Text style={[type.label, { color: active ? c.onAccent : c.text }]}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: spacing.l, gap: spacing.m }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load(1, true)} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingRow listing={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.m }} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Keine Treffer"
              message="Versuchen Sie andere Suchbegriffe oder lockern Sie die Filter."
              actionTitle={activeFilterCount > 0 ? 'Filter zurücksetzen' : undefined}
              onAction={activeFilterCount > 0 ? () => setFilters(defaultFilters) : undefined}
            />
          }
          ListFooterComponent={loadingMore ? <SkeletonRow /> : null}
        />
      )}

      {/* Filter-Sheet (Brief §6.2) */}
      <Modal visible={filterSheet} animationType="slide" onRequestClose={() => setFilterSheet(false)}>
        <FilterSheetContent
          filters={filters}
          categories={categoryData?.categories ?? []}
          onApply={(f) => {
            setFilters(f);
            setFilterSheet(false);
          }}
          onClose={() => setFilterSheet(false)}
        />
      </Modal>
    </View>
  );
}

function FilterSheetContent({
  filters,
  categories,
  onApply,
  onClose,
}: {
  filters: Filters;
  categories: Category[];
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const [draft, setDraft] = useState<Filters>(filters);
  const roots = categories.filter((cat) => !cat.parentId);
  const childrenOf = (id: string) => categories.filter((cat) => cat.parentId === id);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.sheetHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Filter schließen">
          <Ionicons name="close" size={24} color={c.text} />
        </Pressable>
        <Text style={[type.heading, { color: c.text }]}>Filter</Text>
        <Pressable onPress={() => setDraft(defaultFilters)} hitSlop={12}>
          <Text style={[type.label, { color: c.accent }]}>Zurücksetzen</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.l, gap: spacing.l }}>
        <View style={{ gap: spacing.s }}>
          <Text style={[type.heading, { color: c.text }]}>Kategorie</Text>
          {roots.map((root) => (
            <View key={root.id}>
              <CategoryOption
                label={root.name}
                selected={draft.categoryId === root.id}
                onPress={() =>
                  setDraft({ ...draft, categoryId: draft.categoryId === root.id ? null : root.id })
                }
              />
              {childrenOf(root.id).map((child) => (
                <CategoryOption
                  key={child.id}
                  label={child.name}
                  indent
                  selected={draft.categoryId === child.id}
                  onPress={() =>
                    setDraft({ ...draft, categoryId: draft.categoryId === child.id ? null : child.id })
                  }
                />
              ))}
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.s }}>
          <Text style={[type.heading, { color: c.text }]}>Preis (€)</Text>
          <View style={{ flexDirection: 'row', gap: spacing.m }}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Von"
                value={draft.priceMin}
                onChangeText={(v) => setDraft({ ...draft, priceMin: v })}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Bis"
                value={draft.priceMax}
                onChangeText={(v) => setDraft({ ...draft, priceMax: v })}
                keyboardType="number-pad"
                placeholder="beliebig"
              />
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.s }}>
          <Text style={[type.heading, { color: c.text }]}>Zustand</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s }}>
            {(Object.keys(CONDITION_LABELS) as Condition[]).map((cond) => {
              const active = draft.condition === cond;
              return (
                <Pressable
                  key={cond}
                  onPress={() => setDraft({ ...draft, condition: active ? null : cond })}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? c.accent : c.card, borderColor: active ? c.accent : c.border },
                  ]}
                >
                  <Text style={[type.label, { color: active ? c.onAccent : c.text }]}>
                    {CONDITION_LABELS[cond]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FormField
          label="PLZ-Region"
          value={draft.zip}
          onChangeText={(v) => setDraft({ ...draft, zip: v })}
          keyboardType="number-pad"
          placeholder="z. B. 44"
          hint="Filtert grob nach PLZ-Region"
        />

        <View style={{ gap: spacing.s }}>
          <Text style={[type.heading, { color: c.text }]}>Sortierung</Text>
          {(
            [
              ['newest', 'Neueste zuerst'],
              ['price_asc', 'Günstigste zuerst'],
              ['price_desc', 'Teuerste zuerst'],
            ] as const
          ).map(([value, label]) => (
            <CategoryOption
              key={value}
              label={label}
              selected={draft.sort === value}
              onPress={() => setDraft({ ...draft, sort: value })}
            />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.sheetFooter, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Button title="Ergebnisse anzeigen" onPress={() => onApply(draft)} />
      </View>
    </View>
  );
}

function CategoryOption({
  label,
  selected,
  indent,
  onPress,
}: {
  label: string;
  selected: boolean;
  indent?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, { paddingLeft: indent ? spacing.xl : 0 }]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[type.body, { color: c.text, flex: 1 }]}>{label}</Text>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? c.accent : c.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchHeader: {
    flexDirection: 'row',
    gap: spacing.s,
    padding: spacing.m,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    borderRadius: radius.m,
    borderWidth: 1,
    paddingHorizontal: spacing.m,
    minHeight: touch.minSize,
  },
  searchInput: { flex: 1, fontSize: type.body.fontSize, paddingVertical: spacing.s },
  filterButton: {
    width: touch.minSize,
    borderRadius: radius.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chips: { gap: spacing.s, paddingHorizontal: spacing.m, paddingVertical: spacing.s },
  chip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  list: { padding: spacing.l, flexGrow: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.l,
    paddingTop: spacing.xxl,
    borderBottomWidth: 1,
  },
  sheetFooter: { padding: spacing.l, borderTopWidth: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.minSize,
  },
});
