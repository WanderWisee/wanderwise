import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { fetchPublicProfile, fullName } from '../../services/userService';
import Backdrop from '../../components/Backdrop';
import { Avatar, DestinationImage, EmptyState, ErrorState, Loading, ScreenHeader } from '../../components/ui';

// Profile ng ibang estudyante (mula sa Guides o sa search). Read-only.
export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t, user } = useApp();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('journal');

  async function load() {
    setError(null);
    try {
      setProfile(await fetchPublicProfile(id));
    } catch (e) {
      setError(e.status === 404 ? t('studentNotFound') : e.message);
    }
  }

  useEffect(() => {
    if (user && String(user.userId) === String(id)) {
      router.replace('/(tabs)/profile');
      return;
    }
    load();
  }, [id]);

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={200} style={styles.backdrop} />
      <ScreenHeader title="" onBack={() => router.back()} />

      {error ? (
        <ErrorState message={error} onRetry={load} retryLabel={t('tryAgain')} />
      ) : !profile ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <Avatar person={profile} size={88} style={{ marginBottom: 12 }} />
            <Text style={styles.name}>{fullName(profile, t('unnamedStudent'))}</Text>
            <Text style={styles.muted}>{profile.bio || t('noBioYet')}</Text>
            <Text style={styles.muted}>📍 {profile.location || t('locationNotSet')}</Text>

            <View style={styles.statsRow}>
              <Stat value={profile.tripsCount} label={t('trips')} />
              <View style={styles.statDivider} />
              <Stat value={profile.journalPostsCount} label={t('journalPosts')} />
              <View style={styles.statDivider} />
              <Stat value={profile.placesVisitedCount} label={t('placesVisited')} />
            </View>
          </View>

          <View style={styles.tabRow}>
            {[
              { key: 'journal', label: `📖 ${t('journal')}` },
              { key: 'trips', label: `📍 ${t('trips').charAt(0).toUpperCase()}${t('trips').slice(1)}` },
            ].map((item) => (
              <TouchableOpacity key={item.key} style={styles.tabButton} onPress={() => setTab(item.key)}>
                <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
                {tab === item.key && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'journal' ? (
            profile.journalEntries.length === 0 ? (
              <EmptyState icon="📖" title={t('noJournalPostsYet')} />
            ) : (
              <View style={styles.grid}>
                {profile.journalEntries.map((j) => (
                  <TouchableOpacity key={j.id} style={styles.gridCard} onPress={() => router.push(`/journal/${j.id}`)} activeOpacity={0.85}>
                    {j.coverImage ? (
                      <Image source={{ uri: j.coverImage }} style={styles.gridImage} />
                    ) : (
                      <View style={[styles.gridImage, styles.center]}>
                        <Text style={{ fontSize: 30 }}>📖</Text>
                      </View>
                    )}
                    <Text style={styles.gridTitle} numberOfLines={2}>{j.title || t('untitled')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : profile.trips.length === 0 ? (
            <EmptyState icon="🧳" title={t('noTripsYet')} />
          ) : (
            profile.trips.map((trip) => (
              <View key={trip.id} style={styles.tripRow}>
                <DestinationImage name={trip.destination} style={styles.tripThumb} emojiSize={22} />
                <Text style={styles.tripTitle} numberOfLines={1}>
                  {trip.title || `${t('tripToPrefix')} ${trip.destination}`}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', marginBottom: 20 },
  name: { fontFamily: 'Lora_600SemiBold', fontSize: 21, color: Colors.brown900 },
  muted: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 20 },
  statValue: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  statLabel: { fontFamily: 'Lora_400Regular', fontSize: 11, color: Colors.brown600, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.line },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.line, marginBottom: 18 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600 },
  tabTextActive: { fontFamily: 'Lora_600SemiBold', color: Colors.brown900 },
  tabUnderline: { position: 'absolute', bottom: -1, height: 2, width: '55%', backgroundColor: Colors.brown900 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  gridCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.line },
  gridImage: { width: '100%', height: 120, backgroundColor: Colors.cream2 },
  gridTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900, padding: 10 },
  tripRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  tripThumb: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden' },
  tripTitle: { flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
});
