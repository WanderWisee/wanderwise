import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, Linking, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';
import { HOTEL_DESTINATIONS } from '../../constants/destinations';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import {
  createBooking, deleteBooking, fetchMyBookings, fetchTripBookings, fetchTrips,
} from '../../services/tripService';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';
import CalendarPicker, { formatDate as formatParts } from '../../components/CalendarPicker';
import { ChoiceChips, PrimaryButton, Wordmark } from '../../components/ui';
import { partsToISO, rangeFromISO } from '../../utils/dates';

// Parehong HotelsPage ng web: walang sariling hotel database ang
// WanderWise — ang paghahanap ay bubukas sa Google Maps / Agoda / Klook
// (totoong resulta), at ang mga na-book ay itinatala sa trip para lumabas
// sa itinerary ng buong crew.

const BOOKING_SITES = ['Agoda', 'Klook', 'Booking.com', 'Airbnb', 'Traveloka'];

const googleMapsHotelUrl = (dest) => `https://www.google.com/maps/search/${encodeURIComponent(`hotels in ${dest}`)}`;
const agodaUrl = (dest, start, end) =>
  `https://www.agoda.com/search?text=${encodeURIComponent(dest)}&checkIn=${start || ''}&checkOut=${end || ''}`;
const klookUrl = (dest) => `https://www.klook.com/search/result/?query=${encodeURIComponent(dest)}`;

export default function HotelsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, formatDate } = useApp();
  const { alert, confirm, toast } = useDialog();

  // "Trip mode": binuksan mula sa "Book a hotel" ng isang trip.
  const tripMode = params.tripId
    ? {
        id: String(params.tripId),
        destination: String(params.destination || ''),
        startDate: String(params.startDate || ''),
        endDate: String(params.endDate || ''),
      }
    : null;

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [travelers, setTravelers] = useState(0);
  const [pickerFor, setPickerFor] = useState(null); // 'search' | 'booking'
  const [optionsFor, setOptionsFor] = useState(null); // destination na hinahanap

  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState({ tripId: null, placeName: '', bookingSite: 'Agoda', confirmationNumber: '', range: null });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Kunin ang mga value na ipinasa ng Home o ng Trip.
  useEffect(() => {
    setSearch(String(params.search || params.destination || ''));
    setDateRange(rangeFromISO(String(params.startDate || ''), String(params.endDate || '')));
    if (params.buddies) setTravelers(Number(params.buddies) || 0);
    setForm((f) => ({
      ...f,
      tripId: tripMode ? tripMode.id : f.tripId,
      range: rangeFromISO(String(params.startDate || ''), String(params.endDate || '')),
    }));
    // Kapag galing sa Home na may laman ang search, buksan agad ang mga pagpipilian.
    if (!params.tripId && params.search) setOptionsFor(String(params.search));
  }, [params.search, params.startDate, params.endDate, params.buddies, params.tripId]);

  const loadBookings = useCallback(async () => {
    try {
      setBookings(tripMode ? await fetchTripBookings(tripMode.id) : await fetchMyBookings());
    } catch {
      setBookings([]);
    }
    if (!tripMode) fetchTrips().then(setTrips).catch(() => setTrips([]));
  }, [tripMode?.id]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  function handleSearch() {
    const q = search.trim();
    if (!q) {
      alert(t('hotelsTellUsWhereToGo'));
      return;
    }
    setOptionsFor(q);
  }

  function openSite(kind) {
    const dest = optionsFor;
    const start = dateRange ? partsToISO(dateRange.start) : '';
    const end = dateRange ? partsToISO(dateRange.end) : '';
    setOptionsFor(null);
    if (kind === 'maps') Linking.openURL(googleMapsHotelUrl(dest));
    if (kind === 'agoda') Linking.openURL(agodaUrl(dest, start, end));
    if (kind === 'klook') Linking.openURL(klookUrl(dest));
  }

  async function saveBooking() {
    setFormError('');
    const placeName = form.placeName.trim();
    const tripId = tripMode ? tripMode.id : form.tripId;
    if (!tripId) {
      setFormError(t('bookingPickTrip'));
      return;
    }
    if (!placeName || !form.range) {
      setFormError(t('bookingErrRequired'));
      return;
    }
    setSaving(true);
    try {
      await createBooking(tripId, {
        placeName,
        bookingSite: form.bookingSite,
        confirmationNumber: form.confirmationNumber.trim(),
        checkIn: partsToISO(form.range.start),
        checkOut: partsToISO(form.range.end),
      });
      setForm((f) => ({ ...f, placeName: '', confirmationNumber: '' }));
      toast(t('bookingSaved'));
      loadBookings();
    } catch (e) {
      setFormError(e.message || t('networkError'));
    } finally {
      setSaving(false);
    }
  }

  async function removeBooking(b) {
    const ok = await confirm({
      title: t('deleteBookingTitle'),
      message: t('confirmDeleteBooking'),
      confirmLabel: t('dialogDelete'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteBooking(tripMode ? tripMode.id : b.tripId, b.id);
      setBookings((prev) => prev.filter((x) => x.id !== b.id));
    } catch (e) {
      if (e.status === 404) setBookings((prev) => prev.filter((x) => x.id !== b.id));
      else toast(e.message);
    }
  }

  const bookingLine = (b) =>
    [b.bookingSite, b.confirmationNumber ? `#${b.confirmationNumber}` : null,
      `${formatDate(b.checkIn, 'short')}${b.checkOut ? ` → ${formatDate(b.checkOut, 'short')}` : ''}`]
      .filter(Boolean)
      .join(' · ');

  return (
    <LinearGradient colors={['#F6F1DC', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

        <View style={styles.header}>
          <Wordmark />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tripMode && (
            <View style={styles.tripBanner}>
              <Text style={styles.tripBannerText}>
                {t('hotelsForTrip')} <Text style={{ fontFamily: 'Lora_600SemiBold' }}>{t('tripToPrefix')} {tripMode.destination}</Text>
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => router.push(`/trip/${tripMode.id}`)}>
                  <Text style={styles.tripBannerLink}>← {t('backToTrip')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.setParams({ tripId: '', destination: '', startDate: '', endDate: '', search: '' })}
                >
                  <Text style={styles.tripBannerLink}>{t('showAllBookings')} ✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.pageTitle}>{t('hotelsHeroTitle')}</Text>
          <Text style={styles.pageSubtitle}>{t('hotelsHeroSubtitle')}</Text>

          <View style={styles.inputWrap}>
            <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('hotelsSearchPlaceholder')}
              placeholderTextColor={Colors.brown600}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>

          <TouchableOpacity style={styles.inputWrap} onPress={() => setPickerFor('search')} activeOpacity={0.7}>
            <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Text style={dateRange ? styles.dateRangeText : styles.dateRangePlaceholder}>
              {dateRange ? `${formatParts(dateRange.start)} — ${formatParts(dateRange.end)}` : t('selectDates')}
            </Text>
          </TouchableOpacity>

          <View style={styles.counterRow}>
            <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Text style={styles.counterLabel}>{t('travelBuddies')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, zIndex: 1 }}>
              <TouchableOpacity style={styles.counterButton} onPress={() => setTravelers((n) => Math.max(0, n - 1))}>
                <Text style={styles.counterButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{travelers}</Text>
              <TouchableOpacity style={styles.counterButton} onPress={() => setTravelers((n) => n + 1)}>
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>{t('search')}</Text>
          </TouchableOpacity>

          {/* ===== Destinations ===== */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#C9D9C4' }]}>
              <Text style={{ fontSize: 14 }}>🏨</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('hotelsDestinationsTitle')}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalListContent} style={{ marginBottom: 30 }}>
            {HOTEL_DESTINATIONS.map((dest) => (
              <View key={dest.name} style={styles.resultCard}>
                <Image source={dest.image} style={styles.resultImage} />
                <View style={styles.resultBody}>
                  <Text style={styles.hotelName}>{dest.name}</Text>
                  <Text style={styles.hotelAmenities}>{t('hotelsCaption')}</Text>
                  <TouchableOpacity style={styles.dealButton} onPress={() => setOptionsFor(dest.name)}>
                    <Text style={styles.dealButtonText}>{t('viewDeals')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          {/* ===== Record a booking ===== */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#F4D9A8' }]}>
              <Text style={{ fontSize: 14 }}>🧾</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('recordYourBooking')}</Text>
          </View>
          <Text style={styles.hint}>{t('recordBookingHint')}</Text>

          <View style={styles.formCard}>
            {!tripMode && (
              <>
                <Text style={styles.formLabel}>{t('bookingForTrip')}</Text>
                {trips.length === 0 ? (
                  <Text style={styles.hint}>{t('noTripsYetPlanOne')}</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <ChoiceChips
                      style={{ flexWrap: 'nowrap' }}
                      options={trips.map((tr) => ({ value: String(tr.id), label: tr.destination || tr.title || t('untitledTrip') }))}
                      value={form.tripId ? String(form.tripId) : null}
                      onChange={(v) => {
                        const tr = trips.find((x) => String(x.id) === v);
                        setForm((f) => ({
                          ...f,
                          tripId: v,
                          range: f.range || (tr ? rangeFromISO(tr.startDate, tr.endDate) : null),
                        }));
                      }}
                    />
                  </ScrollView>
                )}
              </>
            )}

            <Text style={styles.formLabel}>{t('bookingPlaceName')}</Text>
            <TextInput
              style={styles.formInput}
              placeholder={t('bookingPlaceNamePlaceholder')}
              placeholderTextColor={Colors.placeholder}
              value={form.placeName}
              onChangeText={(v) => setForm((f) => ({ ...f, placeName: v }))}
            />

            <Text style={styles.formLabel}>{t('bookingSite')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <ChoiceChips
                style={{ flexWrap: 'nowrap' }}
                options={BOOKING_SITES.map((s) => ({ value: s, label: s }))}
                value={form.bookingSite}
                onChange={(v) => setForm((f) => ({ ...f, bookingSite: v }))}
              />
            </ScrollView>

            <Text style={styles.formLabel}>{t('bookingConfirmationNumber')}</Text>
            <TextInput
              style={styles.formInput}
              placeholder="ABC123"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="characters"
              value={form.confirmationNumber}
              onChangeText={(v) => setForm((f) => ({ ...f, confirmationNumber: v }))}
            />

            <Text style={styles.formLabel}>
              {t('bookingCheckIn')} — {t('bookingCheckOut')}
            </Text>
            <TouchableOpacity style={styles.formInput} onPress={() => setPickerFor('booking')} activeOpacity={0.7}>
              <Text style={form.range ? styles.dateRangeText : styles.dateRangePlaceholder}>
                {form.range ? `${formatParts(form.range.start)} — ${formatParts(form.range.end)}` : t('selectDates')}
              </Text>
            </TouchableOpacity>

            {!!formError && <Text style={styles.errorText}>{formError}</Text>}
            <PrimaryButton label={t('save')} onPress={saveBooking} loading={saving} style={{ marginTop: 4 }} />
          </View>

          {/* ===== Bookings ===== */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#B8D4D9' }]}>
              <Text style={{ fontSize: 14 }}>🛏️</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('yourBookings')}</Text>
          </View>
          {bookings.length === 0 ? (
            <Text style={[styles.hint, { marginBottom: 26 }]}>{t('noBookingsAnywhere')}</Text>
          ) : (
            <View style={{ marginBottom: 26 }}>
              {bookings.map((b) => (
                <View key={b.id} style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingName}>🏨 {b.placeName}</Text>
                    <Text style={styles.bookingMeta}>{bookingLine(b)}</Text>
                    {!tripMode && !!b.tripDestination && (
                      <TouchableOpacity onPress={() => router.push(`/trip/${b.tripId}`)}>
                        <Text style={styles.bookingTrip}>{t('tripToPrefix')} {b.tripDestination} ›</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeBooking(b)} hitSlop={8} accessibilityLabel={t('dialogDelete')}>
                    <Text style={{ fontSize: 16 }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </ScrollView>

        <CalendarPicker
          visible={!!pickerFor}
          onClose={() => setPickerFor(null)}
          onConfirm={(range) => {
            if (pickerFor === 'booking') setForm((f) => ({ ...f, range }));
            else setDateRange(range);
          }}
          initialRange={pickerFor === 'booking' ? form.range : dateRange}
        />

        {/* Saan maghahanap */}
        <Modal visible={!!optionsFor} transparent animationType="slide" onRequestClose={() => setOptionsFor(null)}>
          <Pressable style={styles.overlay} onPress={() => setOptionsFor(null)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>{t('hotelsAndLodging')} — {optionsFor}</Text>
              {!dateRange && <Text style={styles.sheetHint}>{t('hotelsSelectDatesFirst')}</Text>}
              <TouchableOpacity style={styles.sheetRow} onPress={() => openSite('maps')}>
                <Text style={styles.sheetIcon}>🗺️</Text>
                <Text style={styles.sheetLabel}>{t('viewHotelsOnGoogleMaps')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => openSite('agoda')}>
                <Text style={styles.sheetIcon}>🔗</Text>
                <Text style={styles.sheetLabel}>{t('searchOnAgoda')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => openSite('klook')}>
                <Text style={styles.sheetIcon}>🔗</Text>
                <Text style={styles.sheetLabel}>{t('searchOnKlook')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40 },
  tripBanner: {
    backgroundColor: Colors.brown900, borderRadius: 14, padding: 14, marginBottom: 18, gap: 6,
  },
  tripBannerText: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: '#FFFFFF' },
  tripBannerLink: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },
  pageTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 24, color: Colors.brown900 },
  pageSubtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown600,
    marginTop: 6, marginBottom: 20,
  },
  inputWrap: {
    borderRadius: 10, overflow: 'hidden', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  searchInput: { zIndex: 1, fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900, padding: 0 },
  dateRangeText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900, zIndex: 1 },
  dateRangePlaceholder: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600, zIndex: 1 },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 12,
  },
  counterLabel: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600, zIndex: 1 },
  counterButton: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 8,
  },
  counterButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900 },
  counterValue: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900, minWidth: 20, textAlign: 'center' },
  searchButton: {
    height: 48, borderRadius: 10, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', marginBottom: 30,
  },
  searchButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900, flex: 1 },
  hint: { fontFamily: 'Lora_400Regular', fontSize: 12.5, lineHeight: 18, color: Colors.brown600, marginBottom: 12 },
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 30,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  formLabel: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600, marginBottom: 6 },
  formInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 10, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  errorText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.error, marginBottom: 10 },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  bookingName: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },
  bookingMeta: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginTop: 3 },
  bookingTrip: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.mint, marginTop: 4 },
  horizontalListContent: { gap: 14, paddingRight: 6, paddingBottom: 6 },
  resultCard: {
    width: 240,
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  resultImage: { width: 240, height: 140, backgroundColor: Colors.cream2 },
  resultBody: { padding: 16 },
  hotelName: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900, marginBottom: 6 },
  hotelAmenities: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginBottom: 12 },
  dealButton: {
    backgroundColor: Colors.brown900, borderRadius: 10, paddingHorizontal: 16, height: 38,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  dealButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },
  overlay: { flex: 1, backgroundColor: 'rgba(46,27,14,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900, marginBottom: 6 },
  sheetHint: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600, marginBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.line },
  sheetIcon: { fontSize: 18, width: 24 },
  sheetLabel: { fontFamily: 'Lora_400Regular', fontSize: 15, color: Colors.brown900 },
});
