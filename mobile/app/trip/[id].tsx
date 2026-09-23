import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { fetchTrips, updateTrip, deleteTrip } from '../../services/tripService';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';

const TABS = [
  { key: 'Overview', icon: '📋' },
  { key: 'Itinerary', icon: '🗓️' },
  { key: 'Budget', icon: '💰' },
];

function parseMDY(str) {
  if (!str) return null;
  const [m, d, y] = str.split('/').map(Number);
  if (!m || !d || !y) return null;
  return new Date(y, m - 1, d);
}

function formatShort(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
}

function getTripDays(trip) {
  const start = parseMDY(trip.startDate);
  const end = parseMDY(trip.endDate);
  if (!start || !end || end < start) {
    return [{ key: 'day1', label: 'Day 1' }];
  }
  const days = [];
  const cursor = new Date(start);
  let i = 1;
  while (cursor <= end) {
    days.push({ key: `day${i}`, label: formatShort(cursor) });
    cursor.setDate(cursor.getDate() + 1);
    i++;
  }
  return days;
}

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [newPlace, setNewPlace] = useState('');
  const [saving, setSaving] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [dayPlaceInput, setDayPlaceInput] = useState('');

  async function loadTrip() {
    try {
      const trips = await fetchTrips();
      const found = trips.find((t) => t.id === id);
      setTrip(found || null);
      if (found) {
        const days = getTripDays(found);
        setSelectedDayKey((prev) => prev || days[0].key);
      }
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

  async function addUnscheduledPlace() {
    if (!newPlace.trim() || !trip) return;
    setSaving(true);
    try {
      const stops = trip.stops || [];
      const updated = await updateTrip(trip.id, {
        stops: [...stops, { id: `stop_${Date.now()}`, name: newPlace.trim(), day: null, visited: false }],
      });
      setTrip(updated);
      setNewPlace('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function addPlaceToDay() {
    if (!dayPlaceInput.trim() || !trip) return;
    setSaving(true);
    try {
      const stops = trip.stops || [];
      const updated = await updateTrip(trip.id, {
        stops: [...stops, { id: `stop_${Date.now()}`, name: dayPlaceInput.trim(), day: selectedDayKey, visited: false }],
      });
      setTrip(updated);
      setDayPlaceInput('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function assignToDay(stopId, dayKey) {
    const stops = trip.stops.map((s) => (s.id === stopId ? { ...s, day: dayKey } : s));
    const updated = await updateTrip(trip.id, { stops });
    setTrip(updated);
  }

  async function toggleVisited(stopId) {
    const stops = trip.stops.map((s) =>
      s.id === stopId ? { ...s, visited: !s.visited } : s
    );
    const updated = await updateTrip(trip.id, { stops });
    setTrip(updated);
  }

  async function addExpense() {
    if (!expenseTitle.trim() || !expenseAmount.trim()) return;
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount)) return;
    setSaving(true);
    try {
      const expenses = trip.expenses || [];
      const updated = await updateTrip(trip.id, {
        expenses: [...expenses, { id: `exp_${Date.now()}`, title: expenseTitle.trim(), amount }],
      });
      setTrip(updated);
      setExpenseTitle('');
      setExpenseAmount('');
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
          await deleteTrip(trip.id);
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

  const allStops = trip.stops || [];
  const unscheduledStops = allStops.filter((s) => !s.day);
  const expenses = trip.expenses || [];
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const tripDays = getTripDays(trip);
  const stopsForSelectedDay = allStops.filter((s) => s.day === selectedDayKey);

  return (
    <LinearGradient colors={['#F6F1DC', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <MeshBlobs height={900} style={styles.meshBackdrop} />

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} stickyHeaderIndices={[1]}>
          {/* Hero */}
          <View style={styles.hero}>
            <Backdrop height={180} style={styles.heroBackdrop} />
            <View style={styles.heroTopRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.heroIconButton}>
                <Text style={styles.heroIconText}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteTrip} style={styles.heroIconButton}>
                <Text style={styles.heroIconText}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlapping card */}
          <View style={styles.titleCard}>
            <Text style={styles.tripName}>{trip.name || `Trip to ${trip.destination}`}</Text>
            <View style={styles.titleRow}>
              {(trip.startDate || trip.endDate) && (
                <View style={styles.dateChip}>
                  <Text style={styles.dateChipText}>
                    📅 {trip.startDate || '?'} – {trip.endDate || '?'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.shareButton}>
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sticky pill-style tab bar */}
          <View style={styles.tabBarWrap}>
            <View style={styles.tabBar}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {activeTab === 'Overview' && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#F4D9A8' }]}>
                    <Text style={{ fontSize: 14 }}>🧳</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Reservations and attachments</Text>
                </View>
                <View style={styles.reservationCard}>
                  <View style={styles.reservationRow}>
                    {[
                      { icon: '✈️', label: 'Flight' },
                      { icon: '🛏️', label: 'Lodging' },
                      { icon: '🚗', label: 'Rental car' },
                      { icon: '📎', label: 'Attachment' },
                    ].map((item) => (
                      <TouchableOpacity key={item.label} style={styles.reservationItem}>
                        <View style={styles.reservationIconBadge}>
                          <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                        </View>
                        <Text style={styles.reservationLabel}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.sectionHeaderRow, { marginTop: 26 }]}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#C9D9C4' }]}>
                    <Text style={{ fontSize: 14 }}>📍</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Places to visit</Text>
                </View>
                <View style={styles.addPlaceRow}>
                  <TextInput
                    style={styles.addPlaceInput}
                    placeholder="Add a place"
                    placeholderTextColor={Colors.brown600}
                    value={newPlace}
                    onChangeText={setNewPlace}
                    onSubmitEditing={addUnscheduledPlace}
                  />
                  <TouchableOpacity style={styles.addPlaceButton} onPress={addUnscheduledPlace} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color={Colors.mint} />
                    ) : (
                      <Text style={styles.addPlaceButtonText}>+</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {unscheduledStops.length === 0 ? (
                  <Text style={styles.emptyText}>No unscheduled places yet.</Text>
                ) : (
                  unscheduledStops.map((stop) => (
                    <View key={stop.id} style={styles.unscheduledCard}>
                      <Text style={styles.stopName}>{stop.name}</Text>
                      <TouchableOpacity
                        style={styles.assignButton}
                        onPress={() => {
                          setActiveTab('Itinerary');
                          setSelectedDayKey(tripDays[0].key);
                          assignToDay(stop.id, tripDays[0].key);
                        }}
                      >
                        <Text style={styles.assignButtonText}>Add to Day 1</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <View style={[styles.sectionHeaderRow, { marginTop: 26 }]}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#B8D4D9' }]}>
                    <Text style={{ fontSize: 14 }}>📝</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Notes</Text>
                </View>
                <View style={styles.notesBox}>
                  <Text style={styles.notesPlaceholder}>
                    Write or paste general notes here — how to get around, packing list, etc.
                  </Text>
                </View>
              </>
            )}

            {activeTab === 'Itinerary' && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPillRow}>
                  {tripDays.map((day) => (
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
                    placeholderTextColor={Colors.brown600}
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
                  stopsForSelectedDay.map((stop, index) => (
                    <View key={stop.id} style={styles.stopCard}>
                      <View style={styles.stopNumberBadge}>
                        <Text style={styles.stopNumberText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopName}>{stop.name}</Text>
                        <TouchableOpacity onPress={() => toggleVisited(stop.id)}>
                          <Text style={[styles.visitedText, stop.visited && styles.visitedTextActive]}>
                            {stop.visited ? '✓ Visited' : 'Mark visited'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === 'Budget' && (
              <>
                <LinearGradient
                  colors={[Colors.brown900, '#4A2E1C']}
                  style={styles.budgetHero}
                >
                  <Text style={styles.budgetAmount}>₱{totalSpent.toFixed(2)}</Text>
                  <Text style={styles.budgetLabel}>Total spent</Text>
                </LinearGradient>

                <View style={styles.addExpenseCard}>
                  <TextInput
                    style={styles.expenseInput}
                    placeholder="What did you spend on?"
                    placeholderTextColor={Colors.brown600}
                    value={expenseTitle}
                    onChangeText={setExpenseTitle}
                  />
                  <TextInput
                    style={styles.expenseInput}
                    placeholder="Amount (₱)"
                    placeholderTextColor={Colors.brown600}
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity style={styles.addExpenseButton} onPress={addExpense} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color={Colors.mint} />
                    ) : (
                      <Text style={styles.addExpenseButtonText}>+ Add Expense</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: '#D9C4D0' }]}>
                    <Text style={{ fontSize: 14 }}>🧾</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Expenses</Text>
                </View>
                {expenses.length === 0 ? (
                  <Text style={styles.emptyText}>
                    You haven't added any expenses yet. Track your spending by adding one above.
                  </Text>
                ) : (
                  expenses.map((e) => (
                    <View key={e.id} style={styles.expenseRow}>
                      <Text style={styles.expenseTitle}>{e.title}</Text>
                      <Text style={styles.expenseAmount}>₱{e.amount.toFixed(2)}</Text>
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  meshBackdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600 },
  backLink: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },

  hero: { height: 180, backgroundColor: Colors.cream2, position: 'relative' },
  heroBackdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12,
  },
  heroIconButton: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brown900, shadowOpacity: 0.1, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  heroIconText: { fontSize: 16, color: Colors.brown900 },

  titleCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -34, borderRadius: 20, padding: 22,
    shadowColor: Colors.brown900, shadowOpacity: 0.12, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 5,
  },
  tripName: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateChip: { backgroundColor: Colors.cream2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  dateChipText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600 },
  shareButton: {
    backgroundColor: Colors.brown900, borderRadius: 20, paddingHorizontal: 16, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  shareButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },

  tabBarWrap: { backgroundColor: 'transparent', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.cream2, borderRadius: 16, padding: 4,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 13,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.brown900, shadowOpacity: 0.1, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  tabText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown600 },
  tabTextActive: { color: Colors.brown900 },

  tabContent: { paddingHorizontal: 20, paddingTop: 6 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900 },

  reservationCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  reservationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  reservationItem: { alignItems: 'center', width: 60 },
  reservationIconBadge: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  reservationLabel: { fontFamily: 'Lora_400Regular', fontSize: 10.5, color: Colors.brown600, textAlign: 'center' },

  addPlaceRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  addPlaceInput: {
    flex: 1, fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  addPlaceButton: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.brown900, shadowOpacity: 0.2, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  addPlaceButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.mint },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },

  unscheduledCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: Colors.brown900, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  assignButton: {
    backgroundColor: Colors.cream2, borderRadius: 10, paddingHorizontal: 12, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  assignButtonText: { fontFamily: 'Lora_400Regular', fontSize: 11, color: Colors.brown900 },

  notesBox: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, minHeight: 80,
    shadowColor: Colors.brown900, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  notesPlaceholder: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },

  dayPillRow: { marginBottom: 16 },
  dayPill: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, height: 38,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
    shadowColor: Colors.brown900, shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  dayPillActive: { backgroundColor: Colors.brown900 },
  dayPillText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },
  dayPillTextActive: { color: Colors.mint },

  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: Colors.brown900, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  stopNumberBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  stopNumberText: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.mint },
  stopName: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900, marginBottom: 4 },
  visitedText: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  visitedTextActive: { color: Colors.mint, fontFamily: 'Lora_600SemiBold' },

  budgetHero: {
    borderRadius: 20, padding: 26, alignItems: 'center', marginBottom: 20,
    shadowColor: Colors.brown900, shadowOpacity: 0.2, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 5,
  },
  budgetAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 36, color: '#FFFFFF' },
  budgetLabel: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.mint, marginTop: 4 },
  addExpenseCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  expenseInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 10, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  addExpenseButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  addExpenseButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
  expenseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
    shadowColor: Colors.brown900, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  expenseTitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
  expenseAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },
});