import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '../../constants/theme';
import {
  fetchTripById, saveTrip, deleteTrip, markTripViewed,
  fetchExpenses, createExpense,
} from '../../services/tripService';
import Backdrop from '../../components/Backdrop';
import SwipeToDelete from '../../components/SwipeToDelete';
import PlaceCard from '../../components/PlaceCard';
import { useAutoGeocode } from '../../hooks/useAutoGeocode';

const TABS = [
  { key: 'Overview', icon: '📋' },
  { key: 'Itinerary', icon: '🗓️' },
  { key: 'Budget', icon: '💰' },
];

const GREY_PLACEHOLDER = '#A8A29B';

function formatDayLabel(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function buildDaysFromRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    days.push({ key: iso, label: formatDayLabel(iso) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function hydrateTrip(data) {
  const sections = (data.sections || []).map((s, i) => ({
    key: `section_${i}_${Date.now()}`,
    isDefault: !!s.isDefault,
    name: s.name || '',
    placeInput: '',
    places: (s.places || []).map((p, j) => ({
      key: `place_${i}_${j}_${Date.now()}`,
      name: p.name,
      itineraryDate: p.itineraryDate || null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      notes: p.notes || '',
      scheduledTime: p.scheduledTime || '',
      visited: !!p.visited,
      costs: (p.costs || []).map((c, k) => ({
        id: `cost_${i}_${j}_${k}_${Date.now()}`,
        category: c.category,
        amount: Number(c.amount) || 0,
      })),
    })),
  }));

  if (sections.length === 0) {
    sections.push({ key: 'section_default', isDefault: true, name: data.title, placeInput: '', places: [] });
  }

  return {
    id: data.id,
    title: data.title,
    destination: data.destination,
    startDate: data.startDate,
    endDate: data.endDate,
    travelBuddiesCount: data.travelBuddiesCount || 0,
    budgetTotal: data.budgetTotal || 0,
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
      name: s.name,
      sortOrder: i,
      places: s.places.map((p, j) => ({
        name: p.name,
        itineraryDate: p.itineraryDate,
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

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [saving, setSaving] = useState(false);

  // Itinerary: naka-highlight na pill + hiwalay na "Add a place" input kada araw
  const [activeDayKey, setActiveDayKey] = useState(null);
  const [dayInputs, setDayInputs] = useState({});

  const [selectedPlaceKeys, setSelectedPlaceKeys] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [expandedPlaceKey, setExpandedPlaceKey] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Para sa scroll-to-day at auto-highlight ng pill habang nag-i-scroll
  const scrollRef = useRef(null);
  const stickyHeaderHeightRef = useRef(0);
  const tabContentYRef = useRef(0);
  const dayOffsetsRef = useRef({});
  const scrollLockRef = useRef(false);

    // Laging pinakabagong trip, para sa mga background na gawain (geocoding)
  const tripRef = useRef(null);
  tripRef.current = trip;

  // Kapag nahanap ang coordinates ng isang place, i-save sa lahat ng
  // place na may parehong pangalan at wala pang coordinates.
  useAutoGeocode(trip, (name, coords) => {
    const base = tripRef.current;
    if (!base) return;
    persist({
      ...base,
      sections: base.sections.map((s) => ({
        ...s,
        places: s.places.map((p) =>
          p.name === name && (p.latitude == null || p.longitude == null)
            ? { ...p, latitude: coords.latitude, longitude: coords.longitude }
            : p
        ),
      })),
    });
  });

  async function loadTrip() {
    try {
      const data = await fetchTripById(id);
      const hydrated = hydrateTrip(data);
      setTrip(hydrated);
      markTripViewed(id);

      const days = buildDaysFromRange(hydrated.startDate, hydrated.endDate);
      setActiveDayKey((prev) => prev || (days[0] && days[0].key));

      const expData = await fetchExpenses(id);
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (e) {
      setTrip(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTrip().finally(() => setLoading(false));
    }, [id])
  );

  async function persist(nextTrip) {
    setTrip(nextTrip);
    setSaving(true);
    try {
      await saveTrip(id, buildSaveBody(nextTrip));
    } catch (e) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateTripTitle(value) {
    setTrip({ ...trip, title: value });
  }

  function updateSectionField(sectionKey, field, value) {
    setTrip({
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey ? { ...s, [field]: value } : s
      ),
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

  async function addPlaceToSection(sectionKey) {
    const section = trip.sections.find((s) => s.key === sectionKey);
    if (!section || !section.placeInput.trim()) return;
    const newPlace = {
      key: `place_${Date.now()}`,
      name: section.placeInput.trim(),
      itineraryDate: null,
      latitude: null,
      longitude: null,
      notes: '',
      scheduledTime: '',
      visited: false,
      costs: [],
    };
    await persist({
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, places: [...s.places, newPlace], placeInput: '' }
          : s
      ),
    });
  }

  function addNewList() {
    setTrip({
      ...trip,
      sections: [
        ...trip.sections,
        { key: `section_${Date.now()}`, isDefault: false, name: '', placeInput: '', places: [] },
      ],
    });
  }

  function startSelecting(placeKey) {
    setExpandedPlaceKey(null);
    setIsSelecting(true);
    setSelectedPlaceKeys([placeKey]);
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

  async function assignSelectedToDay(dayKey) {
    if (selectedPlaceKeys.length === 0) return;
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) => ({
        ...s,
        places: s.places.map((p) =>
          selectedPlaceKeys.includes(p.key) ? { ...p, itineraryDate: dayKey } : p
        ),
      })),
    };
    setSelectedPlaceKeys([]);
    setIsSelecting(false);
    await persist(nextTrip);
  }

  async function deletePlace(sectionKey, placeKey) {
    if (expandedPlaceKey === placeKey) setExpandedPlaceKey(null);
    await persist({
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, places: s.places.filter((p) => p.key !== placeKey) }
          : s
      ),
    });
  }

  async function removeFromDay(sectionKey, placeKey) {
    if (expandedPlaceKey === placeKey) setExpandedPlaceKey(null);
    await updatePlaceAndSave(sectionKey, placeKey, (p) => ({ ...p, itineraryDate: null }));
  }

  async function deleteSelected() {
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
    const newPlace = {
      key: `place_${Date.now()}`,
      name: text,
      itineraryDate: dayKey,
      latitude: null,
      longitude: null,
      notes: '',
      scheduledTime: '',
      visited: false,
      costs: [],
    };
    setDayInputs((prev) => ({ ...prev, [dayKey]: '' }));
    await persist({
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === defaultSection.key ? { ...s, places: [...s.places, newPlace] } : s
      ),
    });
  }

  async function toggleVisited(sectionKey, placeKey) {
    await updatePlaceAndSave(sectionKey, placeKey, (p) => ({ ...p, visited: !p.visited }));
  }

  async function handleAddExpense() {
    if (!expenseCategory.trim() || !expenseAmount.trim()) return;
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount)) return;
    setSaving(true);
    try {
      const created = await createExpense(id, {
        category: expenseCategory.trim(),
        amount,
        description: expenseDesc.trim(),
      });
      setExpenses((prev) => [...prev, created]);
      setExpenseCategory('');
      setExpenseAmount('');
      setExpenseDesc('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteTrip() {
    Alert.alert('Delete this trip?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(id);
          router.replace('/(tabs)/home');
        },
      },
    ]);
  }

  function placeCardHandlers(sectionKey, place) {
    return {
      onChangeNotes: (text) => updatePlaceLocal(sectionKey, place.key, { notes: text }),
      onEndNotes: () => persist(trip),
      onToggleVisited: () => toggleVisited(sectionKey, place.key),
      onSetTime: (value) =>
        updatePlaceAndSave(sectionKey, place.key, (p) => ({ ...p, scheduledTime: value || '' })),
      onAddCost: (cost) =>
        updatePlaceAndSave(sectionKey, place.key, (p) => ({ ...p, costs: [...(p.costs || []), cost] })),
      onRemoveCost: (costId) =>
        updatePlaceAndSave(sectionKey, place.key, (p) => ({
          ...p,
          costs: (p.costs || []).filter((c) => c.id !== costId),
        })),
    };
  }

  // Pag-tap ng day pill: i-scroll papunta sa araw na iyon.
  function scrollToDay(dayKey) {
    setActiveDayKey(dayKey);
    const sectionY = dayOffsetsRef.current[dayKey];
    if (sectionY == null || !scrollRef.current) return;
    const target = tabContentYRef.current + sectionY - stickyHeaderHeightRef.current;
    // Habang gumagalaw ang animated scroll, huwag munang galawin ng
    // scroll-spy ang pill para hindi ito kumislap sa ibang araw.
    scrollLockRef.current = true;
    scrollRef.current.scrollTo({ y: Math.max(0, target), animated: true });
    setTimeout(() => {
      scrollLockRef.current = false;
    }, 500);
  }

  // Habang nag-i-scroll: i-highlight ang araw na kasalukuyang nakikita.
  function handleScroll(e, days) {
    if (activeTab !== 'Itinerary' || scrollLockRef.current || days.length === 0) return;
    const viewTop = e.nativeEvent.contentOffset.y + stickyHeaderHeightRef.current + 24;
    let current = days[0].key;
    for (const day of days) {
      const sectionY = dayOffsetsRef.current[day.key];
      if (sectionY != null && tabContentYRef.current + sectionY <= viewTop) {
        current = day.key;
      }
    }
    if (current !== activeDayKey) setActiveDayKey(current);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brown900} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Trip not found.</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={{ marginTop: 16 }}>
            <Text style={styles.backLink}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const days = buildDaysFromRange(trip.startDate, trip.endDate);
  const dayLabelFor = (iso) => days.find((d) => d.key === iso)?.label;
  const allPlaces = trip.sections.flatMap((s) =>
    s.places.map((p) => ({ ...p, sectionKey: s.key }))
  );
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 40 }}
          stickyHeaderIndices={[2]}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => handleScroll(e, days)}
        >
          {/* 0: Hero */}
          <View style={styles.hero}>
            <Backdrop height={160} style={styles.heroBackdrop} />
            <View style={styles.heroTopRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.heroIconButton}>
                <Text style={styles.heroIconText}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteTrip} style={styles.heroIconButton}>
                <Text style={styles.heroIconText}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 1: Title card */}
          <View style={styles.titleCard}>
            <TextInput
              style={styles.tripName}
              value={trip.title}
              onChangeText={updateTripTitle}
              onEndEditing={() => persist(trip)}
              placeholder="Trip name"
              placeholderTextColor={GREY_PLACEHOLDER}
            />
            <View style={styles.titleRow}>
              {(trip.startDate || trip.endDate) && (
                <Text style={styles.tripDates}>
                  📅 {trip.startDate || '?'} – {trip.endDate || '?'}
                </Text>
              )}
              {saving && <ActivityIndicator size="small" color={Colors.brown600} />}
            </View>
          </View>

          {/* 2: Sticky header — tabs, at day pills kapag nasa Itinerary */}
          <View
            style={styles.stickyHeader}
            onLayout={(e) => {
              stickyHeaderHeightRef.current = e.nativeEvent.layout.height;
            }}
          >
            <View style={styles.tabBar}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => {
                    setActiveTab(tab.key);
                    setExpandedPlaceKey(null);
                    if (tab.key === 'Itinerary' && !activeDayKey && days[0]) {
                      setActiveDayKey(days[0].key);
                    }
                  }}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.key}
                  </Text>
                  {activeTab === tab.key && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'Itinerary' && days.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayPillRow}
              >
                {days.map((day) => (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayPill, activeDayKey === day.key && styles.dayPillActive]}
                    onPress={() => scrollToDay(day.key)}
                  >
                    <Text style={[styles.dayPillText, activeDayKey === day.key && styles.dayPillTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 3: Tab content */}
          <View
            style={styles.tabContent}
            onLayout={(e) => {
              tabContentYRef.current = e.nativeEvent.layout.y;
            }}
          >
            {activeTab === 'Overview' && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#B8D4D9' }]}>
                    <Text style={{ fontSize: 14 }}>📝</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Notes</Text>
                </View>
                <View style={styles.notesCard}>
                  <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 13, color: GREY_PLACEHOLDER, lineHeight: 20 }}>
                    Write or paste general notes here — how to get around, packing list, etc.
                  </Text>
                </View>

                {trip.sections.map((section, sIndex) => (
                  <View key={section.key} style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionIconBadge, { backgroundColor: sIndex % 2 === 0 ? '#F4D9A8' : '#C9D9C4' }]}>
                        <Text style={{ fontSize: 14 }}>📍</Text>
                      </View>
                      <TextInput
                        style={styles.listTitleInput}
                        placeholder="Add a title"
                        placeholderTextColor={GREY_PLACEHOLDER}
                        value={section.name}
                        onChangeText={(text) => updateSectionField(section.key, 'name', text)}
                        onEndEditing={() => persist(trip)}
                      />
                    </View>

                    {section.places.map((place, pIndex) => {
                      const isSelected = selectedPlaceKeys.includes(place.key);
                      const isExpanded = expandedPlaceKey === place.key;
                      return (
                        <View key={place.key} style={{ marginBottom: 10 }}>
                          <SwipeToDelete
                            label="Delete"
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
                                if (isSelecting) {
                                  togglePlaceSelected(place.key);
                                } else {
                                  setExpandedPlaceKey(isExpanded ? null : place.key);
                                }
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
                        placeholder="Add a place"
                        placeholderTextColor={GREY_PLACEHOLDER}
                        value={section.placeInput}
                        onChangeText={(text) => updateSectionField(section.key, 'placeInput', text)}
                        onSubmitEditing={() => addPlaceToSection(section.key)}
                      />
                      <TouchableOpacity style={styles.iconSquareButton}>
                        <Text style={{ fontSize: 15 }}>📝</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconSquareButton}>
                        <Text style={{ fontSize: 15 }}>☑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.newListButtonMinimal} onPress={addNewList}>
                  <Text style={styles.newListButtonMinimalText}>+ New List</Text>
                </TouchableOpacity>

                {selectedPlaceKeys.length > 0 && (
                  <View style={styles.assignBar}>
                    <Text style={styles.assignBarTitle}>
                      {selectedPlaceKeys.length} place{selectedPlaceKeys.length > 1 ? 's' : ''} selected — add to:
                    </Text>
                    {days.length === 0 ? (
                      <Text style={styles.emptyTextSmall}>Set dates for this trip to assign a day.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {days.map((day) => (
                          <TouchableOpacity
                            key={day.key}
                            style={styles.assignBarDayPill}
                            onPress={() => assignSelectedToDay(day.key)}
                          >
                            <Text style={styles.assignBarDayPillText}>{day.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    <View style={styles.assignBarBottomRow}>
                      <TouchableOpacity onPress={deleteSelected}>
                        <Text style={styles.assignBarDelete}>🗑 Delete selected</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={cancelSelecting}>
                        <Text style={styles.assignBarCancel}>Cancel selection</Text>
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
                    <Text style={styles.emptyStateTitle}>No dates set yet</Text>
                    <Text style={styles.emptyText}>
                      Set a start and end date for this trip to see day-by-day scheduling.
                    </Text>
                  </View>
                ) : (
                  days.map((day, dIndex) => {
                    const stops = allPlaces.filter((p) => p.itineraryDate === day.key);
                    return (
                      <View
                        key={day.key}
                        style={[styles.daySection, dIndex !== 0 && styles.daySectionDivider]}
                        onLayout={(e) => {
                          dayOffsetsRef.current[day.key] = e.nativeEvent.layout.y;
                        }}
                      >
                        <Text style={styles.dayHeading}>{day.label}</Text>

                        {stops.map((place, index) => {
                          const isExpanded = expandedPlaceKey === place.key;
                          return (
                            <View key={place.key} style={{ marginBottom: 10 }}>
                              <SwipeToDelete
                                label="Remove"
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
                            </View>
                          );
                        })}

                        <View style={styles.addPlaceRow}>
                          <TextInput
                            style={styles.addPlaceInput}
                            placeholder="Add a place"
                            placeholderTextColor={GREY_PLACEHOLDER}
                            value={dayInputs[day.key] || ''}
                            onChangeText={(text) => setDayInputs((prev) => ({ ...prev, [day.key]: text }))}
                            onSubmitEditing={() => addPlaceToDay(day.key)}
                          />
                          <TouchableOpacity
                            style={styles.addPlaceButton}
                            onPress={() => addPlaceToDay(day.key)}
                            disabled={saving}
                          >
                            <Text style={styles.addPlaceButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
                {days.length > 0 && (
                  <Text style={styles.osmAttribution}>
                    Routes and directions © OpenStreetMap contributors
                  </Text>
                )}
              </>
            )}

            {activeTab === 'Budget' && (
              <>
                <View style={styles.budgetHero}>
                  <Text style={styles.budgetAmount}>₱{totalSpent.toFixed(2)}</Text>
                  <Text style={styles.budgetLabel}>Total spent</Text>
                </View>

                <View style={styles.addExpenseCard}>
                  <TextInput
                    style={styles.expenseInput}
                    placeholder="Category (e.g. Food and Drinks)"
                    placeholderTextColor={GREY_PLACEHOLDER}
                    value={expenseCategory}
                    onChangeText={setExpenseCategory}
                  />
                  <TextInput
                    style={styles.expenseInput}
                    placeholder="Amount (₱)"
                    placeholderTextColor={GREY_PLACEHOLDER}
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={styles.expenseInput}
                    placeholder="Description (optional)"
                    placeholderTextColor={GREY_PLACEHOLDER}
                    value={expenseDesc}
                    onChangeText={setExpenseDesc}
                  />
                  <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color={Colors.mint} />
                    ) : (
                      <Text style={styles.addExpenseButtonText}>+ Add Expense</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Expenses</Text>
                {expenses.length === 0 ? (
                  <Text style={styles.emptyText}>
                    You haven't added any expenses yet. Track your spending by adding one above.
                  </Text>
                ) : (
                  expenses.map((e) => (
                    <View key={e.id} style={styles.expenseRow}>
                      <Text style={styles.expenseTitle}>{e.description || e.category}</Text>
                      <Text style={styles.expenseAmount}>₱{Number(e.amount).toFixed(2)}</Text>
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  osmAttribution: {
  fontFamily: 'Lora_400Regular', fontSize: 10.5, color: GREY_PLACEHOLDER,
  textAlign: 'center', marginTop: 8,
  },

  screen: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600 },
  backLink: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },

  hero: { height: 160, backgroundColor: Colors.cream2, position: 'relative' },
  heroBackdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12,
  },
  heroIconButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroIconText: { fontSize: 16, color: Colors.brown900 },

  titleCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -30, borderRadius: 18, padding: 20,
    shadowColor: Colors.brown900, shadowOpacity: 0.1, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  tripName: {
    fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900,
    marginBottom: 8, padding: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripDates: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },

  stickyHeader: {
    backgroundColor: Colors.cream,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
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

  notesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },

  sectionBlock: { marginBottom: 22 },
  listTitleInput: {
    flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900,
    paddingVertical: 2,
  },

  daySection: { paddingBottom: 16 },
  daySectionDivider: { borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 22 },
  dayHeading: {
    fontFamily: 'Lora_600SemiBold', fontSize: 26, color: Colors.brown900, marginBottom: 14,
  },

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
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
  emptyTextSmall: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: GREY_PLACEHOLDER, paddingVertical: 4 },

  newListButtonMinimal: {
    alignSelf: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 20,
  },
  newListButtonMinimalText: {
    fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.brown600,
    textDecorationLine: 'underline',
  },

  assignBar: {
    backgroundColor: Colors.brown900, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 20,
  },
  assignBarTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint, marginBottom: 10 },
  assignBarDayPill: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 14, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  assignBarDayPillText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  assignBarBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  assignBarDelete: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: '#F4A19A' },
  assignBarCancel: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },

  emptyStateCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, alignItems: 'center', gap: 8,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  emptyStateTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },

  budgetHero: { backgroundColor: Colors.brown900, borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 20 },
  budgetAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 34, color: '#FFFFFF' },
  budgetLabel: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.mint, marginTop: 4 },
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
  expenseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  expenseTitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
  expenseAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },
});