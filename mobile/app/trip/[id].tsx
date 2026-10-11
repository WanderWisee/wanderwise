import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import {
  fetchTripById, saveTrip, deleteTrip, leaveTrip, markTripViewed,
  fetchExpenses, createExpense, deleteExpense, fetchCrew, fetchTripBookings,
} from '../../services/tripService';
import { hasCoords } from '../../services/geoService';
import SwipeToDelete from '../../components/SwipeToDelete';
import PlaceCard from '../../components/PlaceCard';
import DirectionsConnector from '../../components/DirectionsConnector';
import InviteTripmatesSheet from '../../components/InviteTripmatesSheet';
import CalendarPicker from '../../components/CalendarPicker';
import OsmMap from '../../components/OsmMap';
import { Avatar, ChoiceChips, DestinationImage, ErrorState, Loading } from '../../components/ui';
import { useAutoGeocode } from '../../hooks/useAutoGeocode';
import { formatPeso, partsToISO, rangeFromISO } from '../../utils/dates';

const TABS = [
  { key: 'Overview', labelKey: 'overview' },
  { key: 'Itinerary', labelKey: 'itinerary' },
  { key: 'Budget', labelKey: 'budget' },
];

const GREY_PLACEHOLDER = Colors.placeholder;

// Parehong mga kategorya ng AddExpensePage ng web (English ang naka-save).
const EXPENSE_CATEGORIES = [
  { icon: '🍽️', label: 'Food and Drinks', key: 'catFood' },
  { icon: '🚌', label: 'Transit', key: 'catTransit' },
  { icon: '🎟️', label: 'Activities', key: 'catActivities' },
  { icon: '🛍️', label: 'Shopping', key: 'catShopping' },
  { icon: '🚗', label: 'Car Rental', key: 'catCarRental' },
  { icon: '🛏️', label: 'Lodging', key: 'catLodging' },
  { icon: '⛽', label: 'Gas', key: 'catGas' },
  { icon: '✈️', label: 'Flights', key: 'catFlights' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDayLabel(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function buildDaysFromRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < 60) {
    const iso = partsToISO({ year: cursor.getFullYear(), month: cursor.getMonth(), day: cursor.getDate() });
    days.push({ key: iso, label: formatDayLabel(iso) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

let keySeed = 0;
const newKey = (prefix) => `${prefix}_${Date.now()}_${keySeed++}`;

function hydrateTrip(data) {
  const sections = (data.sections || []).map((s) => ({
    key: newKey('section'),
    isDefault: !!s.isDefault,
    name: s.isDefault ? '' : s.name || '',
    placeInput: '',
    places: (s.places || []).map((p) => ({
      key: newKey('place'),
      name: p.name,
      itineraryDate: p.itineraryDate || null,
      // Posisyon sa loob ng araw — kailangang ibalik sa save para hindi
      // mawala ang pagkakasunod-sunod na ginawa sa web ("Optimize route").
      itineraryOrder: p.itineraryOrder ?? null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      notes: p.notes || '',
      scheduledTime: p.scheduledTime || '',
      visited: !!p.visited,
      costs: (p.costs || []).map((c) => ({
        id: newKey('cost'),
        category: c.category,
        amount: Number(c.amount) || 0,
      })),
    })),
  }));

  if (!sections.some((s) => s.isDefault)) {
    sections.unshift({ key: newKey('section'), isDefault: true, name: '', placeInput: '', places: [] });
  }

  return {
    id: data.id,
    // Sa web, ang trip.title ay ang pangalan ng "Where to go?" list.
    title: data.title || '',
    destination: data.destination || '',
    startDate: data.startDate,
    endDate: data.endDate,
    travelBuddiesCount: data.travelBuddiesCount || 0,
    budgetTotal: Number(data.budgetTotal) || 0,
    sections,
  };
}

function buildSaveBody(trip) {
  return {
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelBuddiesCount: trip.travelBuddiesCount,
    budgetTotal: trip.budgetTotal,
    sections: trip.sections.map((s, i) => ({
      isDefault: s.isDefault,
      name: s.isDefault ? trip.title : s.name,
      sortOrder: i,
      places: s.places.map((p, j) => ({
        name: p.name,
        itineraryDate: p.itineraryDate,
        itineraryOrder: p.itineraryDate ? p.itineraryOrder : null,
        latitude: p.latitude,
        longitude: p.longitude,
        notes: p.notes || null,
        scheduledTime: p.scheduledTime || null,
        visited: p.visited,
        sortOrder: j,
        costs: (p.costs || []).map((c) => ({ category: c.category, amount: Number(c.amount) || 0 })),
      })),
    })),
  };
}

// Ayos ng mga stop sa isang araw: itineraryOrder muna (mula sa web), tapos oras.
function sortStops(stops) {
  return stops.slice().sort((a, b) => {
    const ao = a.itineraryOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.itineraryOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (a.scheduledTime || '99:99').localeCompare(b.scheduledTime || '99:99');
  });
}

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t, user, formatDate, formatDateRange } = useApp();
  const { confirm, alert, toast } = useDialog();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [saving, setSaving] = useState(false);

  const [crew, setCrew] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [activeDayKey, setActiveDayKey] = useState(null);
  const [dayInputs, setDayInputs] = useState({});

  const [selectedPlaceKeys, setSelectedPlaceKeys] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [expandedPlaceKey, setExpandedPlaceKey] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0].label);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const scrollRef = useRef(null);
  const stickyHeaderHeightRef = useRef(0);
  const tabContentYRef = useRef(0);
  const dayOffsetsRef = useRef({});
  const scrollLockRef = useRef(false);
  const scrollYRef = useRef(0);

  const tripRef = useRef(null);
  tripRef.current = trip;

  // Kapag nahanap ang coordinates ng isang place, i-save sa lahat ng
  // place na may parehong pangalan at wala pang coordinates.
  useAutoGeocode(trip, (name, coords) => {
    const base = tripRef.current;
    if (!base) return;
    persist(
      {
        ...base,
        sections: base.sections.map((s) => ({
          ...s,
          places: s.places.map((p) =>
            p.name === name && (p.latitude == null || p.longitude == null)
              ? { ...p, latitude: coords.latitude, longitude: coords.longitude }
              : p
          ),
        })),
      },
      { silent: true }
    );
  });

  async function loadTrip() {
    try {
      const data = await fetchTripById(id);
      const hydrated = hydrateTrip(data);
      setTrip(hydrated);
      setLoadError(null);
      markTripViewed(id);

      const days = buildDaysFromRange(hydrated.startDate, hydrated.endDate);
      setActiveDayKey((prev) => prev || (days[0] && days[0].key));

      fetchExpenses(id).then((list) => setExpenses(list.filter((e) => !e.placeId))).catch(() => {});
      fetchCrew(id).then(setCrew).catch(() => {});
      fetchTripBookings(id).then(setBookings).catch(() => {});
    } catch (e) {
      setTrip(null);
      setLoadError(e.status === 404 ? t('tripNotFoundOrLinkInvalid') : e.message);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!tripRef.current) setLoading(true);
      loadTrip().finally(() => setLoading(false));
    }, [id])
  );

  async function persist(nextTrip, { silent = false } = {}) {
    setTrip(nextTrip);
    setSaving(true);
    try {
      await saveTrip(id, buildSaveBody(nextTrip));
    } catch (e) {
      if (!silent) alert(t('saveFailed'), e.message);
    } finally {
      setSaving(false);
    }
  }

  const isOwner = crew.some((m) => m.isOwner && user && m.userId === user.userId);

  function updateSectionField(sectionKey, field, value) {
    setTrip({
      ...trip,
      sections: trip.sections.map((s) => (s.key === sectionKey ? { ...s, [field]: value } : s)),
    });
  }

  function withPlaceChanged(baseTrip, sectionKey, placeKey, changeFn) {
    return {
      ...baseTrip,
      sections: baseTrip.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, places: s.places.map((p) => (p.key === placeKey ? changeFn(p) : p)) }
          : s
      ),
    };
  }

  function updatePlaceLocal(sectionKey, placeKey, changes) {
    setTrip(withPlaceChanged(trip, sectionKey, placeKey, (p) => ({ ...p, ...changes })));
  }

  async function updatePlaceAndSave(sectionKey, placeKey, changeFn) {
    await persist(withPlaceChanged(trip, sectionKey, placeKey, changeFn));
  }

  function makePlace(name, itineraryDate = null, itineraryOrder = null) {
    return {
      key: newKey('place'),
      name,
      itineraryDate,
      itineraryOrder,
      latitude: null,
      longitude: null,
      notes: '',
      scheduledTime: '',
      visited: false,
      costs: [],
    };
  }

  // openNotes = true kapag pinindot ang 📝: idagdag at buksan agad para sa notes.
  async function addPlaceToSection(sectionKey, { openNotes = false } = {}) {
    const section = trip.sections.find((s) => s.key === sectionKey);
    if (!section || !section.placeInput.trim()) return;
    const newPlace = makePlace(section.placeInput.trim());
    if (openNotes) setExpandedPlaceKey(newPlace.key);
    await persist({
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey ? { ...s, places: [...s.places, newPlace], placeInput: '' } : s
      ),
    });
  }

  function addNewList() {
    setTrip({
      ...trip,
      sections: [...trip.sections, { key: newKey('section'), isDefault: false, name: '', placeInput: '', places: [] }],
    });
  }

  async function deleteList(sectionKey) {
    const section = trip.sections.find((s) => s.key === sectionKey);
    if (!section || section.isDefault) return;
    if (section.places.length > 0) {
      const ok = await confirm({
        title: t('deleteSectionTitle'),
        message: t('deleteSectionWarning'),
        confirmLabel: t('dialogDelete'),
        cancelLabel: t('cancel'),
        danger: true,
      });
      if (!ok) return;
    }
    await persist({ ...trip, sections: trip.sections.filter((s) => s.key !== sectionKey) });
  }

  function startSelecting(placeKey = null) {
    setExpandedPlaceKey(null);
    setIsSelecting(true);
    setSelectedPlaceKeys(placeKey ? [placeKey] : []);
  }

  function togglePlaceSelected(placeKey) {
    setSelectedPlaceKeys((prev) =>
      prev.includes(placeKey) ? prev.filter((k) => k !== placeKey) : [...prev, placeKey]
    );
  }

  function cancelSelecting() {
    setIsSelecting(false);
    setSelectedPlaceKeys([]);
  }

  function nextOrderFor(baseTrip, dayKey) {
    const orders = baseTrip.sections
      .flatMap((s) => s.places)
      .filter((p) => p.itineraryDate === dayKey && p.itineraryOrder != null)
      .map((p) => p.itineraryOrder);
    return orders.length ? Math.max(...orders) + 1 : 0;
  }

  async function assignSelectedToDay(dayKey) {
    if (selectedPlaceKeys.length === 0) return;
    let order = nextOrderFor(trip, dayKey);
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) => ({
        ...s,
        places: s.places.map((p) =>
          selectedPlaceKeys.includes(p.key) ? { ...p, itineraryDate: dayKey, itineraryOrder: order++ } : p
        ),
      })),
    };
    setSelectedPlaceKeys([]);
    setIsSelecting(false);
    await persist(nextTrip);
    toast(t('addedToDay'));
  }

  async function deletePlace(sectionKey, placeKey) {
    if (expandedPlaceKey === placeKey) setExpandedPlaceKey(null);
    await persist({
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey ? { ...s, places: s.places.filter((p) => p.key !== placeKey) } : s
      ),
    });
  }

  async function removeFromDay(sectionKey, placeKey) {
    if (expandedPlaceKey === placeKey) setExpandedPlaceKey(null);
    await updatePlaceAndSave(sectionKey, placeKey, (p) => ({ ...p, itineraryDate: null, itineraryOrder: null }));
  }

  async function deleteSelected() {
    const ok = await confirm({
      title: t('deleteSelectedTitle'),
      message: `${selectedPlaceKeys.length} ${t('placesWillBeRemoved')}`,
      confirmLabel: t('dialogDelete'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) => ({
        ...s,
        places: s.places.filter((p) => !selectedPlaceKeys.includes(p.key)),
      })),
    };
    setSelectedPlaceKeys([]);
    setIsSelecting(false);
    await persist(nextTrip);
  }

  async function addPlaceToDay(dayKey) {
    const text = (dayInputs[dayKey] || '').trim();
    if (!text) return;
    const defaultSection = trip.sections.find((s) => s.isDefault) || trip.sections[0];
    const newPlace = makePlace(text, dayKey, nextOrderFor(trip, dayKey));
    setDayInputs((prev) => ({ ...prev, [dayKey]: '' }));
    await persist({
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === defaultSection.key ? { ...s, places: [...s.places, newPlace] } : s
      ),
    });
  }

  // Ilipat pataas/pababa ang isang stop sa loob ng araw.
  async function moveStop(dayKey, placeKey, direction) {
    const all = trip.sections.flatMap((s) => s.places);
    const stops = sortStops(all.filter((p) => p.itineraryDate === dayKey));
    const idx = stops.findIndex((p) => p.key === placeKey);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= stops.length) return;
    const reordered = stops.slice();
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    const orderByKey = {};
    reordered.forEach((p, i) => (orderByKey[p.key] = i));
    await persist({
      ...trip,
      sections: trip.sections.map((s) => ({
        ...s,
        places: s.places.map((p) => (p.key in orderByKey ? { ...p, itineraryOrder: orderByKey[p.key] } : p)),
      })),
    });
  }

  async function toggleVisited(sectionKey, placeKey) {
    await updatePlaceAndSave(sectionKey, placeKey, (p) => ({ ...p, visited: !p.visited }));
  }

  async function changeDates(range) {
    const startDate = partsToISO(range.start);
    const endDate = partsToISO(range.end);
    // Ang mga place na wala na sa bagong range ay ibabalik sa "Where to go?".
    const nextTrip = {
      ...trip,
      startDate,
      endDate,
      sections: trip.sections.map((s) => ({
        ...s,
        places: s.places.map((p) =>
          p.itineraryDate && (p.itineraryDate < startDate || p.itineraryDate > endDate)
            ? { ...p, itineraryDate: null, itineraryOrder: null }
            : p
        ),
      })),
    };
    setActiveDayKey(startDate);
    await persist(nextTrip);
  }

  async function changeBuddies(delta) {
    const next = Math.max(0, (trip.travelBuddiesCount || 0) + delta);
    await persist({ ...trip, travelBuddiesCount: next });
  }

  async function saveBudget() {
    const value = parseFloat(String(budgetInput).replace(/,/g, ''));
    setEditingBudget(false);
    if (isNaN(value) || value < 0) return;
    await persist({ ...trip, budgetTotal: value });
  }

  async function handleAddExpense() {
    const amount = parseFloat(String(expenseAmount).replace(/,/g, ''));
    if (!expenseCategory || isNaN(amount) || amount <= 0) {
      toast(t('expenseAmountRequired'));
      return;
    }
    setSaving(true);
    try {
      const created = await createExpense(id, {
        category: expenseCategory,
        amount,
        description: expenseDesc.trim(),
      });
      setExpenses((prev) => [...prev, created]);
      setExpenseAmount('');
      setExpenseDesc('');
      toast(t('expenseAdded'));
    } catch (e) {
      alert(t('saveFailed'), e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(expense) {
    const ok = await confirm({
      title: t('deleteThisExpenseTitle'),
      message: t('confirmDeleteExpense'),
      confirmLabel: t('dialogDelete'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteExpense(id, expense.id);
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    } catch (e) {
      toast(e.message);
    }
  }

  async function confirmDeleteTrip() {
    setMenuOpen(false);
    const ok = await confirm({
      title: t('deleteTripTitle'),
      message: t('confirmDeleteTrip'),
      confirmLabel: t('dialogDelete'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTrip(id);
      router.replace('/(tabs)/home');
    } catch (e) {
      alert(t('saveFailed'), e.message);
    }
  }

  async function confirmLeaveTrip() {
    setMenuOpen(false);
    const ok = await confirm({
      title: t('leaveTrip'),
      message: t('confirmLeaveTrip'),
      confirmLabel: t('leaveTrip'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await leaveTrip(id);
      router.replace('/(tabs)/home');
    } catch (e) {
      alert(t('leaveTripFailed'), e.message);
    }
  }

  function openHotels() {
    setMenuOpen(false);
    router.push({
      pathname: '/(tabs)/hotels',
      params: {
        tripId: String(id),
        destination: trip.destination || '',
        startDate: trip.startDate || '',
        endDate: trip.endDate || '',
      },
    });
  }

  function placeCardHandlers(sectionKey, place) {
    return {
      onChangeNotes: (text) => updatePlaceLocal(sectionKey, place.key, { notes: text }),
      onEndNotes: () => persist(tripRef.current),
      onToggleVisited: () => toggleVisited(sectionKey, place.key),
      onSetTime: (value) => updatePlaceAndSave(sectionKey, place.key, (p) => ({ ...p, scheduledTime: value || '' })),
      onAddCost: (cost) => updatePlaceAndSave(sectionKey, place.key, (p) => ({ ...p, costs: [...(p.costs || []), cost] })),
      onRemoveCost: (costId) =>
        updatePlaceAndSave(sectionKey, place.key, (p) => ({
          ...p,
          costs: (p.costs || []).filter((c) => c.id !== costId),
        })),
    };
  }

  function scrollToDay(dayKey) {
    setActiveDayKey(dayKey);
    const sectionY = dayOffsetsRef.current[dayKey];
    if (sectionY == null || !scrollRef.current) return;
    const target = tabContentYRef.current + sectionY - stickyHeaderHeightRef.current;
    scrollLockRef.current = true;
    scrollRef.current.scrollTo({ y: Math.max(0, target), animated: true });
    setTimeout(() => {
      scrollLockRef.current = false;
    }, 500);
  }

  function handleScroll(e, days) {
    if (activeTab !== 'Itinerary' || scrollLockRef.current || days.length === 0) return;
    const viewTop = e.nativeEvent.contentOffset.y + stickyHeaderHeightRef.current + 24;
    let current = days[0].key;
    for (const day of days) {
      const sectionY = dayOffsetsRef.current[day.key];
      if (sectionY != null && tabContentYRef.current + sectionY <= viewTop) current = day.key;
    }
    if (current !== activeDayKey) setActiveDayKey(current);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.screen}>
        <ErrorState message={loadError || t('tripNotFoundOrLinkInvalid')} onRetry={() => { setLoading(true); loadTrip().finally(() => setLoading(false)); }} retryLabel={t('tryAgain')} />
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={{ alignSelf: 'center', marginBottom: 40 }}>
          <Text style={styles.backLink}>← {t('goHome')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const days = buildDaysFromRange(trip.startDate, trip.endDate);
  const dayLabelFor = (iso) => days.find((d) => d.key === iso)?.label;
  const allPlaces = trip.sections.flatMap((s) => s.places.map((p) => ({ ...p, sectionKey: s.key })));
  const mappedPlaces = allPlaces.filter(hasCoords);

  // ===== Budget =====
  const expensesTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const placeCosts = allPlaces.flatMap((p) => (p.costs || []).map((c) => ({ ...c, placeName: p.name })));
  const estimatedTotal = placeCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const grandTotal = expensesTotal + estimatedTotal;
  const budget = trip.budgetTotal || 0;
  const usedRatio = budget > 0 ? Math.min(1, grandTotal / budget) : 0;
  const overBudget = budget > 0 && grandTotal > budget;

  const byCategory = {};
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0);
  });
  placeCosts.forEach((c) => {
    const key = `📍 ${c.placeName}`;
    byCategory[key] = (byCategory[key] || 0) + (Number(c.amount) || 0);
  });
  const categoryRows: [string, number][] = Object.entries(byCategory).map(([k, v]) => [k, Number(v)] as [string, number]).sort((a, b) => b[1] - a[1]);
  const catMeta = (label) => EXPENSE_CATEGORIES.find((c) => c.label === label);
  const catLabel = (label) => (catMeta(label) ? t(catMeta(label).key) : label);

  const bookingsOnDay = (dayKey) =>
    bookings.filter((b) => b.checkIn <= dayKey && (b.checkOut ? dayKey < b.checkOut : dayKey === b.checkIn));

  const tripName = trip.destination ? `${t('tripToPrefix')} ${trip.destination}` : t('untitledTrip');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 }}
        stickyHeaderIndices={[2]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
          handleScroll(e, days);
        }}
      >
        {/* 0: Hero */}
        <View style={styles.hero}>
          <DestinationImage name={trip.destination} style={StyleSheet.absoluteFill} emojiSize={50} />
          <View style={styles.heroShade} />
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} style={styles.heroIconButton} accessibilityLabel={t('back')}>
              <Text style={styles.heroIconText}>←</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setInviteOpen(true)} style={styles.heroIconButton} accessibilityLabel={t('inviteYourCrew')}>
                <Text style={styles.heroIconText}>👥</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.heroIconButton} accessibilityLabel={t('moreActions')}>
                <Text style={styles.heroIconText}>⋯</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 1: Title card */}
        <View style={styles.titleCard}>
          <View style={styles.titleRow}>
            <Text style={styles.tripName} numberOfLines={2}>{tripName}</Text>
            {saving && <ActivityIndicator size="small" color={Colors.brown600} />}
          </View>

          <TouchableOpacity onPress={() => setDatesOpen(true)} style={styles.metaButton} activeOpacity={0.7}>
            <Text style={styles.tripDates}>
              📅 {trip.startDate || trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : t('setTripDates')}
            </Text>
            <Text style={styles.editHint}>✎</Text>
          </TouchableOpacity>

          <View style={styles.metaRow}>
            <View style={styles.buddiesRow}>
              <Text style={styles.tripDates}>👤 {t('travelBuddies')}</Text>
              <TouchableOpacity style={styles.miniCounter} onPress={() => changeBuddies(-1)} hitSlop={6}>
                <Text style={styles.miniCounterText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.buddiesValue}>{trip.travelBuddiesCount}</Text>
              <TouchableOpacity style={styles.miniCounter} onPress={() => changeBuddies(1)} hitSlop={6}>
                <Text style={styles.miniCounterText}>+</Text>
              </TouchableOpacity>
            </View>

            {crew.length > 0 && (
              <TouchableOpacity style={styles.crewRow} onPress={() => setInviteOpen(true)}>
                {crew.slice(0, 4).map((m, i) => (
                  <Avatar key={`${m.userId}`} person={m} size={26} style={{ marginLeft: i === 0 ? 0 : -6, borderWidth: 1.5, borderColor: '#FFFFFF' }} />
                ))}
                {crew.length > 4 && <Text style={styles.crewMore}>+{crew.length - 4}</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2: Sticky header — tabs, at day pills kapag nasa Itinerary */}
        <View style={styles.stickyHeader} onLayout={(e) => (stickyHeaderHeightRef.current = e.nativeEvent.layout.height)}>
          <View style={styles.tabBar}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => {
                  setActiveTab(tab.key);
                  setExpandedPlaceKey(null);
                  // Kapag naka-scroll na pababa, ibalik sa simula ng bagong tab.
                  const top = Math.max(0, tabContentYRef.current - stickyHeaderHeightRef.current);
                  if (scrollYRef.current > top) scrollRef.current?.scrollTo({ y: top, animated: false });
                  if (tab.key === 'Itinerary' && !activeDayKey && days[0]) setActiveDayKey(days[0].key);
                }}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{t(tab.labelKey)}</Text>
                {activeTab === tab.key && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Itinerary' && days.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPillRow}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayPill, activeDayKey === day.key && styles.dayPillActive]}
                  onPress={() => scrollToDay(day.key)}
                >
                  <Text style={[styles.dayPillText, activeDayKey === day.key && styles.dayPillTextActive]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 3: Tab content */}
        <View style={styles.tabContent} onLayout={(e) => (tabContentYRef.current = e.nativeEvent.layout.y)}>
          {activeTab === 'Overview' && (
            <>
              {/* Mapa ng lahat ng place na may coordinates */}
              <OsmMap
                markers={mappedPlaces.map((p) => ({ latitude: p.latitude, longitude: p.longitude, label: p.name }))}
                height={180}
                style={{ marginBottom: 6 }}
                emptyLabel={allPlaces.length === 0 ? t('mapAddPlacesHint') : t('mapLocatingPlaces')}
                fallbackCenter={{ latitude: 12.3, longitude: 122.5, zoom: 5 }}
                singleZoom={14}
              />
              <Text style={styles.mapCaption}>
                {mappedPlaces.length}/{allPlaces.length} {t('placesOnMap')}
              </Text>

              {/* Hotel bookings */}
              <View style={styles.bookingCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: Colors.tintSky }]}>
                    <Text style={{ fontSize: 14 }}>🏨</Text>
                  </View>
                  <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>{t('yourBookings')}</Text>
                  <TouchableOpacity onPress={openHotels}>
                    <Text style={styles.linkAction}>+ {t('bookAHotel')}</Text>
                  </TouchableOpacity>
                </View>
                {bookings.length === 0 ? (
                  <Text style={styles.emptyTextSmall}>{t('noBookingsForTrip')}</Text>
                ) : (
                  bookings.map((b) => (
                    <Text key={b.id} style={styles.bookingLine}>
                      🛏️ {b.placeName} · {formatDate(b.checkIn, 'short')}
                      {b.checkOut ? ` → ${formatDate(b.checkOut, 'short')}` : ''}
                      {b.bookingSite ? ` · ${b.bookingSite}` : ''}
                    </Text>
                  ))
                )}
              </View>

              {isSelecting && (
                <View style={styles.selectHint}>
                  <Text style={styles.selectHintText}>{t('tapPlacesToSelect')}</Text>
                  <TouchableOpacity onPress={cancelSelecting}>
                    <Text style={styles.selectHintCancel}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {trip.sections.map((section, sIndex) => (
                <View key={section.key} style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={[styles.sectionIconBadge, { backgroundColor: sIndex % 2 === 0 ? Colors.tintSand : Colors.tintSage }]}>
                      <Text style={{ fontSize: 14 }}>📍</Text>
                    </View>
                    {section.isDefault ? (
                      <TextInput
                        style={styles.listTitleInput}
                        placeholder={t('whereToGoDefault')}
                        placeholderTextColor={GREY_PLACEHOLDER}
                        value={trip.title}
                        onChangeText={(text) => setTrip({ ...trip, title: text })}
                        onEndEditing={() => persist(tripRef.current)}
                      />
                    ) : (
                      <>
                        <TextInput
                          style={styles.listTitleInput}
                          placeholder={t('nameThisSectionPlaceholder')}
                          placeholderTextColor={GREY_PLACEHOLDER}
                          value={section.name}
                          onChangeText={(text) => updateSectionField(section.key, 'name', text)}
                          onEndEditing={() => persist(tripRef.current)}
                        />
                        <TouchableOpacity onPress={() => deleteList(section.key)} hitSlop={8} accessibilityLabel={t('deleteThisListTitle')}>
                          <Text style={{ fontSize: 14, color: Colors.brown600 }}>🗑</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {section.places.length === 0 && <Text style={styles.emptyTextSmall}>{t('noPlacesInListYet')}</Text>}

                  {section.places.map((place, pIndex) => {
                    const isSelected = selectedPlaceKeys.includes(place.key);
                    const isExpanded = expandedPlaceKey === place.key;
                    return (
                      <View key={place.key} style={{ marginBottom: 10 }}>
                        <SwipeToDelete
                          label={t('dialogDelete')}
                          disabled={isSelecting || isExpanded}
                          onDelete={() => deletePlace(section.key, place.key)}
                        >
                          <PlaceCard
                            place={place}
                            index={pIndex}
                            expanded={isExpanded}
                            selecting={isSelecting}
                            selected={isSelected}
                            dayLabel={dayLabelFor(place.itineraryDate)}
                            onPress={() => {
                              if (isSelecting) togglePlaceSelected(place.key);
                              else setExpandedPlaceKey(isExpanded ? null : place.key);
                            }}
                            onLongPress={() => {
                              if (!isSelecting) startSelecting(place.key);
                            }}
                            {...placeCardHandlers(section.key, place)}
                          />
                        </SwipeToDelete>
                      </View>
                    );
                  })}

                  <View style={styles.addPlaceRow}>
                    <TextInput
                      style={styles.addPlaceInput}
                      placeholder={t('addNewPlacePlaceholder')}
                      placeholderTextColor={GREY_PLACEHOLDER}
                      value={section.placeInput}
                      onChangeText={(text) => updateSectionField(section.key, 'placeInput', text)}
                      onSubmitEditing={() => addPlaceToSection(section.key)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.iconSquareButton}
                      onPress={() => addPlaceToSection(section.key, { openNotes: true })}
                      accessibilityLabel={t('addWithNotes')}
                    >
                      <Text style={{ fontSize: 15 }}>📝</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconSquareButton, isSelecting && styles.iconSquareButtonActive]}
                      onPress={() => (isSelecting ? cancelSelecting() : startSelecting())}
                      accessibilityLabel={t('selectPlaces')}
                    >
                      <Text style={{ fontSize: 15 }}>☑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.newListButtonMinimal} onPress={addNewList}>
                <Text style={styles.newListButtonMinimalText}>+ {t('newListBtn')}</Text>
              </TouchableOpacity>

              {isSelecting && selectedPlaceKeys.length > 0 && (
                <View style={styles.assignBar}>
                  <Text style={styles.assignBarTitle}>
                    {selectedPlaceKeys.length} {t('placesSelectedAddTo')}
                  </Text>
                  {days.length === 0 ? (
                    <Text style={[styles.emptyTextSmall, { color: 'rgba(255,255,255,0.7)' }]}>{t('setDatesToAssign')}</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {days.map((day) => (
                        <TouchableOpacity key={day.key} style={styles.assignBarDayPill} onPress={() => assignSelectedToDay(day.key)}>
                          <Text style={styles.assignBarDayPillText}>{day.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.assignBarBottomRow}>
                    <TouchableOpacity onPress={deleteSelected}>
                      <Text style={styles.assignBarDelete}>🗑 {t('deleteSelected')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelSelecting}>
                      <Text style={styles.assignBarCancel}>{t('cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}

          {activeTab === 'Itinerary' && (
            <>
              {days.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={{ fontSize: 30 }}>🗓️</Text>
                  <Text style={styles.emptyStateTitle}>{t('noDatesSetYet')}</Text>
                  <Text style={[styles.emptyText, { textAlign: 'center' }]}>{t('setDatesForDays')}</Text>
                  <TouchableOpacity style={[styles.addExpenseButton, { paddingHorizontal: 20, marginTop: 8 }]} onPress={() => setDatesOpen(true)}>
                    <Text style={styles.addExpenseButtonText}>📅 {t('setTripDates')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                days.map((day, dIndex) => {
                  const stops = sortStops(allPlaces.filter((p) => p.itineraryDate === day.key));
                  const stays = bookingsOnDay(day.key);
                  return (
                    <View
                      key={day.key}
                      style={[styles.daySection, dIndex !== 0 && styles.daySectionDivider]}
                      onLayout={(e) => (dayOffsetsRef.current[day.key] = e.nativeEvent.layout.y)}
                    >
                      <Text style={styles.dayHeading}>{day.label}</Text>

                      {stays.map((b) => (
                        <View key={`stay-${b.id}`} style={styles.stayBanner}>
                          <Text style={styles.stayText}>
                            🛏️ {b.checkIn === day.key ? t('checkInAt') : t('bookingStaying')} {b.placeName}
                          </Text>
                        </View>
                      ))}

                      {stops.length === 0 && <Text style={styles.emptyTextSmall}>{t('noStopsYet')}</Text>}

                      {stops.map((place, index) => {
                        const isExpanded = expandedPlaceKey === place.key;
                        const next = stops[index + 1];
                        return (
                          <View key={place.key}>
                            <View style={{ marginBottom: 10 }}>
                              <SwipeToDelete
                                label={t('remove')}
                                disabled={isExpanded}
                                onDelete={() => removeFromDay(place.sectionKey, place.key)}
                              >
                                <PlaceCard
                                  place={place}
                                  index={index}
                                  expanded={isExpanded}
                                  onPress={() => setExpandedPlaceKey(isExpanded ? null : place.key)}
                                  {...placeCardHandlers(place.sectionKey, place)}
                                />
                              </SwipeToDelete>
                              {isExpanded && stops.length > 1 && (
                                <View style={styles.reorderRow}>
                                  <TouchableOpacity disabled={index === 0} onPress={() => moveStop(day.key, place.key, -1)} style={[styles.reorderButton, index === 0 && { opacity: 0.35 }]}>
                                    <Text style={styles.reorderText}>↑ {t('moveUp')}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity disabled={index === stops.length - 1} onPress={() => moveStop(day.key, place.key, 1)} style={[styles.reorderButton, index === stops.length - 1 && { opacity: 0.35 }]}>
                                    <Text style={styles.reorderText}>↓ {t('moveDown')}</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                            {next && <DirectionsConnector from={place} to={next} destination={trip.destination} />}
                          </View>
                        );
                      })}

                      <View style={styles.addPlaceRow}>
                        <TextInput
                          style={styles.addPlaceInput}
                          placeholder={t('addNewPlacePlaceholder')}
                          placeholderTextColor={GREY_PLACEHOLDER}
                          value={dayInputs[day.key] || ''}
                          onChangeText={(text) => setDayInputs((prev) => ({ ...prev, [day.key]: text }))}
                          onSubmitEditing={() => addPlaceToDay(day.key)}
                        />
                        <TouchableOpacity style={styles.addPlaceButton} onPress={() => addPlaceToDay(day.key)} disabled={saving}>
                          <Text style={styles.addPlaceButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
              {days.length > 0 && (
                <Text style={styles.osmAttribution}>Routes and directions © OpenStreetMap contributors</Text>
              )}
            </>
          )}

          {activeTab === 'Budget' && (
            <>
              <View style={styles.budgetHero}>
                <Text style={styles.budgetLabel}>{t('totalBudgetLabel')}</Text>
                {editingBudget ? (
                  <View style={styles.budgetEditRow}>
                    <Text style={styles.budgetPeso}>₱</Text>
                    <TextInput
                      style={styles.budgetInput}
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      keyboardType="decimal-pad"
                      autoFocus
                      onSubmitEditing={saveBudget}
                      onBlur={saveBudget}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setBudgetInput(budget ? String(budget) : '');
                      setEditingBudget(true);
                    }}
                  >
                    <Text style={styles.budgetAmount}>{budget > 0 ? formatPeso(budget) : t('setABudget')} ✎</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${usedRatio * 100}%` }, overBudget && { backgroundColor: '#F4A19A' }]} />
                </View>
                <View style={styles.budgetStatsRow}>
                  <View>
                    <Text style={styles.budgetStatValue}>{formatPeso(grandTotal)}</Text>
                    <Text style={styles.budgetStatLabel}>{t('plannedSpending')}</Text>
                  </View>
                  {budget > 0 && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.budgetStatValue, overBudget && { color: '#F4A19A' }]}>
                        {formatPeso(Math.abs(budget - grandTotal))}
                      </Text>
                      <Text style={styles.budgetStatLabel}>{overBudget ? t('overBudget') : t('remaining')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.budgetSplit}>
                  {t('expensesHeader')} {formatPeso(expensesTotal)} · {t('expectedCost')} {formatPeso(estimatedTotal)}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>{t('addExpenseTitle')}</Text>
              <View style={styles.addExpenseCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <ChoiceChips
                    style={{ flexWrap: 'nowrap' }}
                    options={EXPENSE_CATEGORIES.map((c) => ({ value: c.label, label: `${c.icon} ${t(c.key)}` }))}
                    value={expenseCategory}
                    onChange={setExpenseCategory}
                  />
                </ScrollView>
                <TextInput
                  style={styles.expenseInput}
                  placeholder={`${t('amount')} (₱)`}
                  placeholderTextColor={GREY_PLACEHOLDER}
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={styles.expenseInput}
                  placeholder={t('writeDescription')}
                  placeholderTextColor={GREY_PLACEHOLDER}
                  value={expenseDesc}
                  onChangeText={setExpenseDesc}
                />
                <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.mint} />
                  ) : (
                    <Text style={styles.addExpenseButtonText}>+ {t('addExpenseBtn')}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {categoryRows.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('breakdown')}</Text>
                  <View style={styles.breakdownCard}>
                    {categoryRows.map(([label, amount]) => (
                      <View key={label} style={styles.breakdownRow}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.breakdownLabel} numberOfLines={1}>
                            {catMeta(label) ? `${catMeta(label).icon} ` : ''}{catLabel(label)}
                          </Text>
                          <Text style={styles.breakdownAmount}>{formatPeso(amount)}</Text>
                        </View>
                        <View style={styles.breakdownTrack}>
                          <View style={[styles.breakdownFill, { width: `${grandTotal > 0 ? (Number(amount) / grandTotal) * 100 : 0}%` }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('expensesHeader')}</Text>
              {expenses.length === 0 ? (
                <Text style={styles.emptyText}>{t('noExpensesYetAddOne')}</Text>
              ) : (
                expenses.map((e) => (
                  <View key={e.id} style={styles.expenseRow}>
                    <Text style={{ fontSize: 18 }}>{catMeta(e.category)?.icon || '📍'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseTitle}>{catLabel(e.category)}</Text>
                      {!!e.description && <Text style={styles.expenseDesc}>{e.description}</Text>}
                    </View>
                    <Text style={styles.expenseAmount}>{formatPeso(e.amount)}</Text>
                    <TouchableOpacity onPress={() => handleDeleteExpense(e)} hitSlop={8} accessibilityLabel={t('dialogDelete')}>
                      <Text style={{ fontSize: 14, color: Colors.brown600 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {placeCosts.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('expectedCost')}</Text>
                  <Text style={[styles.emptyTextSmall, { marginBottom: 10 }]}>{t('placeCostsHint')}</Text>
                  {placeCosts.map((c) => (
                    <View key={c.id} style={styles.expenseRow}>
                      <Text style={{ fontSize: 16 }}>📍</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.expenseTitle}>{c.placeName}</Text>
                        <Text style={styles.expenseDesc}>{c.category}</Text>
                      </View>
                      <Text style={styles.expenseAmount}>{formatPeso(c.amount)}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <InviteTripmatesSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        tripId={id}
        onChanged={() => fetchCrew(id).then(setCrew).catch(() => {})}
        onLeft={() => router.replace('/(tabs)/home')}
      />

      <CalendarPicker
        visible={datesOpen}
        onClose={() => setDatesOpen(false)}
        onConfirm={changeDates}
        initialRange={rangeFromISO(trip.startDate, trip.endDate)}
      />

      {/* Iba pang aksyon */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.sheetRow} onPress={() => { setMenuOpen(false); setInviteOpen(true); }}>
              <Text style={styles.sheetIcon}>👥</Text>
              <Text style={styles.sheetLabel}>{t('inviteYourCrew')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetRow} onPress={() => { setMenuOpen(false); setDatesOpen(true); }}>
              <Text style={styles.sheetIcon}>📅</Text>
              <Text style={styles.sheetLabel}>{t('changeDates')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetRow} onPress={openHotels}>
              <Text style={styles.sheetIcon}>🏨</Text>
              <Text style={styles.sheetLabel}>{t('bookAHotel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuOpen(false);
                router.push({ pathname: '/new-post', params: { place: trip.destination } });
              }}
            >
              <Text style={styles.sheetIcon}>📖</Text>
              <Text style={styles.sheetLabel}>{t('writeAboutThisTrip')}</Text>
            </TouchableOpacity>
            {isOwner ? (
              <TouchableOpacity style={styles.sheetRow} onPress={confirmDeleteTrip}>
                <Text style={styles.sheetIcon}>🗑</Text>
                <Text style={[styles.sheetLabel, { color: Colors.error }]}>{t('deleteTripTitle')}</Text>
              </TouchableOpacity>
            ) : crew.length > 0 ? (
              <TouchableOpacity style={styles.sheetRow} onPress={confirmLeaveTrip}>
                <Text style={styles.sheetIcon}>🚪</Text>
                <Text style={[styles.sheetLabel, { color: Colors.error }]}>{t('leaveTrip')}</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  osmAttribution: {
    fontFamily: 'Lora_400Regular', fontSize: 10.5, color: GREY_PLACEHOLDER,
    textAlign: 'center', marginTop: 8,
  },
  screen: { flex: 1, backgroundColor: Colors.cream },
  backLink: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },

  hero: { height: 190, backgroundColor: Colors.cream2, position: 'relative', overflow: 'hidden' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(46,27,14,0.18)' },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12,
  },
  heroIconButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroIconText: { fontSize: 16, color: Colors.brown900 },

  titleCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -36, borderRadius: 18, padding: 18,
    shadowColor: Colors.brown900, shadowOpacity: 0.1, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripName: { flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900 },
  metaButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, alignSelf: 'flex-start' },
  editHint: { fontSize: 12, color: Colors.brown600 },
  tripDates: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  buddiesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniCounter: {
    width: 24, height: 24, borderRadius: 7, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  miniCounterText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },
  buddiesValue: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900, minWidth: 14, textAlign: 'center' },
  crewRow: { flexDirection: 'row', alignItems: 'center' },
  crewMore: { fontFamily: 'Lora_600SemiBold', fontSize: 11, color: Colors.brown600, marginLeft: 4 },

  stickyHeader: { backgroundColor: Colors.cream, borderBottomWidth: 1, borderBottomColor: Colors.line },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 18 },
  tabItem: { marginRight: 24, paddingBottom: 12 },
  tabText: { fontFamily: 'Lora_600SemiBold', fontSize: 14.5, color: Colors.brown600 },
  tabTextActive: { color: Colors.brown900 },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.brown900 },

  dayPillRow: { gap: 10, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  dayPill: {
    backgroundColor: Colors.cream2, borderRadius: 20, paddingHorizontal: 16, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  dayPillActive: { backgroundColor: Colors.brown900 },
  dayPillText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },
  dayPillTextActive: { color: Colors.mint },

  tabContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mapCaption: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginBottom: 18 },
  linkAction: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },

  bookingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  bookingLine: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown900, marginTop: 4 },

  selectHint: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.cream2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  selectHintText: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown900, flex: 1 },
  selectHintCancel: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.brown600, textDecorationLine: 'underline' },

  sectionBlock: { marginBottom: 22 },
  listTitleInput: {
    flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900,
    paddingVertical: 2,
  },

  daySection: { paddingBottom: 16 },
  daySectionDivider: { borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 22 },
  dayHeading: { fontFamily: 'Lora_600SemiBold', fontSize: 26, color: Colors.brown900, marginBottom: 14 },
  stayBanner: {
    backgroundColor: Colors.tintSky, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  stayText: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown900 },
  reorderRow: { flexDirection: 'row', gap: 10, marginTop: 6, justifyContent: 'flex-end' },
  reorderButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.cream2 },
  reorderText: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.brown900 },

  addPlaceRow: { flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 2 },
  addPlaceInput: {
    flex: 1, fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  addPlaceButton: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  addPlaceButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.mint },
  iconSquareButton: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  iconSquareButtonActive: { backgroundColor: Colors.tintSage, borderColor: Colors.mint },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
  emptyTextSmall: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: GREY_PLACEHOLDER, paddingVertical: 4, marginBottom: 6 },

  newListButtonMinimal: { alignSelf: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 20 },
  newListButtonMinimalText: {
    fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.brown600, textDecorationLine: 'underline',
  },

  assignBar: { backgroundColor: Colors.brown900, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 20 },
  assignBarTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint, marginBottom: 10 },
  assignBarDayPill: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 14, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  assignBarDayPillText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  assignBarBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  assignBarDelete: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: '#F4A19A' },
  assignBarCancel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },

  emptyStateCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, alignItems: 'center', gap: 8,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  emptyStateTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },

  budgetHero: { backgroundColor: Colors.brown900, borderRadius: 18, padding: 20, marginBottom: 24 },
  budgetLabel: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.mint },
  budgetAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 30, color: '#FFFFFF', marginTop: 4 },
  budgetEditRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  budgetPeso: { fontFamily: 'Lora_600SemiBold', fontSize: 30, color: '#FFFFFF' },
  budgetInput: {
    flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 30, color: '#FFFFFF', padding: 0,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.4)',
  },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.mint },
  budgetStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  budgetStatValue: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: '#FFFFFF' },
  budgetStatLabel: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  budgetSplit: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 12 },
  addExpenseCard: {
    backgroundColor: Colors.cream2, borderRadius: 14, borderWidth: 1, borderColor: Colors.line, padding: 16,
  },
  expenseInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  addExpenseButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  addExpenseButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
  breakdownCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: Colors.line, padding: 16, gap: 14,
  },
  breakdownRow: { gap: 6 },
  breakdownLabel: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown900, marginRight: 10 },
  breakdownAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.brown900 },
  breakdownTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.cream2, overflow: 'hidden' },
  breakdownFill: { height: 6, borderRadius: 3, backgroundColor: Colors.card },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  expenseTitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
  expenseDesc: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 2 },
  expenseAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },

  overlay: { flex: 1, backgroundColor: 'rgba(46,27,14,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  sheetIcon: { fontSize: 17, width: 24 },
  sheetLabel: { fontFamily: 'Lora_400Regular', fontSize: 15, color: Colors.brown900 },
});
