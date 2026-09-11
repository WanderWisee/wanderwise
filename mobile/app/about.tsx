import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoBadge}>
          <Text style={{ fontSize: 32 }}>🧭</Text>
        </View>

        <Text style={styles.title}>WanderWise</Text>
        <Text style={styles.tagline}>Your travel companion for smarter trips</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is WanderWise?</Text>
          <Text style={styles.paragraph}>
            WanderWise is a synchronized web and mobile travel itinerary
            management system built for Tourism Management students and
            faculty. It helps you plan academic tours and field activities
            with day-by-day scheduling, map-based route visualization, and
            group collaboration.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            We built WanderWise to take the stress out of planning student
            travel — replacing scattered spreadsheets and group chats with
            one shared space where everyone stays on the same page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Project</Text>
          <Text style={styles.paragraph}>
            WanderWise is a capstone project developed for the Tourism
            Management program, 2026.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.cream2,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 17,
    color: Colors.brown900,
  },
  content: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.cream2,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 26,
    color: Colors.brown900,
  },
  tagline: {
    fontFamily: 'Lora_400Regular',
    fontSize: 14,
    color: Colors.brown600,
    marginTop: 6,
    marginBottom: 34,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    marginBottom: 26,
  },
  sectionTitle: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 16,
    color: Colors.brown900,
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: 'Lora_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.brown600,
  },
});