import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, RefreshControl, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';
import { GUIDE_DESTINATIONS, keywordFor } from '../../constants/destinations';
import { useApp } from '../../context/AppContext';
import { fetchTrips } from '../../services/tripService';
import { fetchNotifications } from '../../services/userService';
import { geocodeDestination } from '../../services/geoService';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';
import TripListItem from '../../components/TripListItem';
import OsmMap from '../../components/OsmMap';
import CalendarPicker, { formatDate } from '../../components/CalendarPicker';
import { ErrorState, Loading, Wordmark } from '../../components/ui';
import { partsToISO } from '../../utils/dates';

const BOOKING_SITES = [
  { name: 'klook', url: 'https://www.klook.com', bg: '#FF5722', color: '#FFFFFF' },
  { name: 'airbnb', url: 'https://www.airbnb.com', bg: '#FF5A63', color: '#FFFFFF' },
  { name: 'agoda', url: 'https://www.agoda.com', bg: '#FFFFFF', color: '#555555', bordered: true },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t, user } = useApp();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [tripPins, setTripPins] = useState([]);

  const [travelers, setTravelers] = useState(0);
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function load() {
    try {
      const data = await fetchTrips();
      setTrips(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    fetchNotifications()
      .then((list) => setUnread(list.filter((n) => !n.isRead).length))
      .catch(() => {});
  }

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [])
  );

  // Mga pin sa mapa: ang mga destination ng sariling trips (hanggang 6).
  useEffect(() => {
    let alive = true;
    const names = [...new Set(trips.map((tr) => tr.destination).filter(Boolean))].slice(0, 6);
    if (names.length === 0) {
      setTripPins([]);
      return;
    }
    (async () => {
      const pins = [];
      for (const name of names) {
        const known = GUIDE_DESTINATIONS.find(
          (d) => name.toLowerCase().includes(keywordFor(d.name).toLowerCase())
        );
        const coords = known ? { latitude: known.lat, longitude: known.lon } : await geocodeDestination(name);
        if (coords) pins.push({ ...coords, label: name });
      }
      if (alive) setTripPins(pins);
    })();
    return () => {
      alive = false;
    };
  }, [trips]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function searchHotels() {
    router.push({
      pathname: '/(tabs)/hotels',
      params: {
        search: destination.trim(),
        startDate: dateRange ? partsToISO(dateRange.start) : '',
        endDate: dateRange ? partsToISO(dateRange.end) : '',
        buddies: String(travelers),
      },
    });
  }

  function openGuide(destName) {
    router.push({ pathname: '/guide/[id]', params: { id: keywordFor(destName), title: destName } });
  }

  const latestTrip = trips[0];
  const mapMarkers = tripPins.length > 0
    ? tripPins
    : GUIDE_DESTINATIONS.map((d) => ({ latitude: d.lat, longitude: d.lon, label: d.name }));

  return (
    <LinearGradient colors={['#F6F1DC', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

        <View style={styles.header}>
          <Wordmark />
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellButton} accessibilityLabel={t('notificationsTitle')}>
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <Loading />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            keyboardShouldPersistTaps="handled"
          >
            {!!user?.firstName && (
              <Text style={styles.greeting}>
                {t('helloPrefix')} {user.firstName}! 👋
              </Text>
            )}

            {error ? (
              <View style={[styles.continueCard, { paddingVertical: 4 }]}>
                <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
              </View>
            ) : latestTrip ? (
              <>
                <View style={styles.continueHeaderRow}>
                  <Text style={styles.sectionTitle}>{t('continuePlanning')}</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                    <Text style={styles.seeAllText}>{t('seeAll')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.continueCard}>
                  <TripListItem
                    trip={latestTrip}
                    onPress={() => router.push(`/trip/${latestTrip.id}`)}
                    showActions={false}
                  />
                </View>
              </>
            ) : (
              <TouchableOpacity style={[styles.continueCard, styles.startCard]} onPress={() => router.push('/new-trip')} activeOpacity={0.8}>
                <Text style={{ fontSize: 30 }}>🧳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.startTitle}>{t('noTripsYetStartPlanning')}</Text>
                  <Text style={styles.startLink}>{t('startPlanning')} →</Text>
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>{t('startExploring')}</Text>
            <OsmMap
              markers={mapMarkers}
              height={190}
              style={{ marginBottom: 8 }}
              numbered={tripPins.length > 0}
            />
            <Text style={styles.mapCaption}>
              {tripPins.length > 0 ? t('mapYourTrips') : t('mapTopDestinations')}
            </Text>

            <View style={styles.hotelSearchCard}>
              <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
              <Text style={styles.sectionTitle}>{t('discoverGreatPlaces')}</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchPlaces')}
                placeholderTextColor={Colors.brown600}
                value={destination}
                onChangeText={setDestination}
                returnKeyType="search"
                onSubmitEditing={searchHotels}
              />
              <TouchableOpacity style={styles.dateRangeField} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
                <Text style={dateRange ? styles.dateRangeText : styles.dateRangePlaceholder}>
                  {dateRange
                    ? `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`
                    : t('selectDates')}
                </Text>
              </TouchableOpacity>
              <View style={styles.travelersRow}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setTravelers((n) => Math.max(0, n - 1))}
                  accessibilityLabel="−"
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{travelers}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setTravelers((n) => n + 1)}
                  accessibilityLabel="+"
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchButton} onPress={searchHotels}>
                  <Text style={styles.searchButtonText}>{t('search')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>{t('topDestinations')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
              style={{ marginBottom: 24 }}
            >
              {GUIDE_DESTINATIONS.map((dest) => (
                <TouchableOpacity key={dest.name} style={styles.destinationCardHorizontal} onPress={() => openGuide(dest.name)} activeOpacity={0.85}>
                  <Image source={dest.image} style={styles.destinationImage} />
                  <Text style={styles.destinationName} numberOfLines={1}>{dest.name}</Text>
                  <View style={styles.itineraryButton}>
                    <Text style={styles.itineraryButtonText}>{t('seeItineraries')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>{t('bookOnAnotherSite')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
            >
              {BOOKING_SITES.map((site) => (
                <TouchableOpacity
                  key={site.name}
                  style={[
                    styles.bookingCardHorizontal,
                    { backgroundColor: site.bg },
                    site.bordered && { borderWidth: 1, borderColor: Colors.line },
                  ]}
                  onPress={() => Linking.openURL(site.url)}
                >
                  <Text style={[styles.bookingCardText, { color: site.color }]}>{site.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>
        )}

        <CalendarPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={setDateRange}
          initialRange={dateRange}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  bellButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontFamily: 'Lora_600SemiBold', fontSize: 10, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  greeting: { fontFamily: 'Lora_600SemiBold', fontSize: 24, color: Colors.brown900, marginBottom: 18 },

  continueHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  seeAllText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900, textDecorationLine: 'underline' },
  continueCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, marginBottom: 26,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  startCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 },
  startTitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900, lineHeight: 20 },
  startLink: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint, marginTop: 4 },

  sectionTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900, marginBottom: 14,
  },
  mapCaption: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginBottom: 24 },

  hotelSearchCard: {
    borderRadius: 16, padding: 20, marginBottom: 30, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  searchInput: {
    zIndex: 1,
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(43,28,18,0.25)',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  dateRangeField: {
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(43,28,18,0.25)',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  dateRangeText: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown900 },
  dateRangePlaceholder: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown600 },
  travelersRow: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 1 },
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

  horizontalListContent: { gap: 14, paddingRight: 6 },
  destinationCardHorizontal: { width: 200 },
  destinationImage: {
    width: 200, height: 160, borderRadius: 12, marginBottom: 10, backgroundColor: Colors.cream2,
  },
  destinationName: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 10 },
  itineraryButton: {
    backgroundColor: Colors.brown900, borderRadius: 20, height: 40,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 20,
  },
  itineraryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },

  bookingCardHorizontal: {
    width: 160, height: 90, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  bookingCardText: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: '#FFFFFF' },
});
