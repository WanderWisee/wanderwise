import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../services/userService';
import { notificationIcon, notificationRoute, notificationText } from '../utils/notificationText';
import Backdrop from '../components/Backdrop';
import { EmptyState, ErrorState, Loading, ScreenHeader } from '../components/ui';

// Parehong /api/notifications na gamit ng web: trip reminders, crew,
// comments, expenses, budget, bookings, password.
export default function NotificationsScreen() {
  const router = useRouter();
  const { t, formatTime, timeAgo } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setItems(await fetchNotifications());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function open(n) {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    const route = notificationRoute(n);
    if (route) router.push(route as any);
  }

  async function readAll() {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      load();
    }
  }

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />
      <ScreenHeader
        title={t('notificationsTitle')}
        onBack={() => router.back()}
        right={
          <TouchableOpacity onPress={() => router.push('/settings/notifications')} style={styles.gear} accessibilityLabel={t('notificationSettings')}>
            <Text style={{ fontSize: 15 }}>⚙️</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={items.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            unread > 0 ? (
              <TouchableOpacity onPress={readAll} style={styles.readAll}>
                <Text style={styles.readAllText}>✓ {t('markAllRead')} ({unread})</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState icon="🔔" title={t('noUpdatesRightNow')} subtitle={t('notifEmptySubtitle')} />
            </View>
          }
          renderItem={({ item: n }) => (
            <TouchableOpacity style={[styles.row, !n.isRead && styles.rowUnread]} onPress={() => open(n)} activeOpacity={0.7}>
              <View style={styles.iconBadge}>
                <Text style={{ fontSize: 17 }}>{notificationIcon(n.type)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, !n.isRead && { fontFamily: 'Lora_600SemiBold' }]}>
                  {notificationText(n, t, formatTime)}
                </Text>
                <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
              </View>
              {!n.isRead && <View style={styles.dot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  gear: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  readAll: { alignSelf: 'flex-end', paddingVertical: 6, marginBottom: 8 },
  readAllText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.brown600, textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.line,
  },
  rowUnread: { borderColor: Colors.mint, backgroundColor: '#FBFDF9' },
  iconBadge: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  text: { fontFamily: 'Lora_400Regular', fontSize: 13.5, lineHeight: 19, color: Colors.brown900 },
  time: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 3 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.mint },
});
