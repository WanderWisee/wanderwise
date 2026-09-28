import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import Backdrop from '../components/Backdrop';
import FadeScrollView from '../components/FadeScrollView';

const HISTORY_ITEMS = [];

export default function HistoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 34 }} />
      </View>

      {HISTORY_ITEMS.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>🕘</Text>
          <Text style={styles.emptyTitle}>No activity yet.</Text>
          <Text style={styles.emptySubtitle}>Your actions will show up here.</Text>
        </View>
      ) : (
        <FadeScrollView fadeHeight={24} contentContainerStyle={styles.content}>
          {HISTORY_ITEMS.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.iconBadge}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </FadeScrollView>
      )}
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
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
    shadowColor: Colors.brown900, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  iconBadge: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
  rowSubtitle: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 3 },
});