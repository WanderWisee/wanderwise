import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/theme';
import {
  fetchTripById, saveTrip, deleteTrip, markTripViewed,
  fetchExpenses, createExpense,
} from '../../services/tripService';
import Backdrop from '../../components/Backdrop';

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
  if (isNaN(start) || isNaN(end) || start > end) return [];
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
      costs: p.costs || [],
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
        costs: p.costs || [],
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
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [dayPlaceInput, setDayPlaceInput] = useState('');

  const [expenses, setExpenses] = useState([]);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  async function loadTrip() {
    try {
      const data = await fetchTripById(id);
      const hydrated = hydrateTrip(data);
      setTrip(hydrated);
      markTripViewed(id);

      const days = buildDaysFromRange(hydrated.startDate, hydrated.endDate);
      setSelectedDayKey((prev) => prev || (days[0] && days[0].key));

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

  function updateSectionField(sectionKey, field, value) {
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey ? { ...s, [field]: value } : s
      ),
    };
    if (field === 'name') {
      const section = trip.sections.find((s) => s.key === sectionKey);
      if (section && section.isDefault) {
        nextTrip.title = value;
      }
    }
    setTrip(nextTrip);
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
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, places: [...s.places, newPlace], placeInput: '' }
          : s
      ),
    };
    await persist(nextTrip);
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

  async function addPlaceToDay() {
    if (!dayPlaceInput.trim() || !selectedDayKey) return;
    const defaultSection = trip.sections.find((s) => s.isDefault) || trip.sections[0];
    const newPlace = {
      key: `place_${Date.now()}`,
      name: dayPlaceInput.trim(),
      itineraryDate: selectedDayKey,
      latitude: null,
      longitude: null,
      notes: '',
      scheduledTime: '',
      visited: false,
      costs: [],
    };
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === defaultSection.key ? { ...s, places: [...s.places, newPlace] } : s
      ),
    };
    setDayPlaceInput('');
    await persist(nextTrip);
  }

  async function assignPlaceToDay(sectionKey, placeKey, dayKey) {
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey
          ? {
              ...s,
              places: s.places.map((p) =>
                p.key === placeKey ? { ...p, itineraryDate: dayKey } : p
              ),
            }
          : s
      ),
    };
    await persist(nextTrip);
  }

  async function toggleVisited(sectionKey, placeKey) {
    const nextTrip = {
      ...trip,
      sections: trip.sections.map((s) =>
        s.key === sectionKey
          ? {
              ...s,
              places: s.places.map((p) =>
                p.key === placeKey ? { ...p, visited: !p.visited } : p
              ),
            }
          : s
      ),
    };
    await persist(nextTrip);
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
  const allPlaces = trip.sections.flatMap((s) =>
    s.places.map((p) => ({ ...p, sectionKey: s.key }))
  );
  const stopsForSelectedDay = allPlaces.filter((p) => p.itineraryDate === selectedDayKey);
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} stickyHeaderIndices={[1]}>
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

        <View style={styles.titleCard}>
          <Text style={styles.tripName}>{trip.title}</Text>
          <View style={styles.titleRow}>
            {(trip.startDate || trip.endDate) && (
              <Text style={styles.tripDates}>
                📅 {trip.startDate || '?'} – {trip.endDate || '?'}
              </Text>
            )}
            {saving && <ActivityIndicator size="small" color={Colors.brown600} />}
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.key}
              </Text>
              {activeTab === tab.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'Overview' && (
            <>
              {/* Notes — elevated card na may icon badge */}
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

              {/* Bawat listahan ("Places to visit" + custom lists) — elevated card */}
              {trip.sections.map((section, sIndex) => {
                const unscheduled = section.places.filter((p) => !p.itineraryDate);
                return (
                  <View key={section.key} style={styles.listCard}>
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

                    {unscheduled.length === 0 ? (
                      <Text style={styles.emptyTextSmall}>No places added yet.</Text>
                    ) : (
                      unscheduled.map((place) => (
                        <View key={place.key} style={styles.unscheduledRow}>
                          <View style={styles.placeDot} />
                          <Text style={styles.stopNameInline}>{place.name}</Text>
                          <TouchableOpacity
                            style={styles.assignButton}
                            onPress={() => {
                              if (days.length === 0) return;
                              setActiveTab('Itinerary');
                              setSelectedDayKey(days[0].key);
                              assignPlaceToDay(section.key, place.key, days[0].key);
                            }}
                          >
                            <Text style={styles.assignButtonText}>Day 1</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                );
              })}

              <TouchableOpacity style={styles.newListButtonMinimal} onPress={addNewList}>
                <Text style={styles.newListButtonMinimalText}>+ New List</Text>
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'Itinerary' && (
            <>
              {days.length === 0 ? (
                <Text style={styles.emptyText}>
                  Set a start and end date for this trip (Overview) to see day-by-day scheduling.
                </Text>
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPillRow}>
                    {days.map((day) => (
                      <TouchableOpacity
                        key={day.key}
                        style={[styles.dayPill, selectedDayKey === day.key && styles.dayPillActive]}
                        onPress={() => setSelectedDayKey(day.key)}
                      >
                        <Text style={[styles.dayPillText, selectedDayKey === day.key && styles.dayPillTextActive]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.addPlaceRow}>
                    <TextInput
                      style={styles.addPlaceInput}
                      placeholder="Add a place for this day"
                      placeholderTextColor={GREY_PLACEHOLDER}
                      value={dayPlaceInput}
                      onChangeText={setDayPlaceInput}
                      onSubmitEditing={addPlaceToDay}
                    />
                    <TouchableOpacity style={styles.addPlaceButton} onPress={addPlaceToDay} disabled={saving}>
                      {saving ? (
                        <ActivityIndicator size="small" color={Colors.mint} />
                      ) : (
                        <Text style={styles.addPlaceButtonText}>+</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {stopsForSelectedDay.length === 0 ? (
                    <Text style={styles.emptyText}>No places scheduled for this day yet.</Text>
                  ) : (
                    stopsForSelectedDay.map((place, index) => (
                      <View key={place.key} style={styles.stopCard}>
                        <View style={styles.stopNumberBadge}>
                          <Text style={styles.stopNumberText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stopName}>{place.name}</Text>
                          <TouchableOpacity onPress={() => toggleVisited(place.sectionKey, place.key)}>
                            <Text style={[styles.visitedText, place.visited && styles.visitedTextActive]}>
                              {place.visited ? '✓ Visited' : 'Mark visited'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </>
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
  );
}

const styles = StyleSheet.create({
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
  tripName: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripDates: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },

  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.cream, paddingHorizontal: 20, paddingTop: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  tabItem: { marginRight: 24, paddingBottom: 12 },
  tabText: { fontFamily: 'Lora_600SemiBold', fontSize: 14.5, color: Colors.brown600 },
  tabTextActive: { color: Colors.brown900 },
  tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: Colors.brown900 },

  tabContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  notesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },

  listCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 18,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  listTitleInput: {
    flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900,
    paddingVertical: 2,
  },

  addPlaceRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
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

  unscheduledRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.line,
  },
  placeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.brown600 },
  stopNameInline: { flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.brown900 },
  assignButton: {
    backgroundColor: Colors.cream2, borderRadius: 10, paddingHorizontal: 12, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  assignButtonText: { fontFamily: 'Lora_400Regular', fontSize: 10.5, color: Colors.brown900 },

  dayPillRow: { marginBottom: 16 },
  dayPill: {
    backgroundColor: Colors.cream2, borderRadius: 20, paddingHorizontal: 16, height: 38,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
    borderWidth: 1, borderColor: Colors.line,
  },
  dayPillActive: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  dayPillText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },
  dayPillTextActive: { color: Colors.mint },

  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cream2, borderRadius: 14, borderWidth: 1, borderColor: Colors.line,
    padding: 14, marginBottom: 10,
  },
  stopNumberBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  stopNumberText: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.mint },
  stopName: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900, marginBottom: 4 },
  visitedText: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  visitedTextActive: { color: Colors.mint, fontFamily: 'Lora_600SemiBold' },

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