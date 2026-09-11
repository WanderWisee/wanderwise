import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/theme';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';

const DESTINATIONS = [
  { id: 'singapore', name: 'Singapore', emoji: '🏙️' },
  { id: 'bali', name: 'Bali, Indonesia', emoji: '🌴' },
  { id: 'tokyo', name: 'Tokyo, Japan', emoji: '🗼' },
];

export default function GuidesScreen() {
  const router = useRouter();

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
          <Text style={styles.pageTitle}>Discover Travel Tips</Text>

          <BlurView intensity={45} tint="light" style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Discover where to go"
              placeholderTextColor={Colors.brown600}
            />
          </BlurView>

          <Text style={styles.sectionTitle}>New Travel Tips</Text>

          {DESTINATIONS.map((dest) => (
            <View key={dest.id} style={styles.card}>
              <View style={styles.imagePlaceholder}>
                <Text style={{ fontSize: 40 }}>{dest.emoji}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.destinationName}>{dest.name}</Text>
                <TouchableOpacity
                  style={styles.itineraryButton}
                  onPress={() => router.push(`/guide/${dest.id}`)}
                >
                  <Text style={styles.itineraryButtonText}>See Itineraries</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
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
    fontFamily: 'Lora_600SemiBold', fontSize: 24, color: Colors.brown900, marginTop: 12, marginBottom: 16,
  },
  searchWrap: {
    borderRadius: 10, overflow: 'hidden', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  searchInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  sectionTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900, marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 18, overflow: 'hidden',
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  imagePlaceholder: {
    height: 160, backgroundColor: Colors.cream2, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 16 },
  destinationName: {
    fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 10,
  },
  itineraryButton: {
    backgroundColor: Colors.brown900, borderRadius: 20, height: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  itineraryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
});