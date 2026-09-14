import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import Backdrop from '../components/Backdrop';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>🔔</Text>
        <Text style={styles.emptyTitle}>No updates at the moment.</Text>
        <Text style={styles.emptySubtitle}>We'll notify you when something new happens</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900,
    marginTop: 16, textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600,
    marginTop: 6, textAlign: 'center',
  },
});