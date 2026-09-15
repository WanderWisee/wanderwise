import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';

function SelectRow({ label, value }) {
  return (
    <TouchableOpacity style={styles.selectRow}>
      <View>
        <Text style={styles.selectLabel}>{label}</Text>
        <Text style={styles.selectValue}>{value}</Text>
      </View>
      <Text style={styles.selectChevron}>⌄</Text>
    </TouchableOpacity>
  );
}

export default function PreferencesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User preferences</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>🌐 Language</Text>
        <SelectRow label="Change language" value="English" />

        <Text style={styles.sectionTitle}>Trip and Journal Planner</Text>
        <Text style={styles.sectionSubtitle}>Plan trips offline, sync when connected.</Text>
        <SelectRow label="Offline sync" value="Select" />

        <Text style={styles.sectionTitle}>Formatting</Text>
        <SelectRow label="Date Format" value="Month/Day" />
        <SelectRow label="Time Format" value="12 hour" />
        <SelectRow label="Distance Format" value="Kilometers" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900,
    marginTop: 20, marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginBottom: 10,
  },
  selectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cream2, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  selectLabel: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  selectValue: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900, marginTop: 2 },
  selectChevron: { fontSize: 16, color: Colors.brown600 },
});