import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';
import CalendarPicker, { formatDate } from '../../components/CalendarPicker';

const RESULTS = [
  {
    id: 'hidden-palms',
    name: 'Hidden Palms Inn/Resort',
    location: 'San Juan, La Union PH',
    amenities: 'Free Wi-Fi • Free Breakfast • Free Parking • Outdoor Pool • Air Conditioning',
    price: '₱2,900',
    total: '₱11,600',
  },
];

export default function HotelsScreen() {
  const [travelers, setTravelers] = useState(0);
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <LinearGradient colors={['#F6F1DC', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={{ fontSize: 16 }}>🧭</Text>
          </View>
          <Text style={styles.wordmark}>
            Wander<Text style={styles.wordmarkLight}>Wise</Text>
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>All your stays in one place!</Text>
          <Text style={styles.pageSubtitle}>
            A smarter way to find the perfect accommodation—built around your preferences.
          </Text>

          <View style={styles.inputWrap}>
            <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <TextInput
              style={styles.searchInput}
              placeholder="Discover where to go"
              placeholderTextColor={Colors.brown600}
              value={destination}
              onChangeText={setDestination}
            />
          </View>

          <TouchableOpacity
            style={styles.inputWrap}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
          >
            <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Text style={dateRange ? styles.dateRangeText : styles.dateRangePlaceholder}>
              {dateRange
                ? `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`
                : 'Select start and end date'}
            </Text>
          </TouchableOpacity>

          <View style={styles.counterRow}>
            <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
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

          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Discover Hotels at Top Destinations!</Text>

          {RESULTS.map((hotel) => (
            <View key={hotel.id} style={styles.resultCard}>
              <View style={styles.imagePlaceholder}>
                <Text style={{ fontSize: 40 }}>🏖️</Text>
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.hotelName}>{hotel.name}</Text>
                <Text style={styles.hotelAmenities}>{hotel.amenities}</Text>
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.hotelPrice}>{hotel.price}</Text>
                    <Text style={styles.hotelTotal}>Total {hotel.total}</Text>
                  </View>
                  <TouchableOpacity style={styles.dealButton}>
                    <Text style={styles.dealButtonText}>View Deal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <CalendarPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={setDateRange}
          initialRange={dateRange}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  logoBadge: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  wordmarkLight: { fontFamily: 'Lora_400Regular', color: Colors.brown600 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  pageTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 24, color: Colors.brown900, marginTop: 12,
  },
  pageSubtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown600,
    marginTop: 6, marginBottom: 20,
  },
  inputWrap: {
    borderRadius: 10, overflow: 'hidden', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  searchInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
  },
  dateRangeText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
  dateRangePlaceholder: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600 },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 12,
  },
  counterButton: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 8,
  },
  counterButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900 },
  counterValue: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  searchButton: {
    height: 48, borderRadius: 10, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', marginBottom: 30,
  },
  searchButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
  sectionTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900, marginBottom: 14,
  },
  resultCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 18, overflow: 'hidden',
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  imagePlaceholder: {
    height: 160, backgroundColor: Colors.cream2, alignItems: 'center', justifyContent: 'center',
  },
  resultBody: { padding: 16 },
  hotelName: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 6 },
  hotelAmenities: {
    fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  hotelPrice: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  hotelTotal: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600 },
  dealButton: {
    backgroundColor: Colors.brown900, borderRadius: 10, paddingHorizontal: 18, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  dealButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },
});