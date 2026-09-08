import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/theme';

const DESTINATION_INFO = {
  singapore: {
    name: 'Singapore',
    attractions: [
      {
        name: 'Universal Studios Singapore',
        blurb: "Experience movie magic with thrilling rides and attractions at Southeast Asia's first and only Universal Studios theme park.",
        emoji: '🎢',
      },
      {
        name: 'Riverside Walk',
        blurb: 'A scenic evening stroll along the river, lined with restaurants and city lights.',
        emoji: '🌉',
      },
    ],
  },
  bali: {
    name: 'Bali, Indonesia',
    attractions: [
      {
        name: 'Ulun Danu Beratan Temple',
        blurb: 'A serene water temple set against the backdrop of Lake Beratan and misty mountains.',
        emoji: '⛩️',
      },
    ],
  },
  tokyo: {
    name: 'Tokyo, Japan',
    attractions: [
      {
        name: 'Shibuya Crossing',
        blurb: "One of the world's busiest pedestrian crossings, surrounded by neon lights and skyscrapers.",
        emoji: '🚦',
      },
    ],
  },
};

export default function GuideDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const info = DESTINATION_INFO[id] || { name: 'Destination', attractions: [] };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{info.name} Travel Guide</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Explore the Area</Text>
        <View style={styles.mapRow}>
          <View style={styles.mapThumb} />
          <View style={styles.mapThumb} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Top Attractions</Text>

        {info.attractions.map((spot) => (
          <View key={spot.name} style={styles.attractionCard}>
            <View style={styles.attractionImagePlaceholder}>
              <Text style={{ fontSize: 40 }}>{spot.emoji}</Text>
            </View>
            <View style={styles.attractionBody}>
              <Text style={styles.attractionName}>{spot.name}</Text>
              <Text style={styles.attractionBlurb}>{spot.blurb}</Text>
              <TouchableOpacity style={styles.learnMoreButton}>
                <Text style={styles.learnMoreText}>Learn More</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900, flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900, marginBottom: 12 },
  mapRow: { flexDirection: 'row', gap: 10 },
  mapThumb: {
    flex: 1, height: 100, backgroundColor: Colors.cream2, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.line,
  },
  attractionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 18,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  attractionImagePlaceholder: {
    height: 150, backgroundColor: Colors.cream2, alignItems: 'center', justifyContent: 'center',
  },
  attractionBody: { padding: 16 },
  attractionName: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 6 },
  attractionBlurb: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, lineHeight: 19, marginBottom: 14,
  },
  learnMoreButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, height: 40, alignSelf: 'flex-start',
    paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  learnMoreText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },
});