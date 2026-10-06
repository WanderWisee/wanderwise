import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { geocodePlace } from '../../services/geoService';
import OsmMap from '../../components/OsmMap';
import { ScreenHeader } from '../../components/ui';

// Ang built-in na Boracay guide — parehong laman ng TravelGuidePage ng web.
const DESTINATION = 'Boracay Islands';

const GUIDE_SECTIONS = [
  {
    pinLabel: 'White Beach',
    subtitle: 'The Main Strip ★★★★★',
    description:
      "White Beach is Boracay's four-kilometer stretch of powder-white sand and the island's main hub. Divided into Stations 1, 2, and 3, it's lined with resorts, beach bars, and restaurants right on the shore.",
    pros: [
      'Iconic powdery white sand and calm, swimmable water',
      'Widest range of resorts, restaurants, and beach bars',
      'Easy walking access to shops, spas, and nightlife',
    ],
    cons: ['Can get very crowded at sunset', 'Pricier than other parts of the island'],
    image: require('../../assets/destinations/boracay-white-beach.jpg'),
    fallback: { latitude: 11.9564, longitude: 121.9302 },
    hotels: [
      { name: 'Discovery Shores Boracay', description: 'All-suite beachfront resort right on White Beach, known for its minimalist rooms and quiet pool area.' },
      { name: 'Henann Regency Resort & Spa', description: 'Large family-friendly resort near Station 2, close to the busiest strip of restaurants and bars.' },
      { name: 'Alta Vista de Boracay', description: 'Hillside villas with a private beach cabana, a quieter option a short tricycle ride from the main strip.' },
    ],
  },
  {
    pinLabel: 'Bulabog Beach',
    subtitle: 'Watersports & Kite Surfing',
    description:
      "On the eastern side of the island, Bulabog Beach is Boracay's watersports center — the go-to spot for kiteboarding and windsurfing thanks to steady winds, especially from November to April.",
    pros: [
      'Best spot on the island for kite and windsurfing lessons',
      'Fewer crowds than White Beach',
      'More budget-friendly hostels and guesthouses',
    ],
    cons: ['Water can be too shallow or seaweedy for regular swimming', 'Fewer dining options after dark'],
    image: require('../../assets/destinations/boracay-bulabog.jpg'),
    fallback: { latitude: 11.9603, longitude: 121.9374 },
    hotels: [
      { name: 'Angol Point Beachfront Cottages', description: 'Simple beachfront cottages popular with kitesurfers, steps away from the launch area.' },
      { name: 'Boracay Kite Resort', description: 'Budget-friendly rooms run by a kitesurf school, with board storage and lesson packages on-site.' },
    ],
  },
];

function GuideSection({ section }) {
  const { t } = useApp();
  const [coords, setCoords] = useState(section.fallback);
  const [openHotel, setOpenHotel] = useState(null);

  useEffect(() => {
    geocodePlace(section.pinLabel, DESTINATION).then((c) => c && setCoords(c));
  }, [section.pinLabel]);

  return (
    <View style={styles.section}>
      <Image source={section.image} style={styles.image} />
      <Text style={styles.pin}>📍 {section.pinLabel}</Text>
      <Text style={styles.subtitle}>{section.subtitle}</Text>
      <Text style={styles.description}>{section.description}</Text>

      <Text style={styles.listTitle}>{t('prosOfStayingIn')} {section.pinLabel}:</Text>
      {section.pros.map((p) => (
        <Text key={p} style={styles.listItem}>✓  {p}</Text>
      ))}
      <Text style={styles.listTitle}>{t('consOfStayingIn')} {section.pinLabel}:</Text>
      {section.cons.map((c) => (
        <Text key={c} style={styles.listItem}>✕  {c}</Text>
      ))}

      <Text style={styles.subheading}>{t('hotelOption')}</Text>
      {section.hotels.map((h) => {
        const open = openHotel === h.name;
        return (
          <View key={h.name} style={styles.hotelCard}>
            <Text style={styles.hotelName}>🏨 {h.name}</Text>
            <Text style={styles.hotelDesc} numberOfLines={open ? undefined : 2}>{h.description}</Text>
            <View style={styles.hotelActions}>
              <TouchableOpacity onPress={() => setOpenHotel(open ? null : h.name)}>
                <Text style={styles.hotelLink}>{open ? t('showLess') : t('details')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(`${h.name} Boracay`)}`)
                }
              >
                <Text style={styles.hotelLink}>{t('viewOnGoogleMaps')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <Text style={styles.subheading}>{t('location')}</Text>
      <OsmMap markers={coords ? [{ ...coords, label: section.pinLabel }] : []} height={200} singleZoom={15} numbered={false} />
    </View>
  );
}

export default function OfficialGuideScreen() {
  const router = useRouter();
  const { t } = useApp();
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={`${DESTINATION} ${t('travelJourneySuffix')}`} onBack={() => router.back()} titleSize={17} />
      <ScrollView contentContainerStyle={styles.content}>
        {GUIDE_SECTIONS.map((s) => (
          <GuideSection key={s.pinLabel} section={s} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  section: { marginBottom: 34 },
  image: { width: '100%', height: 190, borderRadius: 16, marginBottom: 14, backgroundColor: Colors.cream2 },
  pin: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 2, marginBottom: 10 },
  description: { fontFamily: 'Lora_400Regular', fontSize: 14, lineHeight: 21, color: Colors.brown900 },
  listTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900, marginTop: 16, marginBottom: 6 },
  listItem: { fontFamily: 'Lora_400Regular', fontSize: 13.5, lineHeight: 20, color: Colors.brown800, marginBottom: 4 },
  subheading: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900, marginTop: 22, marginBottom: 10 },
  hotelCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.line,
  },
  hotelName: { fontFamily: 'Lora_600SemiBold', fontSize: 14.5, color: Colors.brown900, marginBottom: 4 },
  hotelDesc: { fontFamily: 'Lora_400Regular', fontSize: 13, lineHeight: 19, color: Colors.brown600 },
  hotelActions: { flexDirection: 'row', gap: 18, marginTop: 10 },
  hotelLink: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },
});
