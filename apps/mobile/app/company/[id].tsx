import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useFetch } from '../../src/hooks';
import { radius, spacing, type, useColors } from '../../src/theme';
import type { CompanyStatus, ListingRowData } from '../../src/types';
import { ListingRow } from '../../src/components/ListingRow';
import { Card, EmptyState, ErrorState, SectionHeader, SkeletonRow, VerifiedBadge } from '../../src/components/ui';

interface CompanyProfile {
  company: {
    id: string;
    name: string;
    legalForm: string | null;
    city: string | null;
    country: string;
    website: string | null;
    description: string | null;
    status: CompanyStatus;
    verifiedAt: string | null;
    createdAt: string;
    _count: { listings: number };
  };
}

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const profile = useFetch<CompanyProfile>(`/api/companies/${id}`);
  const listings = useFetch<{ items: ListingRowData[] }>(`/api/listings?companyId=${id}&limit=50`);

  if (profile.loading) {
    return (
      <View style={{ padding: spacing.l, gap: spacing.m, flex: 1, backgroundColor: c.background }}>
        <SkeletonRow />
      </View>
    );
  }
  if (profile.error || !profile.data) {
    return <ErrorState message={profile.error ?? undefined} onRetry={profile.reload} />;
  }
  const company = profile.data.company;

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
      data={listings.data?.items ?? []}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ height: spacing.m }} />}
      renderItem={({ item }) => <ListingRow listing={item} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.m }}>
          <Stack.Screen options={{ title: company.name }} />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
              <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}>
                <Ionicons name="business" size={26} color={c.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.title, { color: c.text }]}>
                  {company.name}
                  {company.legalForm ? ` (${company.legalForm})` : ''}
                </Text>
                <VerifiedBadge verified={company.status === 'VERIFIED'} />
                <Text style={[type.caption, { color: c.muted }]}>
                  {company.city ? `${company.city} · ` : ''}
                  {company.verifiedAt
                    ? `Geprüft seit ${new Date(company.verifiedAt).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`
                    : `Dabei seit ${new Date(company.createdAt).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`}
                </Text>
              </View>
            </View>
            {company.description ? (
              <Text style={[type.body, { color: c.text, marginTop: spacing.s }]}>{company.description}</Text>
            ) : null}
          </Card>
          <SectionHeader title={`Aktive Inserate (${company._count.listings})`} />
        </View>
      }
      ListEmptyComponent={
        listings.loading ? (
          <SkeletonRow />
        ) : (
          <EmptyState icon="pricetags-outline" title="Keine aktiven Inserate" />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
