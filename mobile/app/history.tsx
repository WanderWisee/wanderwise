import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { fetchHistory } from '../services/userService';
import Backdrop from '../components/Backdrop';
import { ChoiceChips, EmptyState, ErrorState, Loading, ScreenHeader } from '../components/ui';

// Parehong /api/history ng web: mga trip (sarili at sinalihan) at journal
// posts, ayon sa huling pagbukas — kasama kung sino pa ang tumingin.
export default function HistoryScreen() {
  const router = useRouter();
  const { t, timeAgo, formatDateRange } = useApp();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setItems(await fetchHistory());
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

  const shown = items.filter((i) => filter === 'all' || i.type === filter);

  function viewerLine(item) {
    if (!item.viewedBy || item.viewedBy.length === 0) return null;
    return item.viewedBy
      .slice(0, 3)
      .map((v) => `${v.name || t('historyAnonymousViewer')}${v.isOwner ? ` (${t('historyOwnerTag')})` : ''} · ${timeAgo(v.viewedAt)}`)
      .join('\n');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />
      <ScreenHeader title={t('history')} onBack={() => router.back()} />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(i) => `${i.type}-${i.id}`}
          contentContainerStyle={shown.length === 0 ? { flex: 1, paddingHorizontal: 20 } : styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <ChoiceChips
              style={{ marginBottom: 16 }}
              options={[
                { value: 'all', label: t('all') },
                { value: 'Trip', label: t('historyTypeTrip') },
                { value: 'Journal', label: t('historyTypeJournal') },
              ]}
              value={filter}
              onChange={setFilter}
            />
          }
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState icon="🕘" title={t('historyEmpty')} />
            </View>
          }
          renderItem={({ item }) => {
            const isTrip = item.type === 'Trip';
            const viewers = viewerLine(item);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(isTrip ? `/trip/${item.id}` : `/journal/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBadge, { backgroundColor: isTrip ? Colors.tintSand : Colors.tintSage }]}>
                  <Text style={{ fontSize: 16 }}>{isTrip ? '🧳' : '📖'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {isTrip && item.title?.startsWith('Trip to ')
                      ? `${t('tripToPrefix')} ${item.title.slice(8)}`
                      : item.title}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {isTrip ? t('historyTypeTrip') : t('historyTypeJournal')} · {t('historyColViewed')} {timeAgo(item.lastViewed)}
                  </Text>
                  {isTrip && (item.startDate || item.endDate) && (
                    <Text style={styles.rowSubtitle}>📅 {formatDateRange(item.startDate, item.endDate)}</Text>
                  )}
                  {!!viewers && (
                    <Text style={styles.viewers}>
                      {t('historyViewedByLabel')}
                      {'\n'}
                      {viewers}
                    </Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
    shadowColor: Colors.brown900, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  iconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 14.5, color: Colors.brown900 },
  rowSubtitle: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 3 },
  viewers: { fontFamily: 'Lora_400Regular', fontSize: 11, lineHeight: 16, color: Colors.placeholder, marginTop: 6 },
  chevron: { fontSize: 20, color: Colors.brown600 },
});
