import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api, wsUrl } from '../../src/api';
import { useAuth } from '../../src/auth';
import { radius, spacing, touch, type, useColors } from '../../src/theme';
import type { Message } from '../../src/types';
import { Button, ErrorState, FormField } from '../../src/components/ui';
import { OfferCard } from '../../src/components/OfferCard';
import { formatPrice, formatTime } from '../../src/format';

interface ThreadResponse {
  conversation: {
    id: string;
    listing: {
      id: string;
      title: string;
      priceCents: number | null;
      priceType: 'FIXED' | 'NEGOTIABLE' | 'ON_REQUEST';
      status: string;
      images: Array<{ url: string }>;
    };
    counterpart: { id: string; name: string };
    role: 'BUYER' | 'SELLER';
  };
  messages: Message[];
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerValue, setOfferValue] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api<ThreadResponse>(`/api/conversations/${id}/messages`);
      setThread(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Echtzeit über WebSocket (CHAT-7)
  useEffect(() => {
    const ws = new WebSocket(wsUrl());
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as {
          type: string;
          payload: { conversationId: string; message?: Message; systemMessage?: Message };
        };
        if (parsed.payload.conversationId !== id) return;
        setThread((prev) => {
          if (!prev) return prev;
          const incoming = [parsed.payload.message, parsed.payload.systemMessage].filter(
            Boolean,
          ) as Message[];
          const known = new Set(prev.messages.map((m) => m.id));
          const fresh = incoming.filter((m) => !known.has(m.id));
          if (parsed.type === 'offer:responded' && parsed.payload.message) {
            const updated = prev.messages.map((m) =>
              m.id === parsed.payload.message!.id ? { ...m, ...parsed.payload.message } : m,
            );
            return { ...prev, messages: [...updated, ...fresh.filter((m) => m.type === 'SYSTEM')] };
          }
          return { ...prev, messages: [...prev.messages, ...fresh] };
        });
      } catch {
        // fehlerhafte Events ignorieren
      }
    };
    return () => ws.close();
  }, [id]);

  async function send(payload: { type: 'TEXT'; body: string } | { type: 'OFFER'; offerAmountCents: number }) {
    setSending(true);
    try {
      const res = await api<{ message: Message }>(`/api/conversations/${id}/messages`, {
        method: 'POST',
        body: payload,
      });
      setThread((prev) =>
        prev && !prev.messages.some((m) => m.id === res.message.id)
          ? { ...prev, messages: [...prev.messages, res.message] }
          : prev,
      );
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senden fehlgeschlagen');
    } finally {
      setSending(false);
    }
  }

  async function respond(messageId: string, action: 'ACCEPT' | 'DECLINE' | 'WITHDRAW') {
    setRespondingId(messageId);
    try {
      const res = await api<{ message: Message; systemMessage: Message }>(
        `/api/conversations/${id}/offers/${messageId}/respond`,
        { method: 'POST', body: { action } },
      );
      setThread((prev) => {
        if (!prev) return prev;
        const updated = prev.messages.map((m) =>
          m.id === messageId ? { ...m, offerStatus: res.message.offerStatus } : m,
        );
        const hasSystem = prev.messages.some((m) => m.id === res.systemMessage.id);
        return { ...prev, messages: hasSystem ? updated : [...updated, res.systemMessage] };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
    } finally {
      setRespondingId(null);
    }
  }

  if (error && !thread) return <ErrorState message={error} onRetry={load} />;
  if (!thread) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  const price = formatPrice(
    thread.conversation.listing.priceCents,
    thread.conversation.listing.priceType,
    true,
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: thread.conversation.counterpart.name }} />

      {/* Inserat-Mini-Card (Brief §6.6) */}
      <Pressable
        onPress={() => router.push(`/listing/${thread.conversation.listing.id}`)}
        style={[styles.listingHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}
      >
        <View style={[styles.headerThumb, { backgroundColor: c.skeleton }]}>
          {thread.conversation.listing.images[0] ? (
            <Image
              source={{ uri: thread.conversation.listing.images[0].url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[type.body, { color: c.text, fontWeight: '500' }]}>
            {thread.conversation.listing.title}
          </Text>
          <Text style={[type.caption, { color: c.muted }]}>{price.main}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Pressable>

      <FlatList
        ref={listRef}
        data={thread.messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.l, gap: spacing.m }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.sender.companyId != null && item.sender.companyId === user?.companyId;
          if (item.type === 'SYSTEM') {
            return (
              <Text style={[type.caption, { color: c.muted, textAlign: 'center' }]}>{item.body}</Text>
            );
          }
          if (item.type === 'OFFER') {
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <OfferCard
                  message={item}
                  isMine={mine}
                  busy={respondingId === item.id}
                  onRespond={(action) => void respond(item.id, action)}
                />
                <Text style={[type.caption, { color: c.muted, marginTop: 2 }]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            );
          }
          return (
            <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: mine ? c.bubbleMine : c.bubbleTheirs,
                    borderColor: c.border,
                  },
                ]}
              >
                <Text style={[type.body, { color: c.text }]}>{item.body}</Text>
              </View>
              <Text style={[type.caption, { color: c.muted, marginTop: 2 }]}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          );
        }}
      />

      {error ? (
        <Text style={[type.caption, { color: c.danger, textAlign: 'center', padding: spacing.xs }]}>
          {error}
        </Text>
      ) : null}

      {offerOpen ? (
        <View style={[styles.offerBox, { backgroundColor: c.card, borderTopColor: c.border }]}>
          <FormField
            label="Preisvorschlag (€, netto)"
            value={offerValue}
            onChangeText={setOfferValue}
            keyboardType="decimal-pad"
            placeholder="z. B. 19500"
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            <Button title="Abbrechen" variant="ghost" onPress={() => setOfferOpen(false)} style={{ flex: 1 }} />
            <Button
              title="Vorschlag senden"
              loading={sending}
              onPress={() => {
                const cents = Math.round(Number(offerValue.replace(',', '.')) * 100);
                if (Number.isFinite(cents) && cents > 0) {
                  void send({ type: 'OFFER', offerAmountCents: cents });
                  setOfferOpen(false);
                  setOfferValue('');
                }
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {/* Eingabezeile mit „+"-Menü (Brief §6.6) */}
      <View style={[styles.inputBar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <Pressable
          onPress={() => setOfferOpen(!offerOpen)}
          style={[styles.plusButton, { backgroundColor: c.accentSoft }]}
          accessibilityLabel="Preis vorschlagen"
        >
          <Ionicons name={offerOpen ? 'close' : 'pricetag-outline'} size={20} color={c.accent} />
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Nachricht schreiben…"
          placeholderTextColor={c.muted}
          multiline
          style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
        />
        <Pressable
          onPress={() => input.trim() && void send({ type: 'TEXT', body: input.trim() })}
          disabled={sending || !input.trim()}
          style={[styles.sendButton, { backgroundColor: c.accent, opacity: input.trim() ? 1 : 0.4 }]}
          accessibilityLabel="Senden"
        >
          <Ionicons name="send" size={18} color={c.onAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.m,
    borderBottomWidth: 1,
  },
  headerThumb: { width: 44, height: 44, borderRadius: radius.s, overflow: 'hidden' },
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.s,
    padding: spacing.m,
    borderTopWidth: 1,
  },
  plusButton: {
    width: touch.minSize,
    height: touch.minSize,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.l,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    maxHeight: 120,
    fontSize: type.body.fontSize,
  },
  sendButton: {
    width: touch.minSize,
    height: touch.minSize,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerBox: { padding: spacing.l, gap: spacing.m, borderTopWidth: 1 },
});
