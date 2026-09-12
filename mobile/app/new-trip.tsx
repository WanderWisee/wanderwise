import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { createTrip } from '../services/tripService';
import Backdrop from '../components/Backdrop';
import IconBadge from '../components/IconBadge';
import CalendarPicker, { formatDate } from '../components/CalendarPicker';

export default function NewTripScreen() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [travelers, setTravelers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleCreateTrip() {
    setError(null);
    if (!destination) {
      setError('Please enter a destination.');
      return;
    }
    setLoading(true);
    try {
      const trip = await createTrip({
        name: `Trip to ${destination}`,
        destination,
        startDate: dateRange ? formatDate(dateRange.start) : null,
        endDate: dateRange ? formatDate(dateRange.end) : null,
        travelers,
      });
      router.replace(`/trip/${trip.id}`);
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

      <View style={styles.content}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <IconBadge emoji="🧳" size={72} />
        </View>

        <Text style={styles.heading}>Begin your journey</Text>

        <Text style={styles.label}>Destination?</Text>
        <TextInput
          style={styles.input}
          placeholder="Thailand"
          placeholderTextColor={Colors.brown600}
          value={destination}
          onChangeText={setDestination}
        />

        <Text style={styles.label}>Dates</Text>
        <TouchableOpacity style={styles.dateField} onPress={() => setPickerOpen(true)}>
          <Text style={dateRange ? styles.dateFieldText : styles.dateFieldPlaceholder}>
            {dateRange
              ? `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`
              : 'Select start and end date'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>How many people?</Text>
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
            <Text style={styles.submitButtonText}>Let's go</Text>
          )}
        </TouchableOpacity>
      </View>

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
  content: { paddingHorizontal: 24, paddingTop: 10 },
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