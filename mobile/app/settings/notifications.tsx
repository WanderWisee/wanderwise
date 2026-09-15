import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';

const DEFAULT_TOGGLES = [
  { key: 'tripReminders', label: 'Trip reminders', value: true },
  { key: 'deals', label: 'New deals and offers', value: true },
  { key: 'friendActivity', label: 'Friend activity', value: true },
  { key: 'messages', label: 'Messages', value: true },
  { key: 'reviewRequests', label: 'Review requests', value: true },
  { key: 'email', label: 'Email updates', value: false },
  { key: 'push', label: 'Push notifications', value: true },
  { key: 'sms', label: 'SMS notifications', value: true },
  { key: 'inApp', label: 'In-app notifications', value: false },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);

  function toggle(key) {
    setToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, value: !t.value } : t))
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Push Notification</Text>
        {toggles.map((t) => (
          <View key={t.key} style={styles.row}>
            <Text style={styles.rowLabel}>{t.label}</Text>
            <Switch
              value={t.value}
              onValueChange={() => toggle(t.key)}
              trackColor={{ false: Colors.line, true: Colors.brown900 }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
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
  headerTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900, marginBottom: 14,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  rowLabel: { fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900 },
});