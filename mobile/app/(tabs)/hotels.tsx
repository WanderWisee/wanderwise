import AppIcon, { IconLabel } from '../../components/AppIcon';
import { Text, TextInput } from '../../components/Typography';
import { useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Image, Linking, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { HOTEL_DESTINATIONS } from '../../constants/destinations';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import {
  createBooking, deleteBooking, fetchMyBookings, fetchTripBookings, fetchTrips, fetchTripById,
} from '../../services/tripService';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';
import CalendarPicker, { formatDate as formatParts } from '../../components/CalendarPicker';
import { ChoiceChips, PrimaryButton, Wordmark, ErrorState } from '../../components/ui';
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
  const params = useLocalSearchParams();
  return <HotelsContent key={JSON.stringify([params.tripId, params.destination, params.search, params.startDate, params.endDate, params.buddies])} params={params} />;
}

function HotelsContent({ params }) {
  const router = useRouter();
  const { t, formatDate, prefs } = useApp();
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

  const [search, setSearch] = useState(String(params.search || params.destination || ''));
  const [dateRange, setDateRange] = useState(() => rangeFromISO(String(params.startDate || ''), String(params.endDate || '')));
  const [travelers, setTravelers] = useState(Number(params.buddies) || 0);
  const [pickerFor, setPickerFor] = useState(null); // 'search' | 'booking'
  const [optionsFor, setOptionsFor] = useState(!params.tripId && params.search ? String(params.search) : null); // destination na hinahanap

  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState({ tripId: tripMode?.id || null, placeName: '', bookingSite: 'Agoda', confirmationNumber: '', range: rangeFromISO(String(params.startDate || ''), String(params.endDate || '')) });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tripRole, setTripRole] = useState('viewer');

  const tripModeId = tripMode?.id;
  const loadBookings = useCallback(async () => {
    try {
      setBookings(tripModeId ? await fetchTripBookings(tripModeId) : await fetchMyBookings());
      if (tripModeId) setTripRole((await fetchTripById(tripModeId)).myRole || 'viewer');
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
    if (!tripModeId) fetchTrips().then(setTrips).catch((e) => setLoadError(e.message));
  }, [tripModeId]);

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
    if (saving) return;
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
      const detail = await fetchTripById(tripId);
      if (!['owner', 'editor'].includes(detail.myRole)) { setFormError(t('viewOnlyNotice')); return; }
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
    if (tripMode && !['owner', 'editor'].includes(tripRole)) { toast(t('viewOnlyNotice')); return; }
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
    <LinearGradient colors={['#F7F4EA', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

        <View style={styles.header}>
          <Wordmark />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {tripMode && (
            <View style={styles.tripBanner}>
              <Text style={styles.tripBannerText}>
                {t('hotelsForTrip')} <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>{t('tripToPrefix')} {tripMode.destination}</Text>
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => router.push(`/trip/${tripMode.id}`)}>
                  <IconLabel name="arrow-left" textStyle={styles.tripBannerLink}>{t('backToTrip')}</IconLabel>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.setParams({ tripId: '', destination: '', startDate: '', endDate: '', search: '' })}
                >
                  <IconLabel trailing name="x" textStyle={styles.tripBannerLink}>{t('showAllBookings')}</IconLabel>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.pageTitle}>{t('hotelsHeroTitle')}</Text>
          <Text style={styles.pageSubtitle}>{t('hotelsHeroSubtitle')}</Text>

          <View style={styles.inputWrap}>
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
            <Text style={dateRange ? styles.dateRangeText : styles.dateRangePlaceholder}>
              {dateRange ? `${formatParts(dateRange.start, prefs.dateFormat)} — ${formatParts(dateRange.end, prefs.dateFormat)}` : t('selectDates')}
            </Text>
          </TouchableOpacity>

          <View style={styles.counterRow}>
            <Text style={styles.counterLabel}>{t('travelBuddies')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 }}>
              <TouchableOpacity style={styles.counterButton} disabled={travelers === 0} accessibilityLabel={`${t('remove')} ${t('travelBuddies')}`} onPress={() => setTravelers((n) => Math.max(0, n - 1))}>
                <AppIcon name="minus" style={styles.counterButtonText} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{travelers}</Text>
              <TouchableOpacity style={styles.counterButton} accessibilityLabel={`${t('add')} ${t('travelBuddies')}`} onPress={() => setTravelers((n) => n + 1)}>
                <AppIcon name="plus" style={styles.counterButtonText} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>{t('search')}</Text>
          </TouchableOpacity>

          {!!loadError && <ErrorState message={loadError} onRetry={loadBookings} retryLabel={t('tryAgain')} />}
          {/* ===== Destinations ===== */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#C9D9C4' }]}>
              <AppIcon name="hotel" style={{ fontSize: 14 }} />
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
              <AppIcon name="receipt" style={{ fontSize: 14 }} />
            </View>
            <Text style={styles.sectionTitle}>{t('recordYourBooking')}</Text>
          </View>
          <Text style={styles.hint}>{t('recordBookingHint')}</Text>

          <View style={styles.formCard}>
            {!!tripMode && !['owner', 'editor'].includes(tripRole) && <Text style={styles.hint}>{t('viewOnlyNotice')}</Text>}
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
                {form.range ? `${formatParts(form.range.start, prefs.dateFormat)} — ${formatParts(form.range.end, prefs.dateFormat)}` : t('selectDates')}
              </Text>
            </TouchableOpacity>

            {!!formError && <Text style={styles.errorText}>{formError}</Text>}
            <PrimaryButton label={t('save')} onPress={saveBooking} disabled={!!tripMode && !['owner', 'editor'].includes(tripRole)} loading={saving} style={{ marginTop: 4 }} />
          </View>

          {/* ===== Bookings ===== */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#B8D4D9' }]}>
              <AppIcon name="hotel" style={{ fontSize: 14 }} />
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
                    <IconLabel name="hotel" textStyle={styles.bookingName}>{b.placeName}</IconLabel>
                    <Text style={styles.bookingMeta}>{bookingLine(b)}</Text>
                    {!tripMode && !!b.tripDestination && (
                      <TouchableOpacity onPress={() => router.push(`/trip/${b.tripId}`)}>
                        <IconLabel trailing name="chevron-right" textStyle={styles.bookingTrip}>{t('tripToPrefix')} {b.tripDestination}</IconLabel>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeBooking(b)} hitSlop={8} accessibilityLabel={t('dialogDelete')}>
                    <AppIcon name="trash" style={{ fontSize: 16 }} />
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
                <AppIcon name="map" style={styles.sheetIcon} />
                <Text style={styles.sheetLabel}>{t('viewHotelsOnGoogleMaps')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => openSite('agoda')}>
                <AppIcon name="link" style={styles.sheetIcon} />
                <Text style={styles.sheetLabel}>{t('searchOnAgoda')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => openSite('klook')}>
                <AppIcon name="link" style={styles.sheetIcon} />
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  tripBanner: {
    backgroundColor: Colors.brown900, borderRadius: 14, padding: 14, marginBottom: 18, gap: 6,
  },
  tripBannerText: { fontFamily: 'Poppins_400Regular', fontSize: 13.5, color: '#FFFFFF' },
  tripBannerLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.mint },
  pageTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, lineHeight: 36, letterSpacing: -0.7, color: Colors.brown900 },
  pageSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown600, marginTop: 8, marginBottom: 24 },
  inputWrap: { minHeight: 52, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  searchInput: { zIndex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown900, padding: 0 },
  dateRangeText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown900, zIndex: 1 },
  dateRangePlaceholder: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown600, zIndex: 1 },
  counterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  counterLabel: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown600, zIndex: 1 },
  counterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cream, borderRadius: 12 },
  counterButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: Colors.brown900 },
  counterValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: Colors.brown900, minWidth: 20, textAlign: 'center' },
  searchButton: { minHeight: 52, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  searchButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.mint },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 26, letterSpacing: -0.3, color: Colors.brown900, flex: 1 },
  hint: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 18, color: Colors.brown600, marginBottom: 12 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: Colors.line },
  formLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 20, color: Colors.brown600, marginBottom: 8 },
  formInput: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown900, minHeight: 52, backgroundColor: Colors.cream, borderRadius: 14, borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
  errorText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.error, marginBottom: 10 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: Colors.line, padding: 16, marginBottom: 12 },
  bookingName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.brown900 },
  bookingMeta: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600, marginTop: 3 },
  bookingTrip: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.teal, marginTop: 4 },
  horizontalListContent: { gap: 14, paddingRight: 6, paddingBottom: 6 },
  resultCard: { width: 240, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden' },
  resultImage: { width: 240, height: 140, backgroundColor: Colors.cream2 },
  resultBody: { padding: 16 },
  hotelName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.brown900, marginBottom: 6 },
  hotelAmenities: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: Colors.brown600, marginBottom: 12 },
  dealButton: { backgroundColor: Colors.brown900, borderRadius: 12, paddingHorizontal: 16, minHeight: 44, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  dealButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: Colors.mint },
  overlay: { flex: 1, backgroundColor: 'rgba(51,28,8,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: Colors.brown900, marginBottom: 6 },
  sheetHint: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: Colors.brown600, marginBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.line },
  sheetIcon: { fontSize: 18, width: 24 },
  sheetLabel: { fontFamily: 'Poppins_400Regular', fontSize: 15, lineHeight: 23, color: Colors.brown900, flex: 1 },
});
