import AppIcon, { IconLabel } from '../../components/AppIcon';
import { Text, TextInput } from '../../components/Typography';
import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useLiveSync } from '../../hooks/useLiveSync';
import { useQueuedSave } from '../../hooks/useQueuedSave';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import {
  fetchTripById, saveTripOrQueue, deleteTrip, leaveTrip, markTripViewed,
  fetchExpenses, createExpense, deleteExpense, fetchCrew, fetchTripBookings,
} from '../../services/tripService';
import {
  getCached, getPendingSave, removePendingSave, isOffline, onOfflineChange, markTripOpen,
} from '../../services/offlineStore';
import { nearestRoute } from '../../utils/routeOptimization';
import PlaceSuggestions from '../../components/PlaceSuggestions';
import { hasCoords, getRoute } from '../../services/geoService';
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
  { icon: 'utensils', label: 'Food and Drinks', key: 'catFood' },
  { icon: 'bus', label: 'Transit', key: 'catTransit' },
  { icon: 'ticket', label: 'Activities', key: 'catActivities' },
  { icon: 'shopping', label: 'Shopping', key: 'catShopping' },
  { icon: 'car', label: 'Car Rental', key: 'catCarRental' },
  { icon: 'hotel', label: 'Lodging', key: 'catLodging' },
  { icon: 'fuel', label: 'Gas', key: 'catGas' },
  { icon: 'plane', label: 'Flights', key: 'catFlights' },
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
    myRole: data.myRole || 'viewer',
    id: data.id,
    // Sa web, ang trip.title ay ang pangalan ng "Where to go?" list.
    title: data.title || '',
    // Ang sariling pangalan ng trip (✎ sa tabi ng "Trip to …"). Walang laman = "Trip to <destination>".
    tripName: data.tripName || '',
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
    // Kasama palagi, para hindi mabura ang pangalang itinakda sa web.
    tripName: (trip.tripName || '').trim() || null,
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
  const { id } = useLocalSearchParams();
  return <TripDetailContent key={String(id)} id={id} />;
}

function TripDetailContent({ id }) {
  const router = useRouter();
  const { t, user, formatDate, formatDateRange, isLoggedIn } = useApp();
  const { confirm, alert, toast } = useDialog();

  const [trip, setTripState] = useState(null);
  const tripRef = useRef(null);
  function setTrip(next) {
    tripRef.current = next;
    setTripState(next);
  }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [saving, setSaving] = useState(false);

  // ===== Offline mode + simultaneous crew edits =====
  // baseVersion = the trip version (from the server) these edits started
  // from; the server refuses a save with 409 if a crewmate saved in between.
  const baseVersionRef = useRef(null);
  const [offline, setOfflineState] = useState(isOffline());
  const [savedOnPhone, setSavedOnPhone] = useState(false);
  useEffect(() => onOfflineChange(setOfflineState), []);
  useEffect(() => markTripOpen(id), [id]);

  const persistence = useQueuedSave(async (body) => {
    let result;
    try {
      result = await saveTripOrQueue(id, body, baseVersionRef.current);
    } catch (e) {
      if (e.status !== 409) throw e;
      const keepMine = await confirm({
        title: t('tripChangedTitle'),
        message: t('tripChangedMessage'),
        confirmLabel: t('keepMyChanges'),
        cancelLabel: t('loadLatestVersion'),
      });
      if (!keepMine) {
        // Drop this edit and show what the crewmate saved.
        await removePendingSave(id);
        setSavedOnPhone(false);
        setTimeout(() => { void loadTrip(() => true, true); }, 0);
        return;
      }
      result = await saveTripOrQueue(id, body, null); // replace theirs
    }
    setSavedOnPhone(result.queued);
    if (result.data?.version) baseVersionRef.current = result.data.version;
  });
  const canEdit = trip?.myRole === 'owner' || trip?.myRole === 'editor';
  const navigation = useNavigation();
  const dirty = !!trip && canEdit && (!!persistence.savedBody && JSON.stringify(buildSaveBody(trip)) !== persistence.savedBody || persistence.status !== 'saved');
  const [discarding, setDiscarding] = useState(false);
  usePreventRemove(isLoggedIn && !discarding && dirty, ({ data }) => {
    if (persistence.status === 'saving') { toast(t('savingLabel')); return; }
    void confirm({ title: t('pendingSave'), message: persistence.error, confirmLabel: t('discardChanges'), cancelLabel: t('keepEditing'), danger: true }).then((discard) => {
      if (discard) { setDiscarding(true); setTimeout(() => navigation.dispatch(data.action), 0); }
    });
  });
  const [sectionError, setSectionError] = useState(false);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [expensePlace, setExpensePlace] = useState('');

  const [crew, setCrew] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [activeDayKey, setActiveDayKey] = useState(null);
  const [dayInputs, setDayInputs] = useState({});

  const [selectedPlaceKeys, setSelectedPlaceKeys] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  // Kapag galing sa trash ng isang list ang pag-select, dito ipinapakita
  // ang bar (select all / delete selected / delete whole list).
  const [selectingSectionKey, setSelectingSectionKey] = useState(null);
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


  // Kapag nahanap ang coordinates ng isang place, i-save sa lahat ng
  // place na may parehong pangalan at wala pang coordinates.
  useAutoGeocode(canEdit ? trip : null, (name, coords) => {
    const base = tripRef.current;
    if (!base || !['owner', 'editor'].includes(base.myRole)) return;
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
      }
    );
  });

  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  async function loadResources() {
    const results = await Promise.allSettled([fetchExpenses(id), fetchCrew(id), fetchTripBookings(id)]);
    if (results[0].status === 'fulfilled') setExpenses(results[0].value.filter((e) => !e.placeId));
    if (results[1].status === 'fulfilled') setCrew(results[1].value);
    if (results[2].status === 'fulfilled') setBookings(results[2].value);
    setSectionError(results.some((r) => r.status === 'rejected'));
  }

  async function loadTrip(isCurrent = () => true, force = false) {
    // Offline mode: edits saved on this phone go up first (auto-sync), so
    // the server copy never overwrites them.
    const pending = force ? null : await getPendingSave(id);
    if (pending) {
      if (!tripRef.current) {
        const cached = await getCached(`trip:${id}`);
        if (cached && isCurrent()) {
          const local = hydrateTrip({ ...cached, ...pending.body, sections: pending.body.sections });
          setTrip(local);
          baseVersionRef.current = pending.baseVersion || null;
          setSavedOnPhone(true);
          const localDays = buildDaysFromRange(local.startDate, local.endDate);
          setActiveDayKey((prev) => localDays.some((d) => d.key === prev) ? prev : localDays[0]?.key);
          setLoading(false);
          void loadResources();
        }
      }
      if (tripRef.current) {
        if (persistence.status !== 'saving') await persistence.save(buildSaveBody(tripRef.current));
        return;
      }
    }
    if (dirtyRef.current && !force) { await loadResources(); return; }
    if (force) dirtyRef.current = false;
    const snapshot = tripRef.current;
    try {
      const data = await fetchTripById(id);
      if (!isCurrent() || (!force && (dirtyRef.current || tripRef.current !== snapshot))) return;
      const hydrated = hydrateTrip(data);
      if (force || !snapshot || JSON.stringify(buildSaveBody(snapshot)) !== JSON.stringify(buildSaveBody(hydrated)) || snapshot.myRole !== hydrated.myRole) {
        setTrip(hydrated); tripRef.current = hydrated;
      }
      baseVersionRef.current = data.version || null;
      if (!isOffline()) setSavedOnPhone(false);
      persistence.accept(buildSaveBody(hydrated));
      setLoadError(null);
      void markTripViewed(id);
      const days = buildDaysFromRange(hydrated.startDate, hydrated.endDate);
      setActiveDayKey((prev) => days.some((d) => d.key === prev) ? prev : days[0]?.key);
      await loadResources();
    } catch (e) {
      if (!isCurrent()) return;
      if (tripRef.current) setSectionError(true);
      else setLoadError(e.status === 404 ? t('tripNotFoundOrLinkInvalid') : e.message);
    } finally { if (isCurrent()) setLoading(false); }
  }

  useLiveSync((isCurrent) => loadTrip(isCurrent), { resourceKey: String(id), interval: 15000 });

  async function persist(nextTrip) {
    if (!nextTrip || !['owner', 'editor'].includes(nextTrip.myRole)) return false;
    tripRef.current = nextTrip;
    setTrip(nextTrip);
    dirtyRef.current = true;
    return persistence.save(buildSaveBody(nextTrip));
  }

  const isOwner = crew.some((m) => m.isOwner && user && m.userId === user.userId);

  function updateSectionField(sectionKey, field, value) {
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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

  function startSelecting(placeKey = null, sectionKey = null) {
    if (!canEdit) return;
    setExpandedPlaceKey(null);
    setIsSelecting(true);
    setSelectingSectionKey(sectionKey);
    setSelectedPlaceKeys(placeKey ? [placeKey] : []);
  }

  // Trash sa tabi ng list: lalabas ang checkbox sa bawat lugar para
  // mapili kung alin ang buburahin (hindi na agad binubura ang buong list).
  function onSectionTrash(section) {
    if (!canEdit) return;
    if (section.places.length === 0) { deleteList(section.key); return; }
    if (isSelecting && selectingSectionKey === section.key) { cancelSelecting(); return; }
    startSelecting(null, section.key);
  }

  function togglePlaceSelected(placeKey) {
    setSelectedPlaceKeys((prev) =>
      prev.includes(placeKey) ? prev.filter((k) => k !== placeKey) : [...prev, placeKey]
    );
  }

  function cancelSelecting() {
    setIsSelecting(false);
    setSelectingSectionKey(null);
    setSelectedPlaceKeys([]);
  }

  // section = galing sa trash ng list na iyon (may "Select all" at
  // "Delete whole list"); null = ang dating bar sa ibaba.
  function renderSelectBar(section) {
    const count = selectedPlaceKeys.length;
    const sectionKeys = section ? section.places.map((p) => p.key) : [];
    const allChosen = section && sectionKeys.length > 0 && sectionKeys.every((k) => selectedPlaceKeys.includes(k));
    return (
      <View style={styles.assignBar}>
        <Text style={styles.assignBarTitle}>
          {count > 0 ? `${count} ${t('placesSelectedAddTo')}` : t('selectPlacesToDelete')}
        </Text>
        {count > 0 && (days.length === 0 ? (
          <Text style={[styles.emptyTextSmall, { color: 'rgba(255,255,255,0.7)' }]}>{t('setDatesToAssign')}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((day) => (
              <TouchableOpacity key={day.key} style={styles.assignBarDayPill} onPress={() => assignSelectedToDay(day.key)}>
                <Text style={styles.assignBarDayPillText}>{day.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ))}
        {section && (
          <View style={styles.assignBarBottomRow}>
            <TouchableOpacity onPress={() => setSelectedPlaceKeys(allChosen ? [] : sectionKeys)}>
              <Text style={styles.assignBarCancel}>{allChosen ? t('clearSelection') : t('selectAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { cancelSelecting(); deleteList(section.key); }}>
              <Text style={styles.assignBarDelete}>{t('deleteThisListTitle')}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.assignBarBottomRow}>
          <TouchableOpacity onPress={deleteSelected} disabled={count === 0} style={count === 0 && { opacity: 0.4 }}>
            <IconLabel name="trash" textStyle={styles.assignBarDelete}>{t('deleteSelected')}</IconLabel>
          </TouchableOpacity>
          <TouchableOpacity onPress={cancelSelecting}>
            <Text style={styles.assignBarCancel}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
    setSelectingSectionKey(null);
    if (await persist(nextTrip)) toast(t('addedToDay'));
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
    setSelectingSectionKey(null);
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

  async function optimizeDay(dayKey) {
    if (!canEdit || optimizing) return;
    const snapshot = tripRef.current;
    const stops = sortStops(snapshot.sections.flatMap((s) => s.places).filter((p) => p.itineraryDate === dayKey));
    if (stops.length < 3) return;
    if (stops.length > 12) { toast(t('optimizeLimit')); return; }
    if (stops.some((p) => !hasCoords(p))) { toast(t('locateAllStops')); return; }
    setOptimizing(dayKey);
    try {
      const candidate = nearestRoute(stops);
      if (candidate.every((p, i) => p.key === stops[i].key)) { toast(t('routeUnchanged')); return; }
      const duration = async (list) => {
        let total = 0;
        for (let i = 1; i < list.length; i++) {
          const route = await getRoute(list[i - 1], list[i], 'driving');
          if (route.estimated) throw new Error(t('networkError'));
          total += route.durationMin;
        }
        return total;
      };
      const [before, after] = await Promise.all([duration(stops), duration(candidate)]);
      if (after >= before) { toast(t('routeUnchanged')); return; }
      if (!(await confirm({ title: t('optimizeDay'), message: `${before} min → ${after} min`, confirmLabel: t('save'), cancelLabel: t('cancel') }))) return;
      if (tripRef.current !== snapshot) { toast(t('tryAgain')); return; }
      const order = Object.fromEntries(candidate.map((p, i) => [p.key, i]));
      const ok = await persist({ ...snapshot, sections: snapshot.sections.map((section) => ({ ...section, places: section.places.map((p) => p.key in order ? { ...p, itineraryOrder: order[p.key] } : p) })) });
      if (ok) toast(t('routeUpdated'));
    } catch (e) { toast(e.message); }
    finally { setOptimizing(null); }
  }

  async function addSuggestion(sectionKey, item) {
    if (!canEdit) return;
    const base = tripRef.current;
    // Huwag nang idagdag ulit kung nasa section na (dati, bawat tap sa
    // suggestion ay nagdadagdag ng kapareho). tripRef ay agad na-a-update
    // ng persist, kaya kahit sunod-sunod ang tap ay isa lang ang madadagdag.
    const key = String(item.name || '').trim().toLowerCase();
    const target = base?.sections.find((section) => section.key === sectionKey);
    if (!key || !target || target.places.some((p) => String(p.name || '').trim().toLowerCase() === key)) return;
    const place = { ...makePlace(item.name), latitude: Number(item.lat), longitude: Number(item.lon) };
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return;
    await persist({ ...base, sections: base.sections.map((section) => section.key === sectionKey ? { ...section, placeInput: '', places: [...section.places, place] } : section) });
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
    if (!canEdit || saving) return;
    const amount = parseFloat(String(expenseAmount).replace(/,/g, ''));
    if (!expenseCategory || isNaN(amount) || amount <= 0) {
      toast(t('expenseAmountRequired'));
      return;
    }
    setSaving(true);
    try {
      const selected = tripRef.current.sections.flatMap((s) => s.places).find((p) => p.key === expensePlace);
      const created = await createExpense(id, {
        category: selected ? selected.name.slice(0, 50) : expenseCategory,
        expenseDate: selected?.itineraryDate || null,
        amount,
        description: expenseDesc.trim(),
      });
      setExpenses((prev) => [...prev, created]);
      setExpenseAmount('');
      setExpenseDesc('');
      setExpensePlace('');
      toast(t('expenseAdded'));
    } catch (e) {
      alert(t('saveFailed'), e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(expense) {
    if (!canEdit) return;
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
      readOnly: !canEdit,
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
          <IconLabel name="arrow-left" textStyle={styles.backLink}>{t('goHome')}</IconLabel>
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
    const key = c.placeName;
    byCategory[key] = (byCategory[key] || 0) + (Number(c.amount) || 0);
  });
  const categoryRows: [string, number][] = Object.entries(byCategory).map(([k, v]) => [k, Number(v)] as [string, number]).sort((a, b) => b[1] - a[1]);
  const catMeta = (label) => EXPENSE_CATEGORIES.find((c) => c.label === label);
  const catLabel = (label) => (catMeta(label) ? t(catMeta(label).key) : label);

  const bookingsOnDay = (dayKey) =>
    bookings.filter((b) => b.checkIn <= dayKey && (b.checkOut ? dayKey < b.checkOut : dayKey === b.checkIn));

  // "Trip to Lucena" hangga't hindi pinapalitan ng student ang pangalan.
  const defaultTripName = trip.destination ? `${t('tripToPrefix')} ${trip.destination}` : t('untitledTrip');
  const tripName = (trip.tripName || '').trim() || defaultTripName;
  const finishRename = () => {
    setEditingName(false);
    const current = tripRef.current;
    // Ibinalik sa default? Susunod ulit ang pangalan sa destinasyon.
    const next = (current.tripName || '').trim() === defaultTripName ? { ...current, tripName: '' } : current;
    persist(next);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 }}
        stickyHeaderIndices={[3]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
          handleScroll(e, days);
        }}
      >
        {/* 0: Hero */}
        <View style={styles.hero}>
          <DestinationImage name={trip.destination} style={StyleSheet.absoluteFill} iconSize={50} />
          <View style={styles.heroShade} />
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} style={styles.heroIconButton} accessibilityLabel={t('back')}>
              <AppIcon name="arrow-left" style={styles.heroIconText} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setInviteOpen(true)} style={styles.heroIconButton} accessibilityLabel={t('inviteYourCrew')}>
                <AppIcon name="users" style={styles.heroIconText} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.heroIconButton} accessibilityLabel={t('moreActions')}>
                <AppIcon name="more" style={styles.heroIconText} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 1: Title card */}
        <View style={styles.titleCard}>
          <View style={styles.titleRow}>
            {editingName ? (
              <TextInput
                style={[styles.tripName, styles.tripNameInput]}
                value={trip.tripName ?? ''}
                placeholder={defaultTripName}
                placeholderTextColor={GREY_PLACEHOLDER}
                onChangeText={(text) => setTrip({ ...trip, tripName: text })}
                onBlur={finishRename}
                onSubmitEditing={finishRename}
                maxLength={150}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
              />
            ) : (
              <Text style={styles.tripName} numberOfLines={2}>{tripName}</Text>
            )}
            {canEdit && !editingName && (
              <TouchableOpacity onPress={() => setEditingName(true)} hitSlop={10} accessibilityLabel={t('renameTrip')}>
                <AppIcon name="pencil" style={styles.editHint} />
              </TouchableOpacity>
            )}
          </View>

          {canEdit ? (
            <View accessibilityLiveRegion="polite" style={styles.saveStatus}>
              {persistence.status === 'saving' ? <ActivityIndicator size="small" color={Colors.brown600} /> : (
                <AppIcon name={persistence.status === 'failed' ? 'warning' : dirty ? 'clock' : 'check'} size={15} color={persistence.status === 'failed' ? Colors.error : Colors.teal} />
              )}
              <TouchableOpacity
                accessibilityRole="button"
                disabled={persistence.status === 'saving' || (!dirty && persistence.status !== 'failed')}
                onPress={() => persist(tripRef.current)}
                hitSlop={10}
              >
                <Text style={[styles.saveStatusText, persistence.status === 'failed' && { color: Colors.error }]}>
                  {t(persistence.status === 'failed' ? 'saveFailedRetry' : persistence.status === 'saving' ? 'savingLabel' : dirty ? 'unsavedLabel' : savedOnPhone ? 'savedOnPhone' : 'savedLabel')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : <Text style={styles.saveStatusText}>{t('viewOnlyNotice')}</Text>}

          {offline && (
            <View style={styles.offlineBanner}>
              <AppIcon name="info" size={15} color={Colors.brown600} />
              <Text style={styles.offlineText}>{t(canEdit ? 'offlineBannerEdit' : 'offlineBannerView')}</Text>
            </View>
          )}

          <TouchableOpacity disabled={!canEdit} onPress={() => setDatesOpen(true)} style={styles.metaButton} activeOpacity={0.7}>
            <IconLabel name="calendar" textStyle={styles.tripDates}>{trip.startDate || trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : t('setTripDates')}</IconLabel>
            {canEdit && <AppIcon name="pencil" style={styles.editHint} />}
          </TouchableOpacity>

          <View style={styles.metaRow}>
            <View style={styles.buddiesRow}>
              <IconLabel name="user" textStyle={styles.tripDates}>{t('travelBuddies')}</IconLabel>
              <TouchableOpacity style={[styles.miniCounter, (!canEdit || !trip.travelBuddiesCount) && styles.controlDisabled]} accessibilityLabel={`${t('remove')} ${t('travelBuddies')}`} disabled={!canEdit || !trip.travelBuddiesCount} onPress={() => changeBuddies(-1)} hitSlop={6}>
                <AppIcon name="minus" style={styles.miniCounterText} />
              </TouchableOpacity>
              <Text style={styles.buddiesValue}>{trip.travelBuddiesCount}</Text>
              <TouchableOpacity style={[styles.miniCounter, !canEdit && styles.controlDisabled]} accessibilityLabel={`${t('add')} ${t('travelBuddies')}`} disabled={!canEdit} onPress={() => changeBuddies(1)} hitSlop={6}>
                <AppIcon name="plus" style={styles.miniCounterText} />
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

        <View style={styles.tripActions}>

          {!!sectionError && <TouchableOpacity onPress={loadResources}><Text style={{ color: Colors.error }}>{t('sectionLoadFailed')}</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" style={styles.tourDayButton} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: String(id) } } as any)}>
            <IconLabel name="calendar" textStyle={styles.tourDayButtonText}>{t('tourDay')}</IconLabel>
            <AppIcon name="chevron-right" size={18} color={Colors.brown600} />
          </TouchableOpacity>
        </View>

        {/* 3: Sticky header — tabs, at day pills kapag nasa Itinerary */}
        <View style={styles.stickyHeader} onLayout={(e) => (stickyHeaderHeightRef.current = e.nativeEvent.layout.height)}>
          <View style={styles.tabBar}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.key }}
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeDayKey === day.key }}
                  style={[styles.dayPill, activeDayKey === day.key && styles.dayPillActive]}
                  onPress={() => scrollToDay(day.key)}
                >
                  <Text style={[styles.dayPillText, activeDayKey === day.key && styles.dayPillTextActive]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 4: Tab content */}
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
                    <AppIcon name="hotel" style={{ fontSize: 14 }} />
                  </View>
                  <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>{t('yourBookings')}</Text>
                  <TouchableOpacity onPress={openHotels}>
                    <IconLabel name="plus" textStyle={styles.linkAction}>{t('bookAHotel')}</IconLabel>
                  </TouchableOpacity>
                </View>
                {bookings.length === 0 ? (
                  <Text style={styles.emptyTextSmall}>{t('noBookingsForTrip')}</Text>
                ) : (
                  bookings.map((b) => (
                    <IconLabel name="hotel" textStyle={styles.bookingLine} key={b.id}>{b.placeName} · {formatDate(b.checkIn, 'short')}
                      {b.checkOut ? ` → ${formatDate(b.checkOut, 'short')}` : ''}
                      {b.bookingSite ? ` · ${b.bookingSite}` : ''}</IconLabel>
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
                      <AppIcon name="pin" style={{ fontSize: 14 }} />
                    </View>
                    {section.isDefault ? (
                      <TextInput
                        editable={canEdit}
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
                        editable={canEdit}
                          style={styles.listTitleInput}
                          placeholder={t('nameThisSectionPlaceholder')}
                          placeholderTextColor={GREY_PLACEHOLDER}
                          value={section.name}
                          onChangeText={(text) => updateSectionField(section.key, 'name', text)}
                          onEndEditing={() => persist(tripRef.current)}
                        />
                        <TouchableOpacity disabled={!canEdit} onPress={() => onSectionTrash(section)} hitSlop={8} accessibilityLabel={t('deleteThisListTitle')}>
                          <AppIcon name="trash" style={{ fontSize: 14, color: Colors.brown600 }} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {isSelecting && selectingSectionKey === section.key && renderSelectBar(section)}
                  {section.places.length === 0 && <Text style={styles.emptyTextSmall}>{t('noPlacesInListYet')}</Text>}

                  {section.places.map((place, pIndex) => {
                    // Kapag galing sa trash ng isang list, iyon lang ang mapipili.
                    const selectable = isSelecting && (!selectingSectionKey || selectingSectionKey === section.key);
                    const isSelected = selectedPlaceKeys.includes(place.key);
                    const isExpanded = expandedPlaceKey === place.key;
                    return (
                      <View key={place.key} style={{ marginBottom: 10 }}>
                        <SwipeToDelete
                          label={t('dialogDelete')}
                          disabled={!canEdit || selectable || isExpanded}
                          onDelete={() => deletePlace(section.key, place.key)}
                        >
                          <PlaceCard
                            place={place}
                            index={pIndex}
                            expanded={isExpanded}
                            selecting={selectable}
                            selected={isSelected}
                            dayLabel={dayLabelFor(place.itineraryDate)}
                            onPress={() => {
                              if (selectable) togglePlaceSelected(place.key);
                              else setExpandedPlaceKey(isExpanded ? null : place.key);
                            }}
                            onLongPress={() => {
                              if (canEdit && !isSelecting) startSelecting(place.key);
                            }}
                            {...placeCardHandlers(section.key, place)}
                          />
                        </SwipeToDelete>
                      </View>
                    );
                  })}

                  {canEdit && <PlaceSuggestions destination={trip.destination} sectionName={section.name} query={section.placeInput} exclude={section.places.map((p) => p.name)} onSelect={(item) => addSuggestion(section.key, item)} />}
                  <View pointerEvents={canEdit ? 'auto' : 'none'} style={[styles.addPlaceRow, !canEdit && { display: 'none' }]}>
                    <TextInput
                        editable={canEdit}
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
                      <AppIcon name="pencil" style={{ fontSize: 15 }} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconSquareButton, isSelecting && styles.iconSquareButtonActive]}
                      onPress={() => (isSelecting ? cancelSelecting() : startSelecting())}
                      accessibilityLabel={t('selectPlaces')}
                    >
                      <AppIcon name="square-check" style={{ fontSize: 15 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity disabled={!canEdit} style={[styles.newListButtonMinimal, !canEdit && { display: 'none' }]} onPress={addNewList}>
                <IconLabel name="plus" textStyle={styles.newListButtonMinimalText}>{t('newListBtn')}</IconLabel>
              </TouchableOpacity>

              {isSelecting && !selectingSectionKey && selectedPlaceKeys.length > 0 && renderSelectBar(null)}
            </>
          )}

          {activeTab === 'Itinerary' && (
            <>
              {days.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <AppIcon name="calendar" style={{ fontSize: 30 }} />
                  <Text style={styles.emptyStateTitle}>{t('noDatesSetYet')}</Text>
                  <Text style={[styles.emptyText, { textAlign: 'center' }]}>{t('setDatesForDays')}</Text>
                  <TouchableOpacity style={[styles.addExpenseButton, { paddingHorizontal: 20, marginTop: 8 }]} disabled={!canEdit} onPress={() => setDatesOpen(true)}>
                    <IconLabel name="calendar" textStyle={styles.addExpenseButtonText}>{t('setTripDates')}</IconLabel>
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
                      <View style={styles.dayHeader}>
                        <Text accessibilityRole="header" style={styles.dayHeading}>{day.label}</Text>
                        <Text style={styles.stopCount}>{stops.length} {t(stops.length === 1 ? 'itineraryStop' : 'itineraryStops')}</Text>
                      </View>
                      {canEdit && stops.length >= 3 && <TouchableOpacity accessibilityRole="button" disabled={!!optimizing} onPress={() => optimizeDay(day.key)} style={{ paddingVertical: 12 }}><Text style={styles.linkAction}>{t(optimizing === day.key ? 'optimizing' : 'optimizeDay')}</Text></TouchableOpacity>}

                      {stays.map((b) => (
                        <View key={`stay-${b.id}`} style={styles.stayBanner}>
                          <IconLabel name="hotel" textStyle={styles.stayText}>{b.checkIn === day.key ? t('checkInAt') : t('bookingStaying')} {b.placeName}</IconLabel>
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
                                disabled={!canEdit || isExpanded}
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
                              {canEdit && isExpanded && stops.length > 1 && (
                                <View style={styles.reorderRow}>
                                  <TouchableOpacity disabled={index === 0} onPress={() => moveStop(day.key, place.key, -1)} style={[styles.reorderButton, index === 0 && { opacity: 0.35 }]}>
                                    <IconLabel name="arrow-up" textStyle={styles.reorderText}>{t('moveUp')}</IconLabel>
                                  </TouchableOpacity>
                                  <TouchableOpacity disabled={index === stops.length - 1} onPress={() => moveStop(day.key, place.key, 1)} style={[styles.reorderButton, index === stops.length - 1 && { opacity: 0.35 }]}>
                                    <IconLabel name="arrow-down" textStyle={styles.reorderText}>{t('moveDown')}</IconLabel>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                            {next && <DirectionsConnector from={place} to={next} destination={trip.destination} />}
                          </View>
                        );
                      })}


                  <View pointerEvents={canEdit ? 'auto' : 'none'} style={[styles.addPlaceRow, !canEdit && { display: 'none' }]}>
                        <TextInput
                        editable={canEdit}
                          style={styles.addPlaceInput}
                          placeholder={t('addNewPlacePlaceholder')}
                          placeholderTextColor={GREY_PLACEHOLDER}
                          value={dayInputs[day.key] || ''}
                          onChangeText={(text) => setDayInputs((prev) => ({ ...prev, [day.key]: text }))}
                          onSubmitEditing={() => addPlaceToDay(day.key)}
                        />
                        <TouchableOpacity style={[styles.addPlaceButton, (saving || !(dayInputs[day.key] || '').trim()) && styles.controlDisabled]} accessibilityRole="button" accessibilityLabel={t('addNewPlacePlaceholder')} onPress={() => addPlaceToDay(day.key)} disabled={saving || !(dayInputs[day.key] || '').trim()}>
                          <AppIcon name="plus" style={styles.addPlaceButtonText} />
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
                        editable={canEdit}
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
                    disabled={!canEdit} onPress={() => {
                      setBudgetInput(budget ? String(budget) : '');
                      setEditingBudget(true);
                    }}
                  >
                    <IconLabel trailing name="pencil" textStyle={styles.budgetAmount}>{budget > 0 ? formatPeso(budget) : t('setABudget')}</IconLabel>
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

              {canEdit && <Text style={styles.sectionTitle}>{t('addExpenseTitle')}</Text>}
              <View pointerEvents={canEdit ? 'auto' : 'none'} style={[styles.addExpenseCard, !canEdit && { display: 'none' }]}>
                <Text style={styles.emptyTextSmall}>{t('expenseFor')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <ChoiceChips style={{ flexWrap: 'nowrap' }} options={[{ value: '', label: t('categoryExpense') }, ...allPlaces.map((p) => ({ value: p.key, label: p.name }))]} value={expensePlace} onChange={setExpensePlace} />
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <ChoiceChips
                    style={{ flexWrap: 'nowrap' }}
                    options={EXPENSE_CATEGORIES.map((c) => ({ value: c.label, label: t(c.key), icon: c.icon }))}
                    value={expenseCategory}
                    onChange={setExpenseCategory}
                  />
                </ScrollView>
                <TextInput
                        editable={canEdit}
                  style={styles.expenseInput}
                  placeholder={`${t('amount')} (₱)`}
                  placeholderTextColor={GREY_PLACEHOLDER}
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  keyboardType="decimal-pad"
                />
                <TextInput
                        editable={canEdit}
                  style={styles.expenseInput}
                  placeholder={t('writeDescription')}
                  placeholderTextColor={GREY_PLACEHOLDER}
                  value={expenseDesc}
                  onChangeText={setExpenseDesc}
                />
                <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.onButton} />
                  ) : (
                    <IconLabel name="plus" textStyle={styles.addExpenseButtonText}>{t('addExpenseBtn')}</IconLabel>
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
                            {catLabel(label)}
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

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('dailyBreakdown')}</Text>
              <View style={styles.breakdownCard}>
                {days.length === 0 && <Text style={styles.emptyTextSmall}>{t('noDayExpenses')}</Text>}
                {days.map((day) => {
                  const expected = allPlaces.filter((p) => p.itineraryDate === day.key).reduce((sum, p) => sum + (p.costs || []).reduce((n, c) => n + Number(c.amount || 0), 0), 0);
                  const actual = expenses.filter((e) => String(e.expenseDate || '').slice(0, 10) === day.key).reduce((sum, e) => sum + Number(e.amount || 0), 0);
                  return <View key={day.key} style={styles.breakdownRow}><Text style={styles.breakdownLabel}>{formatDate(day.key, 'short')}</Text><Text style={styles.breakdownAmount}>{formatPeso(actual + expected)}</Text><Text style={styles.emptyTextSmall}>{t('expensesHeader')}: {formatPeso(actual)} · {t('expectedCost')}: {formatPeso(expected)}</Text></View>;
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('expensesHeader')}</Text>
              {expenses.length === 0 ? (
                <Text style={styles.emptyText}>{t('noExpensesYetAddOne')}</Text>
              ) : (
                expenses.map((e) => (
                  <View key={e.id} style={styles.expenseRow}>
                    <AppIcon name={catMeta(e.category)?.icon || 'pin'} size={22} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseTitle}>{catLabel(e.category)}</Text>
                      {!!e.description && <Text style={styles.expenseDesc}>{e.description}</Text>}
                    </View>
                    <Text style={styles.expenseAmount}>{formatPeso(e.amount)}</Text>
                    <TouchableOpacity disabled={!canEdit} onPress={() => handleDeleteExpense(e)} hitSlop={8} accessibilityLabel={t('dialogDelete')}>
                      <AppIcon name="x" style={{ fontSize: 14, color: Colors.brown600 }} />
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
                      <AppIcon name="pin" style={{ fontSize: 16 }} />
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
              <AppIcon name="users" style={styles.sheetIcon} />
              <Text style={styles.sheetLabel}>{t('inviteYourCrew')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetRow} disabled={!canEdit} onPress={() => { setMenuOpen(false); setDatesOpen(true); }}>
              <AppIcon name="calendar" style={styles.sheetIcon} />
              <Text style={styles.sheetLabel}>{t('changeDates')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetRow} onPress={openHotels}>
              <AppIcon name="hotel" style={styles.sheetIcon} />
              <Text style={styles.sheetLabel}>{t('bookAHotel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMenuOpen(false);
                router.push({ pathname: '/new-post', params: { place: trip.destination } });
              }}
            >
              <AppIcon name="book" style={styles.sheetIcon} />
              <Text style={styles.sheetLabel}>{t('writeAboutThisTrip')}</Text>
            </TouchableOpacity>
            {isOwner ? (
              <TouchableOpacity style={styles.sheetRow} onPress={confirmDeleteTrip}>
                <AppIcon name="trash" style={styles.sheetIcon} />
                <Text style={[styles.sheetLabel, { color: Colors.error }]}>{t('deleteTripTitle')}</Text>
              </TouchableOpacity>
            ) : crew.length > 0 ? (
              <TouchableOpacity style={styles.sheetRow} onPress={confirmLeaveTrip}>
                <AppIcon name="door" style={styles.sheetIcon} />
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
    fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: GREY_PLACEHOLDER,
    textAlign: 'center', marginTop: 8,
  },
  screen: { flex: 1, backgroundColor: Colors.cream },
  backLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.brown900 },

  hero: { height: 190, backgroundColor: Colors.cream2, position: 'relative', overflow: 'hidden' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(51,28,8,0.18)' },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12,
  },
  heroIconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  heroIconText: { fontSize: 16, color: Colors.brown900 },

  titleCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -36, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.line },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripName: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 32, letterSpacing: -0.4, color: Colors.brown900 },
  tripNameInput: { paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: Colors.line },
  metaButton: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 8, alignSelf: 'flex-start' },
  editHint: { fontSize: 12, color: Colors.brown600 },
  tripDates: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  buddiesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  miniCounter: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  miniCounterText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.brown900 },
  buddiesValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.brown900, minWidth: 14, textAlign: 'center' },
  crewRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  crewMore: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: Colors.brown600, marginLeft: 4 },

  tripActions: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  saveStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, minHeight: 24 },
  offlineBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: Colors.cream2 },
  offlineText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: Colors.brown600 },
  saveStatusText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 20, color: Colors.brown600 },
  tourDayButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line },
  tourDayButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, lineHeight: 22, color: Colors.brown900, flex: 1 },
  controlDisabled: { opacity: 0.4 },
  dayHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  stopCount: { fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 20, color: Colors.brown600, backgroundColor: Colors.cream2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stickyHeader: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.line },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 4 },
  tabItem: { flex: 1, minHeight: 52, paddingHorizontal: 4, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 21, color: Colors.brown600, textAlign: 'center' },
  tabTextActive: { fontFamily: 'Poppins_600SemiBold', color: Colors.teal },
  tabUnderline: { position: 'absolute', bottom: 0, left: 12, right: 12, height: 3, borderRadius: 2, backgroundColor: Colors.teal },

  dayPillRow: { gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  dayPill: { backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dayPillActive: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  dayPillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.brown900 },
  dayPillTextActive: { color: Colors.mint },

  tabContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: Colors.brown900, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mapCaption: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: Colors.brown600, marginBottom: 18 },
  linkAction: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: Colors.teal },

  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: Colors.line },
  bookingLine: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown900, marginTop: 4 },

  selectHint: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.cream2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  selectHintText: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: Colors.brown900, flex: 1 },
  selectHintCancel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: Colors.brown600, textDecorationLine: 'underline' },

  sectionBlock: { marginBottom: 22 },
  listTitleInput: {
    flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: Colors.brown900,
    paddingVertical: 2,
  },

  daySection: { paddingBottom: 24 },
  daySectionDivider: { borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 22 },
  dayHeading: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 32, letterSpacing: -0.4, color: Colors.brown900, flexShrink: 1 },
  stayBanner: {
    backgroundColor: Colors.tintSky, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  stayText: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: Colors.brown900 },
  reorderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  reorderButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.cream2 },
  reorderText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.brown900 },

  addPlaceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 12 },
  addPlaceInput: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown900, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 14, paddingVertical: 14 },
  addPlaceButton: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center' },
  addPlaceButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: Colors.onButton },
  iconSquareButton: { width: 44, height: 52, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  iconSquareButtonActive: { backgroundColor: Colors.tintSage, borderColor: Colors.teal },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600 },
  emptyTextSmall: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: GREY_PLACEHOLDER, paddingVertical: 4, marginBottom: 6 },

  newListButtonMinimal: { alignSelf: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 20 },
  newListButtonMinimalText: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: Colors.brown600, textDecorationLine: 'underline',
  },

  assignBar: { backgroundColor: Colors.brown900, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 20 },
  assignBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.mint, marginBottom: 10 },
  assignBarDayPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  assignBarDayPillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  assignBarBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  assignBarDelete: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#F4A19A' },
  assignBarCancel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },

  emptyStateCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.line },
  emptyStateTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.brown900 },

  budgetHero: { backgroundColor: Colors.brown900, borderRadius: 18, padding: 20, marginBottom: 24 },
  budgetLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: Colors.mint },
  budgetAmount: { fontFamily: 'Poppins_600SemiBold', fontSize: 30, color: '#FFFFFF', marginTop: 4 },
  budgetEditRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  budgetPeso: { fontFamily: 'Poppins_600SemiBold', fontSize: 30, color: '#FFFFFF' },
  budgetInput: {
    flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 30, color: '#FFFFFF', padding: 0,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.4)',
  },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.mint },
  budgetStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  budgetStatValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF' },
  budgetStatLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  budgetSplit: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 12 },
  addExpenseCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: Colors.line, padding: 20 },
  expenseInput: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  addExpenseButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  addExpenseButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: Colors.onButton },
  breakdownCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: Colors.line, padding: 20, gap: 16 },
  breakdownRow: { gap: 6 },
  breakdownLabel: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13.5, color: Colors.brown900, marginRight: 10 },
  breakdownAmount: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: Colors.brown900 },
  breakdownTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.cream2, overflow: 'hidden' },
  breakdownFill: { height: 6, borderRadius: 3, backgroundColor: Colors.card },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: Colors.line, padding: 16, marginBottom: 12 },
  expenseTitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown900 },
  expenseDesc: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 2 },
  expenseAmount: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.brown900 },

  overlay: { flex: 1, backgroundColor: 'rgba(51,28,8,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  sheetIcon: { fontSize: 17, width: 24 },
  sheetLabel: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: Colors.brown900 },
});
