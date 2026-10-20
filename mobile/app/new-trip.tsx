import AppIcon, { IconLabel } from '../components/AppIcon';
import { Text, TextInput } from '../components/Typography';
import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Wordmark } from '../components/ui';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { createTrip, ensureDestination, fetchDestinations } from '../services/tripService';
import IconBadge from '../components/IconBadge';
import CalendarPicker, { rangeLabel } from '../components/CalendarPicker';

import { partsToISO as toISO } from '../utils/dates';

export default function NewTripScreen() {
  const router = useRouter();
  const { t, formatDateRange } = useApp();
  const [destination, setDestination] = useState('');
  const [allDestinations, setAllDestinations] = useState([]);
  const [focused, setFocused] = useState(false);

  // Parehong listahan ng destinations na gamit ng web (GET /api/destinations).
  useEffect(() => {
    fetchDestinations().then(setAllDestinations);
  }, []);

  const q = destination.trim().toLowerCase();
  const suggestions = allDestinations
    .filter((d) => d.name && (!q || d.name.toLowerCase().includes(q)) && d.name.toLowerCase() !== q)
    .slice(0, 6);
  const [dateRange, setDateRange] = useState(null);
  const [travelers, setTravelers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleCreateTrip() {
    setError(null);
    if (!destination.trim()) {
      setError(t('enterDestinationError'));
      return;
    }
    // Kailangan ang petsa para sa day-by-day itinerary (isang araw = day tour).
    if (!dateRange) {
      setError(t('datesRequired'));
      return;
    }
    setLoading(true);
    try {
      const trimmed = destination.trim();
      // Parehong ginagawa ng web: idinadagdag sa destinations list kung
      // wala pa, para lumaki ang database base sa aktwal na hinahanap ng users.
      ensureDestination(trimmed);

      // Sa web, ang trip.title ay ang pangalan ng "Where to go?" list —
      // parehong default ang gamit dito para magkapareho ang itsura sa dalawa.
      const title = t('whereToGoDefault');
      const { tripId } = await createTrip({
        title,
        destination: trimmed,
        startDate: dateRange ? toISO(dateRange.start) : null,
        endDate: dateRange ? toISO(dateRange.end) : null,
        travelBuddiesCount: travelers,
        budgetTotal: 0,
        sections: [],
      });
      router.replace(`/trip/${tripId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AppIcon name="arrow-left" style={styles.backText} />
        </TouchableOpacity>
        <Wordmark />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <IconBadge name="suitcase" size={72} />
        </View>

        <Text style={styles.heading}>{t('beginYourJourney')}</Text>

        <Text style={styles.label}>{t('destinationQuestion')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('whereAreYouHeaded')}
          placeholderTextColor={Colors.brown600}
          value={destination}
          onChangeText={setDestination}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {focused && suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={styles.suggestionRow}
                onPress={() => {
                  setDestination(d.name);
                  setFocused(false);
                }}
              >
                <IconLabel name="pin" textStyle={styles.suggestionText}>{d.name}</IconLabel>
                {!!d.country && <Text style={styles.suggestionCountry}>{d.country}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>{t('dates')}</Text>
        <TouchableOpacity style={styles.dateField} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={dateRange ? styles.dateFieldText : styles.dateFieldPlaceholder}>
            {rangeLabel(dateRange, { t, formatDateRange, dayTour: true })}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>{t('howManyPeople')}</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setTravelers((n) => Math.max(0, n - 1))}
          >
            <AppIcon name="minus" style={styles.counterButtonText} />
          </TouchableOpacity>
          <Text style={styles.counterValue}>{travelers}</Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setTravelers((n) => n + 1)}
          >
            <AppIcon name="plus" style={styles.counterButtonText} />
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreateTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.onButton} />
          ) : (
            <Text style={styles.submitButtonText}>{t('letsGo')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      <CalendarPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={setDateRange}
        onClear={() => setDateRange(null)}
        initialRange={dateRange}
        dayTour
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: Colors.brown900 },
  wordmark: { fontFamily: 'Poppins_600SemiBold', fontSize: 19, color: Colors.brown900 },
  wordmarkLight: { fontFamily: 'Poppins_400Regular', color: Colors.brown600 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  suggestions: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    marginTop: -10, marginBottom: 16, overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  suggestionText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown900 },
  suggestionCountry: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: Colors.brown600 },
  heading: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, lineHeight: 36, letterSpacing: -0.7, color: Colors.brown900, marginBottom: 28 },
  label: {
    fontFamily: 'Poppins_400Regular', fontSize: 13.5, color: Colors.brown600, marginBottom: 8,
  },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown900, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18 },
  dateField: { minHeight: 52, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18 },
  dateFieldText: { fontFamily: 'Poppins_400Regular', fontSize: 14.5, color: Colors.brown900 },
  dateFieldPlaceholder: { fontFamily: 'Poppins_400Regular', fontSize: 14.5, color: Colors.brown600 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 28 },
  counterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  counterButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: Colors.brown900 },
  counterValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: Colors.brown900 },
  errorText: {
    fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12,
  },
  submitButton: { minHeight: 52, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, color: Colors.onButton },
});
