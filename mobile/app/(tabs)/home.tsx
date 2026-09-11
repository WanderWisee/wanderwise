import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';
import { fetchTrips } from '../../services/tripService';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';

const TOP_DESTINATIONS = [
  { name: 'Tokyo, Japan', emoji: '🗼' },
  { name: 'Bali, Indonesia', emoji: '🌴' },
  { name: 'Paris, France', emoji: '🗼' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [travelers, setTravelers] = useState(0);
  const [destination, setDestination] = useState('');

  async function loadTrips() {
    try {
      const data = await fetchTrips();
      setTrips(data);
    } catch (e) {
      setTrips([]);
    }
  }

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

  function openBookingSite(url) {
    Linking.openURL(url);
  }

  return (
    <LinearGradient colors={['#F6F1DC', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
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

            <Text style={styles.sectionTitle}>Start Exploring</Text>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Map</Text>
            </View>

            {/* Glassmorphism card — now with real curves/blobs behind it to blur */}
            <BlurView intensity={45} tint="light" style={styles.hotelSearchCard}>
              <Text style={styles.sectionTitle}>Discover your great places to stay!</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search Places"
                placeholderTextColor={Colors.brown600}
                value={destination}
                onChangeText={setDestination}
              />
              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.dateInputText}>Start Date</Text>
                </View>
                <View style={styles.dateInput}>
                  <Text style={styles.dateInputText}>End Date</Text>
                </View>
              </View>
              <View style={styles.travelersRow}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setTravelers((n) => Math.max(0, n - 1))}
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{travelers}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setTravelers((n) => n + 1)}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => router.push('/(tabs)/hotels')}
                >
                  <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Top Destinations</Text>
            {TOP_DESTINATIONS.map((dest) => (
              <View key={dest.name} style={styles.destinationCard}>
                <View style={styles.destinationImagePlaceholder}>
                  <Text style={{ fontSize: 40 }}>{dest.emoji}</Text>
                </View>
                <Text style={styles.destinationName}>{dest.name}</Text>
                <TouchableOpacity style={styles.itineraryButton}>
                  <Text style={styles.itineraryButtonText}>See Itineraries</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 6 }]}>
              Book your trip on another booking site!
            </Text>
            <TouchableOpacity
              style={[styles.bookingCard, { backgroundColor: '#FF5722' }]}
              onPress={() => openBookingSite('https://www.klook.com')}
            >
              <Text style={styles.bookingCardText}>klook</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookingCard, { backgroundColor: '#FF5A63' }]}
              onPress={() => openBookingSite('https://www.airbnb.com')}
            >
              <Text style={styles.bookingCardText}>airbnb</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookingCard, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line }]}
              onPress={() => openBookingSite('https://www.agoda.com')}
            >
              <Text style={[styles.bookingCardText, { color: '#555' }]}>agoda</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  storiesCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 20,
    marginTop: 12, marginBottom: 24,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  storiesTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  storiesSubtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown900,
    marginTop: 6, marginBottom: 16,
  },
  startButton: {
    backgroundColor: Colors.brown900, borderRadius: 20, height: 42,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
  startButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },

  sectionTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900, marginBottom: 14,
  },
  mapPlaceholder: {
    height: 180, backgroundColor: '#FFFFFF', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  mapPlaceholderText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },

  hotelSearchCard: {
    borderRadius: 16, padding: 20, marginBottom: 30, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  searchInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(43,28,18,0.25)',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(43,28,18,0.25)', paddingHorizontal: 14, paddingVertical: 12,
  },
  dateInputText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
  travelersRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterButton: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  counterButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  counterValue: {
    fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, minWidth: 20, textAlign: 'center',
  },
  searchButton: {
    flex: 1, backgroundColor: Colors.brown900, borderRadius: 10, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  searchButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },

  destinationCard: {
    marginBottom: 22,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  destinationImagePlaceholder: {
    height: 160, backgroundColor: '#FFFFFF', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  destinationName: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 10 },
  itineraryButton: {
    backgroundColor: Colors.brown900, borderRadius: 20, height: 40,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 20,
  },
  itineraryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },

  bookingCard: {
    height: 90, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  bookingCardText: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: '#FFFFFF' },
});