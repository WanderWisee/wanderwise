import AppIcon, { IconLabel } from '../../components/AppIcon';
import { Text, TextInput } from '../../components/Typography';
import { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Linking, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/theme';
import { GUIDE_DESTINATIONS, keywordFor } from '../../constants/destinations';
import { useApp } from '../../context/AppContext';
import { fetchTrips } from '../../services/tripService';
import { isOffline, onOfflineChange } from '../../services/offlineStore';
import { fetchNotifications } from '../../services/userService';
import { geocodeDestination } from '../../services/geoService';
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
  const { top: topInset } = useSafeAreaInsets();
  const router = useRouter();
  const { t, user, prefs } = useApp();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offline, setOfflineState] = useState(isOffline());
  useEffect(() => onOfflineChange(setOfflineState), []);
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
  const visiblePins = tripPins.filter((pin) => trips.some((tr) => tr.destination === pin.label));
  const mapMarkers = visiblePins.length > 0
    ? visiblePins
    : GUIDE_DESTINATIONS.map((d) => ({ latitude: d.lat, longitude: d.lon, label: d.name }));

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topInset, backgroundColor: Colors.white }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        <View style={styles.header}>
          <Wordmark />
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellButton} accessibilityLabel={t('notificationsTitle')}>
            <AppIcon name="bell" style={{ fontSize: 16 }} />
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
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {!!user?.firstName && (
              <Text style={styles.greeting}>
                {t('helloPrefix')} {user.firstName}!
              </Text>
            )}

            {offline && !error && (
              <Text style={styles.offlineNote}>{t('homeOfflineNote')}</Text>
            )}

            {error ? (
              <View style={[styles.continueCard, { paddingVertical: 4 }]}>
                <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
              </View>
            ) : latestTrip ? (
              <>
                <View style={styles.continueHeaderRow}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('continuePlanning')}</Text>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/profile', params: { tab: 'trips' } })}>
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
                <AppIcon name="suitcase" style={{ fontSize: 30 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.startTitle}>{t('noTripsYetStartPlanning')}</Text>
                  <IconLabel trailing name="arrow-right" textStyle={styles.startLink}>{t('startPlanning')}</IconLabel>
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>{t('startExploring')}</Text>
            <OsmMap
              markers={mapMarkers}
              height={190}
              style={{ marginBottom: 8 }}
              numbered={visiblePins.length > 0}
            />
            <Text style={styles.mapCaption}>
              {visiblePins.length > 0 ? t('mapYourTrips') : t('mapTopDestinations')}
            </Text>

            <View style={styles.hotelSearchCard}>
              <Text style={styles.sectionTitle}>{t('discoverGreatPlaces')}</Text>
              <View style={styles.searchField}>
              <AppIcon name="search" size={20} color={Colors.brown600} />
              <TextInput
                style={styles.searchInput}
                accessibilityLabel={t('searchPlaces')}
                placeholder={t('searchPlaces')}
                placeholderTextColor={Colors.brown600}
                value={destination}
                onChangeText={setDestination}
                returnKeyType="search"
                onSubmitEditing={searchHotels}
              />
              </View>
              <TouchableOpacity style={styles.dateRangeField} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
                <AppIcon name="calendar" size={20} color={Colors.brown600} />
                <Text style={[dateRange ? styles.dateRangeText : styles.dateRangePlaceholder, { flex: 1 }]}>
                  {dateRange
                    ? `${formatDate(dateRange.start, prefs.dateFormat)} — ${formatDate(dateRange.end, prefs.dateFormat)}`
                    : t('selectDates')}
                </Text>
                <AppIcon name="chevron-down" size={16} color={Colors.brown600} />
              </TouchableOpacity>
              <View style={styles.travelersRow}>
                <IconLabel name="users" textStyle={styles.travelersLabel}>{t('travelBuddies')}</IconLabel>
                <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setTravelers((n) => Math.max(0, n - 1))}
                  accessibilityLabel={`${t('remove')} ${t('travelBuddies')}`}
                  disabled={travelers === 0}
                >
                  <AppIcon name="minus" style={styles.counterButtonText} />
                </TouchableOpacity>
                <Text accessibilityLabel={t('travelBuddies')} style={styles.counterValue}>{travelers}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setTravelers((n) => n + 1)}
                  accessibilityLabel={`${t('add')} ${t('travelBuddies')}`}
                >
                  <AppIcon name="plus" style={styles.counterButtonText} />
                </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={styles.searchButton} onPress={searchHotels} accessibilityRole="button">
                <IconLabel name="search" textStyle={styles.searchButtonText}>{t('search')}</IconLabel>
              </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  offlineNote: {
    fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600,
    backgroundColor: Colors.white, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10,
    marginBottom: 10, overflow: 'hidden',
  },
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, minHeight: 68, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  bellButton: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxWidth: 560, width: '100%', alignSelf: 'center' },
  greeting: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, lineHeight: 36, letterSpacing: -0.7, color: Colors.brown900, marginBottom: 24 },

  continueHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  seeAllText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.teal, paddingVertical: 10 },
  continueCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, marginBottom: 28,
    borderWidth: 1, borderColor: Colors.line,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  startCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 },
  startTitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown900, lineHeight: 20 },
  startLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: Colors.teal, marginTop: 4 },

  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 26, letterSpacing: -0.3, color: Colors.brown900, marginBottom: 14,
  },
  mapCaption: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600, marginBottom: 24 },

  hotelSearchCard: {
    borderRadius: 20, padding: 20, marginBottom: 28, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.line,
  },
  searchField: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.line, borderRadius: 14, paddingHorizontal: 14, marginBottom: 12 },
  searchInput: {
    flex: 1, minWidth: 0,
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown900,
    paddingVertical: 14,
  },
  dateRangeField: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52,
    backgroundColor: Colors.cream, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12,
  },
  dateRangeText: { fontFamily: 'Poppins_400Regular', fontSize: 13.5, color: Colors.brown900 },
  dateRangePlaceholder: { fontFamily: 'Poppins_400Regular', fontSize: 13.5, color: Colors.brown600 },
  travelersRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  travelersLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.brown600 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  counterButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  counterButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: Colors.brown900 },
  counterValue: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: Colors.brown900, minWidth: 20, textAlign: 'center',
  },
  searchButton: {
    backgroundColor: Colors.brown900, borderRadius: 14, minHeight: 52, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  searchButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.mint },

  horizontalListContent: { gap: 14, paddingRight: 6 },
  destinationCardHorizontal: { width: 200, borderRadius: 20, backgroundColor: Colors.white, overflow: 'hidden', borderWidth: 1, borderColor: Colors.line },
  destinationImage: {
    width: '100%', height: 140, marginBottom: 14, backgroundColor: Colors.cream2,
  },
  destinationName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 22, color: Colors.brown900, marginBottom: 12, paddingHorizontal: 14 },
  itineraryButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, minHeight: 44,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 14, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 10,
  },
  itineraryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.mint },

  bookingCardHorizontal: {
    width: 160, height: 90, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  bookingCardText: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: '#FFFFFF' },
});
