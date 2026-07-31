import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { api, ApiError, uploadFile } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useFetch } from '../../src/hooks';
import { radius, spacing, touch, type, useColors } from '../../src/theme';
import type { Category, PriceType } from '../../src/types';
import { Button, Card, FormField, SectionHeader } from '../../src/components/ui';
import { KybStatusView } from '../../src/components/KybStatusView';

const PRICE_TYPES: Array<{ value: PriceType; label: string }> = [
  { value: 'FIXED', label: 'Festpreis' },
  { value: 'NEGOTIABLE', label: 'VB' },
  { value: 'ON_REQUEST', label: 'Auf Anfrage' },
];

export default function PostScreen() {
  const c = useColors();
  const router = useRouter();
  const { company, refresh } = useAuth();

  // KYB-Gating (Brief §6.4): Unverifizierte sehen den Status-Screen,
  // nie ein totes Formular.
  if (!company || company.status !== 'VERIFIED') {
    return <KybStatusView embedded />;
  }
  return <PostForm key={company.id} onDone={() => { void refresh(); router.push('/(tabs)/profile'); }} defaultZip={company.zip ?? ''} defaultCity={company.city ?? ''} />;
}

function PostForm({
  onDone,
  defaultZip,
  defaultCity,
}: {
  onDone: () => void;
  defaultZip: string;
  defaultCity: string;
}) {
  const c = useColors();
  const { data: categoryData } = useFetch<{ categories: Category[] }>('/api/categories');
  const categories = categoryData?.categories ?? [];

  const [images, setImages] = useState<Array<{ uri: string; remoteUrl?: string }>>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('NEGOTIABLE');
  const [isNet, setIsNet] = useState(true);
  const [condition, setCondition] = useState<string | null>('USED');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [zip, setZip] = useState(defaultZip);
  const [city, setCity] = useState(defaultCity);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === categoryId) ?? null,
    [categories, categoryId],
  );

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 20 - images.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    setImages((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri }))].slice(0, 20));
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      // Bilder erst beim Absenden hochladen (INS-4)
      const urls: string[] = [];
      for (const img of images) {
        if (img.remoteUrl) {
          urls.push(img.remoteUrl);
          continue;
        }
        const ext = img.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const uploaded = await uploadFile({
          uri: img.uri,
          name: `foto.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
        urls.push(uploaded.url);
        img.remoteUrl = uploaded.url;
      }
      await api('/api/listings', {
        method: 'POST',
        body: {
          categoryId,
          title: title.trim(),
          description: description.trim(),
          priceCents:
            priceType === 'ON_REQUEST' || !price
              ? null
              : Math.round(Number(price.replace(',', '.')) * 100),
          priceType,
          isNetPrice: isNet,
          condition,
          quantity: Math.max(1, Number(quantity) || 1),
          unit: unit.trim() || undefined,
          zip: zip.trim(),
          city: city.trim(),
          imageUrls: urls,
        },
      });
      Alert.alert('Inserat veröffentlicht', 'Ihr Inserat ist jetzt aktiv.');
      setImages([]);
      setTitle('');
      setDescription('');
      setPrice('');
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setFieldErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
      }
      setError(err instanceof Error ? err.message : 'Veröffentlichen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  const valid =
    title.trim().length >= 5 &&
    description.trim().length >= 10 &&
    categoryId &&
    zip.trim().length >= 3 &&
    city.trim().length >= 2 &&
    (priceType === 'ON_REQUEST' || price.trim().length > 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.l, gap: spacing.m }} keyboardShouldPersistTaps="handled">
        {/* Fotos zuerst (Brief §6.4) */}
        <SectionHeader title="Fotos" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.s }}>
          <Pressable
            onPress={pickImages}
            style={[styles.addPhoto, { borderColor: c.border, backgroundColor: c.card }]}
            accessibilityLabel="Fotos hinzufügen"
          >
            <Ionicons name="camera-outline" size={26} color={c.accent} />
            <Text style={[type.caption, { color: c.accent }]}>Hinzufügen</Text>
          </Pressable>
          {images.map((img, i) => (
            <View key={img.uri} style={styles.photoWrap}>
              <Image source={{ uri: img.uri }} style={[styles.photo, { backgroundColor: c.skeleton }]} />
              {i === 0 ? (
                <View style={[styles.coverBadge, { backgroundColor: c.accent }]}>
                  <Text style={{ color: c.onAccent, fontSize: 10, fontWeight: '700' }}>Titelbild</Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => setImages(images.filter((x) => x !== img))}
                style={[styles.removePhoto, { backgroundColor: c.card }]}
                accessibilityLabel="Foto entfernen"
              >
                <Ionicons name="close" size={14} color={c.text} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <FormField
          label="Titel *"
          value={title}
          onChangeText={setTitle}
          placeholder="z. B. Gabelstapler Linde H25, Bj. 2018"
          maxLength={120}
          error={fieldErrors.title}
        />

        <Text style={[type.label, { color: c.text }]}>Kategorie *</Text>
        <Pressable
          onPress={() => setCategoryPickerOpen(!categoryPickerOpen)}
          style={[styles.categoryButton, { backgroundColor: c.inputBackground, borderColor: c.border }]}
        >
          <Text style={[type.body, { color: selectedCategory ? c.text : c.muted, flex: 1 }]}>
            {selectedCategory?.name ?? 'Kategorie wählen'}
          </Text>
          <Ionicons name={categoryPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
        </Pressable>
        {categoryPickerOpen ? (
          <Card style={{ gap: 0, padding: spacing.s }}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setCategoryId(cat.id);
                  setCategoryPickerOpen(false);
                }}
                style={[styles.categoryOption, { paddingLeft: cat.parentId ? spacing.xl : spacing.s }]}
              >
                <Text
                  style={[
                    type.body,
                    { color: categoryId === cat.id ? c.accent : c.text, fontWeight: cat.parentId ? '400' : '600' },
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <FormField
          label="Beschreibung *"
          value={description}
          onChangeText={setDescription}
          placeholder="Zustand, Ausstattung, Wartungshistorie, Übergabe…"
          multiline
          error={fieldErrors.description}
        />

        <SectionHeader title="Preis" />
        <View style={{ flexDirection: 'row', gap: spacing.s }}>
          {PRICE_TYPES.map((pt) => {
            const active = priceType === pt.value;
            return (
              <Pressable
                key={pt.value}
                onPress={() => setPriceType(pt.value)}
                style={[
                  styles.segment,
                  { backgroundColor: active ? c.accent : c.card, borderColor: active ? c.accent : c.border },
                ]}
              >
                <Text style={[type.label, { color: active ? c.onAccent : c.text }]}>{pt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {priceType !== 'ON_REQUEST' ? (
          <>
            <FormField
              label="Betrag (€) *"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="z. B. 21900"
              error={fieldErrors.priceCents}
            />
            <View style={styles.switchRow}>
              <Text style={[type.body, { color: c.text }]}>Nettopreis (zzgl. USt.)</Text>
              <Switch value={isNet} onValueChange={setIsNet} trackColor={{ true: c.accent }} />
            </View>
          </>
        ) : null}

        <SectionHeader title="Details" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s }}>
          {(['NEW', 'LIKE_NEW', 'USED', 'DEFECT'] as const).map((cond) => {
            const labels = { NEW: 'Neu', LIKE_NEW: 'Neuwertig', USED: 'Gebraucht', DEFECT: 'Defekt' };
            const active = condition === cond;
            return (
              <Pressable
                key={cond}
                onPress={() => setCondition(active ? null : cond)}
                style={[
                  styles.segment,
                  { backgroundColor: active ? c.accent : c.card, borderColor: active ? c.accent : c.border },
                ]}
              >
                <Text style={[type.label, { color: active ? c.onAccent : c.text }]}>{labels[cond]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.m }}>
          <View style={{ flex: 1 }}>
            <FormField label="Menge" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <FormField label="Einheit" value={unit} onChangeText={setUnit} placeholder="Stück, Palette, t …" />
          </View>
        </View>

        <SectionHeader title="Standort" />
        <View style={{ flexDirection: 'row', gap: spacing.m }}>
          <View style={{ flex: 1 }}>
            <FormField
              label="PLZ *"
              value={zip}
              onChangeText={setZip}
              keyboardType="number-pad"
              error={fieldErrors.zip}
            />
          </View>
          <View style={{ flex: 2 }}>
            <FormField label="Ort *" value={city} onChangeText={setCity} error={fieldErrors.city} />
          </View>
        </View>

        {error ? <Text style={[type.body, { color: c.danger }]}>{error}</Text> : null}
        <Button
          title="Inserat veröffentlichen"
          onPress={onSubmit}
          loading={busy}
          disabled={!valid}
          style={{ marginTop: spacing.m, marginBottom: spacing.xxl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: radius.s,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoWrap: { position: 'relative' },
  photo: { width: 96, height: 96, borderRadius: radius.s },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    minHeight: touch.minSize,
  },
  categoryOption: { paddingVertical: spacing.m, paddingHorizontal: spacing.s },
  segment: {
    paddingHorizontal: spacing.m,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: touch.minSize,
  },
});
