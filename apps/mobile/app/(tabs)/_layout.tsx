import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useColors } from '../../src/theme';
import type { ConversationListItem } from '../../src/types';

export default function TabsLayout() {
  const c = useColors();
  const [unread, setUnread] = useState(0);

  // Ungelesen-Badge am Nachrichten-Tab (Brief §6.6), sanftes Polling
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const data = await api<{ items: ConversationListItem[] }>('/api/conversations');
        if (active) setUnread(data.items.reduce((sum, item) => sum + item.unreadCount, 0));
      } catch {
        // still bleiben — Badge ist nice-to-have
      }
    }
    void poll();
    const interval = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Entdecken',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Merkliste',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Einstellen',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 6} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Nachrichten',
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Meins',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
