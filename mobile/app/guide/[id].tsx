import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/theme';
import { DESTINATIONS, keywordFor } from '../../constants/destinations';
import { useApp } from '../../context/AppContext';
import { fetchJournalFeed } from '../../services/journalService';
import { geocodeDestination } from '../../services/geoService';
import { fullName } from '../../services/userService';
import OsmMap from '../../components/OsmMap';
import { Avatar, EmptyState, ErrorState, Loading, ScreenHeader } from '../../components/ui';

// Guides → "See Itineraries": lahat ng kwento ng mga estudyante tungkol sa
// isang lugar (parehong DestinationStoriesPage ng web).
export default function GuideDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const place = String(params.id || '');
  const heading = String(params.title || place);
  const { t, formatDate } = useApp();

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState(null);

  const known = DESTINATIONS.find((d) => keywordFor(d.name).toLowerCase() === place.toLowerCase());
  const hasOfficialGuide = place.toLowerCase() === 'boracay';

  async function load() {
    try {
      setStories(await fetchJournalFeed({ q: place }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    if (known) setCoords({ latitude: known.lat, longitude: known.lon });
    else geocodeDestination(heading).then((c) => c && setCoords(c));
  }, [place]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={`${heading} ${t('travelStorySuffix')}`} onBack={() => router.back()} titleSize={17} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {known && <Image source={known.image} style={styles.hero} />}

        <Text style={styles.sectionTitle}>{t('exploreTheArea')}</Text>
        <OsmMap
          markers={coords ? [{ ...coords, label: heading }] : []}
          height={170}
          singleZoom={11}
          numbered={false}
          emptyLabel={t('loadingMap')}
        />

        {hasOfficialGuide && (
          <TouchableOpacity style={styles.officialCard} onPress={() => router.push('/guide/official')} activeOpacity={0.85}>
            <Text style={{ fontSize: 26 }}>📘</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.storyName}>{t('officialGuide')}</Text>
              <Text style={styles.storyMeta}>{t('officialGuideHint')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('studentStories')}</Text>
        <Text style={styles.subtitle}>{t('storiesSubtitle')}</Text>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
        ) : stories.length === 0 ? (
          <EmptyState
            icon="📖"
            title={t('storiesEmpty')}
            action={
              <TouchableOpacity
                style={[styles.readButton, { marginTop: 16, paddingHorizontal: 20 }]}
                onPress={() => router.push({ pathname: '/new-post', params: { place: heading } })}
              >
                <Text style={styles.readButtonText}>{t('writeFirstStory')}</Text>
              </TouchableOpacity>
            }
          />
        ) : (
          stories.map((s) => (
            <View key={s.id} style={styles.storyCard}>
              <TouchableOpacity style={styles.storyHeader} onPress={() => router.push(`/user/${s.author?.id}`)} activeOpacity={0.7}>
                <Avatar person={s.author} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.storyName}>{fullName(s.author, t('student'))}</Text>
                  <Text style={styles.storyMeta}>{formatDate(s.createdAt)}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push(`/journal/${s.id}`)} activeOpacity={0.85}>
                <Text style={styles.storyTitle}>{s.title}</Text>
                {!!s.coverImage && <Image source={{ uri: s.coverImage }} style={styles.cover} />}
                <Text style={styles.storyMeta}>
                  📍 {s.placesCount} {t('storyPlacesCount')} · 💬 {s.commentsCount} {t('storyCommentsCount')}
                </Text>
              </TouchableOpacity>

              <View style={styles.storyActions}>
                <TouchableOpacity style={styles.readButton} onPress={() => router.push(`/journal/${s.id}`)}>
                  <Text style={styles.readButtonText}>{t('readStory')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileButton} onPress={() => router.push(`/user/${s.author?.id}`)}>
                  <Text style={styles.profileButtonText}>👤 {t('viewProfile')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  hero: { width: '100%', height: 170, borderRadius: 16, marginBottom: 22, backgroundColor: Colors.cream2 },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900, marginBottom: 12 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: -6, marginBottom: 14 },
  officialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.line,
  },
  chevron: { fontSize: 22, color: Colors.brown600 },
  storyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.line,
  },
  storyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  storyName: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
  storyMeta: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginTop: 2 },
  storyTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 16.5, color: Colors.brown900, marginBottom: 10 },
  cover: { width: '100%', height: 190, borderRadius: 12, marginBottom: 10, backgroundColor: Colors.cream2 },
  storyActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  readButton: {
    flex: 1, backgroundColor: Colors.brown900, borderRadius: 12, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  readButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },
  profileButton: {
    flex: 1, borderRadius: 12, height: 40, borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  profileButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },
});
