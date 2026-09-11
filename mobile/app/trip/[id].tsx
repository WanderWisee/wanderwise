import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/theme';
import { fetchTrips, updateTrip, deleteTrip } from '../../services/tripService';

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPlace, setNewPlace] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadTrip() {
    try {
      const trips = await fetchTrips();
      const found = trips.find((t) => t.id === id);
      setTrip(found || null);
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

  async function addPlace() {
    if (!newPlace.trim() || !trip) return;
    setSaving(true);
    try {
      const stops = trip.stops || [];
      const updated = await updateTrip(trip.id, {
        stops: [...stops, { id: `stop_${Date.now()}`, name: newPlace.trim(), visited: false }],
      });
      setTrip(updated);
      setNewPlace('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisited(stopId) {
    const stops = trip.stops.map((s) =>
      s.id === stopId ? { ...s, visited: !s.visited } : s
    );
    const updated = await updateTrip(trip.id, { stops });
    setTrip(updated);
  }

  function confirmDeleteTrip() {
    Alert.alert(
      'Delete this trip?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTrip(trip.id);
            router.replace('/(tabs)/home');
          },
        },
      ]
    );
  }

  const expenses = trip?.expenses || [];
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={confirmDeleteTrip} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>🗑</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tripName}>{trip.name || `Trip to ${trip.destination}`}</Text>
        {(trip.startDate || trip.endDate) && (
          <Text style={styles.tripDates}>
            📅 {trip.startDate || '?'} - {trip.endDate || '?'}
          </Text>
        )}

        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>Map</Text>
        </View>

        <TouchableOpacity style={styles.browseButton}>
          <Text style={styles.browseButtonText}>🔍 Browse</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Where to go?</Text>
        <View style={styles.addPlaceRow}>
          <TextInput
            style={styles.addPlaceInput}
            placeholder="Add a new place"
            placeholderTextColor={Colors.brown600}
            value={newPlace}
            onChangeText={setNewPlace}
            onSubmitEditing={addPlace}
          />
          <TouchableOpacity style={styles.addPlaceButton} onPress={addPlace} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.mint} />
            ) : (
              <Text style={styles.addPlaceButtonText}>+</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Itinerary</Text>
        {(!trip.stops || trip.stops.length === 0) ? (
          <Text style={styles.emptyText}>No stops yet. Add a place above to get started.</Text>
        ) : (
          trip.stops.map((stop, index) => (
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

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Budget</Text>
        <View style={styles.budgetCard}>
          <Text style={styles.budgetAmount}>₱{totalSpent.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.addExpenseButton}
            onPress={() => router.push(`/trip/${trip.id}/add-expense`)}
          >
            <Text style={styles.addExpenseButtonText}>+ Add Expense</Text>
          </TouchableOpacity>
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
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  deleteButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  deleteButtonText: { fontSize: 15 },
  tripName: { fontFamily: 'Lora_600SemiBold', fontSize: 24, color: Colors.brown900, marginBottom: 4 },
  tripDates: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginBottom: 16 },
  mapPlaceholder: {
    height: 140, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  mapPlaceholderText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
  browseButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 46,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  browseButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900, marginBottom: 12 },
  addPlaceRow: { flexDirection: 'row', gap: 10 },
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
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
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
  budgetCard: {
    backgroundColor: Colors.cream2, borderRadius: 16, borderWidth: 1, borderColor: Colors.line,
    padding: 20,
  },
  budgetAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 28, color: Colors.brown900, marginBottom: 14 },
  addExpenseButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 44,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 20,
  },
  addExpenseButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
});