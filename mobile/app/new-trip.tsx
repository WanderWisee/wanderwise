import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { createTrip, ensureDestination, fetchDestinations } from '../services/tripService';
import Backdrop from '../components/Backdrop';
import IconBadge from '../components/IconBadge';
import CalendarPicker, { formatDate } from '../components/CalendarPicker';

import { partsToISO as toISO } from '../utils/dates';

export default function NewTripScreen() {
  const router = useRouter();
  const { t } = useApp();
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
      <Backdrop height={180} style={styles.backdrop} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>
          Wander<Text style={styles.wordmarkLight}>Wise</Text>
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <IconBadge emoji="🧳" size={72} />
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
                <Text style={styles.suggestionText}>📍 {d.name}</Text>
                {!!d.country && <Text style={styles.suggestionCountry}>{d.country}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>{t('dates')}</Text>
        <TouchableOpacity style={styles.dateField} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={dateRange ? styles.dateFieldText : styles.dateFieldPlaceholder}>
            {dateRange
              ? `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`
              : t('selectDates')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>{t('howManyPeople')}</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setTravelers((n) => Math.max(0, n - 1))}
          >
            <Text style={styles.counterButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{travelers}</Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setTravelers((n) => n + 1)}
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreateTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.mint} />
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
        initialRange={dateRange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  wordmark: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  wordmarkLight: { fontFamily: 'Lora_400Regular', color: Colors.brown600 },
  content: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  suggestions: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    marginTop: -10, marginBottom: 16, overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  suggestionText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
  suggestionCountry: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  heading: {
    fontFamily: 'Lora_600SemiBold', fontSize: 24, color: Colors.brown900,
    textAlign: 'center', marginBottom: 30,
  },
  label: {
    fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown600, marginBottom: 8,
  },
  input: {
    fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
  },
  dateField: {
    backgroundColor: Colors.cream2, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
  },
  dateFieldText: { fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900 },
  dateFieldPlaceholder: { fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown600 },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cream2, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 30,
  },
  counterButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  counterButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900 },
  counterValue: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  errorText: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12,
  },
  submitButton: {
    height: 50, borderRadius: 14, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  submitButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15.5, color: Colors.mint },
});