import AppIcon from '../../components/AppIcon';
import { Text, TextInput } from '../../components/Typography';
import { useCallback, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Image, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/theme';
import { GUIDE_DESTINATIONS, keywordFor } from '../../constants/destinations';
import { useApp } from '../../context/AppContext';
import { bareTitle, fetchJournalFeed } from '../../services/journalService';
import { Avatar, EmptyState, Wordmark } from '../../components/ui';

// Parehong lohika ng TravelTipsPage ng web: ang Guides ay feed ng journal
// posts ng LAHAT ng estudyante, naka-grupo kada lugar.

export default function GuidesScreen() {
  const { top: topInset } = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useApp();
  const [search, setSearch] = useState(String(params.search || ''));
  const [feed, setFeed] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedError, setFeedError] = useState(false);

  async function loadFeed() {
    try {
      const data = await fetchJournalFeed({ limit: 200 });
      setFeed(data.filter((j) => j.title));
      setFeedError(false);
    } catch {
      setFeedError(true);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  const q = search.trim().toLowerCase();
  const matches = (title, destName) => title.toLowerCase().includes(keywordFor(destName).toLowerCase());

  const destinations = useMemo(
    () =>
      GUIDE_DESTINATIONS.filter((d) => d.name.toLowerCase().includes(q)).map((d) => {
        const stories = feed.filter((j) => matches(j.title, d.name));
        return { ...d, stories, hasGuide: d.name === 'Boracay, Aklan' || stories.length > 0 };
      }),
    [feed, q]
  );

  // Mga lugar na wala sa listahan sa itaas pero may sinulat na estudyante.
  const otherPlaces = useMemo(() => {
    const groups = {};
    feed
      .filter((j) => !GUIDE_DESTINATIONS.some((d) => matches(j.title, d.name)))
      .filter((j) => j.title.toLowerCase().includes(q))
      .forEach((j) => {
        const key = bareTitle(j.title).toLowerCase();
        (groups[key] = groups[key] || []).push(j);
      });
    return Object.values(groups);
  }, [feed, q]);

  function openStories(place, title) {
    router.push({ pathname: '/guide/[id]', params: { id: place, title } });
  }

  function authorsRow(stories) {
    const seen = new Set();
    const authors = stories.map((s) => s.author).filter((a) => a && !seen.has(a.id) && seen.add(a.id));
    if (authors.length === 0) return null;
    return (
      <View style={styles.authorsRow}>
        <View style={{ flexDirection: 'row' }}>
          {authors.slice(0, 3).map((a, i) => (
            <Avatar key={a.id} person={a} size={22} style={{ marginLeft: i === 0 ? 0 : -7, borderWidth: 1.5, borderColor: '#FFFFFF' }} />
          ))}
        </View>
        <Text style={styles.authorsText}>
          {stories.length} {t('storiesCountSuffix')}
        </Text>
      </View>
    );
  }

  const nothingFound = destinations.length === 0 && otherPlaces.length === 0;

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topInset, backgroundColor: Colors.white }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        <View style={styles.header}>
          <Wordmark />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.pageTitle}>{t('discoverTravelTips')}</Text>

          <View style={[styles.searchWrap, { flexDirection: 'row', alignItems: 'center', paddingLeft: 12 }]}>
            <AppIcon name="search" size={20} color={Colors.brown600} />
            <TextInput
              style={[styles.searchInput, { flex: 1 }]}
              placeholder={t('discoverWhereToGo')}
              placeholderTextColor={Colors.brown600}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              accessibilityLabel={t('discoverWhereToGo')}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton} accessibilityRole="button" accessibilityLabel={t('clearSearch')}>
                <AppIcon name="x" size={18} color={Colors.brown600} />
              </TouchableOpacity>
            )}
          </View>

          {feedError && <Text style={styles.offlineNote}>{t('storiesOffline')}</Text>}

          {otherPlaces.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#F4D9A8' }]}>
                  <AppIcon name="sparkles" style={{ fontSize: 14 }} />
                </View>
                <Text style={styles.sectionTitle}>{t('newTravelTips')}</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListContent}
                style={{ marginBottom: 26 }}
              >
                {otherPlaces.map((group) => {
                  const j = group[0];
                  const place = bareTitle(j.title);
                  return (
                    <TouchableOpacity key={`journal-${j.id}`} style={styles.card} onPress={() => openStories(place, place)} activeOpacity={0.85}>
                      {j.coverImage ? (
                        <Image source={{ uri: j.coverImage }} style={styles.cardImage} />
                      ) : (
                        <View style={[styles.cardImage, styles.imagePlaceholder]}>
                          <AppIcon name="book" style={{ fontSize: 40 }} />
                        </View>
                      )}
                      <View style={styles.cardBody}>
                        <Text style={styles.destinationName} numberOfLines={2}>
                          {place} {t('travelStorySuffix')}
                        </Text>
                        {authorsRow(group)}
                        <View style={styles.itineraryButton}>
                          <Text style={styles.itineraryButtonText}>{t('seeItineraries')}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {destinations.length > 0 && (
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#C9D9C4' }]}>
                <AppIcon name="map" style={{ fontSize: 14 }} />
              </View>
              <Text style={styles.sectionTitle}>{t('exploreDestinations')}</Text>
            </View>
          )}

          <View style={styles.grid}>
            {destinations.map((dest) => (
              <TouchableOpacity
                key={dest.name}
                style={styles.gridCard}
                onPress={() => openStories(keywordFor(dest.name), dest.name)}
                activeOpacity={0.85}
              >
                <Image source={dest.image} style={styles.gridImage} />
                <View style={styles.gridBody}>
                  <Text style={styles.gridName} numberOfLines={2}>{dest.name}</Text>
                  {authorsRow(dest.stories) || (
                    <Text style={styles.noStories}>{dest.hasGuide ? t('officialGuide') : t('noStoriesYetShort')}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {nothingFound && (
            <EmptyState icon="search" title={t('noPlaceMatches')} subtitle={t('guidesSearchHint')} />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, minHeight: 68, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.line },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  pageTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, lineHeight: 36, letterSpacing: -0.7, color: Colors.brown900, marginBottom: 20 },
  searchWrap: { minHeight: 52, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line, marginBottom: 28, overflow: 'hidden' },
  searchInput: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown900, minHeight: 52, paddingHorizontal: 12, paddingVertical: 14 },
  clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  offlineNote: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600, marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 26, letterSpacing: -0.3, color: Colors.brown900, flex: 1 },
  horizontalListContent: { gap: 14, paddingRight: 6, paddingBottom: 6 },
  card: { width: 220, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden' },
  cardImage: { width: '100%', height: 150, backgroundColor: Colors.cream2 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16 },
  destinationName: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 8,
  },
  authorsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  authorsText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 19, color: Colors.brown600 },
  itineraryButton: { backgroundColor: Colors.brown900, borderRadius: 12, minHeight: 44, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  itineraryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: Colors.onButton },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  gridCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden' },
  gridImage: { width: '100%', height: 110, backgroundColor: Colors.cream2 },
  gridBody: { padding: 12, minHeight: 82 },
  gridName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, lineHeight: 21, color: Colors.brown900, marginBottom: 8 },
  noStories: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 19, color: Colors.brown600 },
});
