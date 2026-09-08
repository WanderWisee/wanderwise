import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/theme';
import { fetchTrips } from '../../services/tripService';

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
      // Tahimik lang tayo dito — hindi natin gustong harangan ang buong Home
      // screen ng error kung offline o wala pang backend.
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Your Travel Stories */}
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

          {/* Start Exploring (Map) */}
          <Text style={styles.sectionTitle}>Start Exploring</Text>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>Map</Text>
          </View>

          {/* Hotel search bar */}
          <View style={styles.hotelSearchCard}>
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
                <Text style={styles.counterButtonText}>-</Text>
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
                onPress={() => router.push('/hotels')}
              >
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Top Destinations */}
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Top Destinations</Text>
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

          {/* Booking sites */}
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
            Book your trip on another booking site!
          </Text>
          <TouchableOpacity
            style={[styles.bookingCard, { backgroundColor: '#F5751E' }]}
            onPress={() => openBookingSite('https://www.klook.com')}
          >
            <Text style={styles.bookingCardText}>klook</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookingCard, { backgroundColor: '#FF5A5F' }]}
            onPress={() => openBookingSite('https://www.airbnb.com')}
          >
            <Text style={styles.bookingCardText}>airbnb</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookingCard, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line }]}
            onPress={() => openBookingSite('https://www.agoda.com')}
          >
            <Text style={[styles.bookingCardText, { color: Colors.brown900 }]}>agoda</Text>
          </TouchableOpacity>
        </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

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

  sectionTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900, marginBottom: 12,
  },
  mapPlaceholder: {
    height: 180, backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  mapPlaceholderText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },

  hotelSearchCard: {
    backgroundColor: Colors.cream2, borderRadius: 18, padding: 18,
    marginBottom: 30, borderWidth: 1, borderColor: Colors.line,
  },
  searchInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: Colors.cream, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateInput: {
    flex: 1, backgroundColor: Colors.cream, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 14, paddingVertical: 12,
  },
  dateInputText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
  travelersRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterButton: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.cream,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  counterButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  counterValue: {
    fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, minWidth: 20, textAlign: 'center',
  },
  searchButton: {
    flex: 1, backgroundColor: Colors.brown900, borderRadius: 12, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  searchButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },

  destinationCard: { marginBottom: 20 },
  destinationImagePlaceholder: {
    height: 160, backgroundColor: Colors.cream2, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: Colors.line,
  },
  destinationName: {
    fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 10,
  },
  itineraryButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  itineraryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },

  bookingCard: {
    height: 90, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  bookingCardText: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: '#FFFFFF' },
});