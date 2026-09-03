import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../constants/theme';
import { fetchTrips } from '../services/tripService';

export default function HomeScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function loadTrips() {
    try {
      const data = await fetchTrips();
      setTrips(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  // Kinukuha ulit ang trips tuwing bumabalik ka sa Home screen
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTrips().finally(() => setLoading(false));
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={{ fontSize: 16 }}>🧭</Text>
        </View>
        <Text style={styles.wordmark}>
          Wander<Text style={styles.wordmarkLight}>Wise</Text>
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brown900} />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.storiesCard}>
              <Text style={styles.storiesTitle}>Your Travel Stories</Text>
              {trips.length === 0 ? (
                <Text style={styles.storiesSubtitle}>
                  No trips yet. Start planning your next adventure!
                </Text>
              ) : (
                <Text style={styles.storiesSubtitle}>
                  You have {trips.length} trip{trips.length > 1 ? 's' : ''} planned.
                </Text>
              )}
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push('/new-trip')}
              >
                <Text style={styles.startButtonText}>+ Start Planning</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.tripCard}
              onPress={() => router.push(`/trip/${item.id}`)}
            >
              <Text style={styles.tripName}>{item.name || 'Untitled Trip'}</Text>
              {item.destination && (
                <Text style={styles.tripDestination}>{item.destination}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  logoBadge: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  wordmarkLight: { fontFamily: 'Lora_400Regular', color: Colors.brown600 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  storiesCard: {
    backgroundColor: Colors.cream2, borderRadius: 18, padding: 20,
    marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: Colors.line,
  },
  storiesTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  storiesSubtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown600,
    marginTop: 6, marginBottom: 16,
  },
  startButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 46,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
  startButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },
  tripCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginBottom: 12,
  },
  tripName: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900 },
  tripDestination: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4,
  },
});