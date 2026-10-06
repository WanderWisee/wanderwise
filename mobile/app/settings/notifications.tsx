import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { ScreenHeader } from '../../components/ui';

// Ang mga notification lang na talagang ipinapadala ng WanderWise —
// parehong apat na setting ng web, naka-save sa account.
const OPTIONS = [
  { key: 'notifTripReminders', hintKey: 'notifTripRemindersHint' },
  { key: 'notifTripInvites', hintKey: 'notifTripInvitesHint' },
  { key: 'notifComments', hintKey: 'notifCommentsHint' },
  { key: 'notifTripUpdates', hintKey: 'notifTripUpdatesHint' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { t, prefs, updatePrefs } = useApp();
  const { toast } = useDialog();

  async function toggle(key) {
    // Ang setting na hindi pa naka-save ay itinuturing na ON (gaya sa web).
    const ok = await updatePrefs({ [key]: prefs[key] === false });
    toast(ok ? t('settingSaved') : t('networkError'));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('settingsNotifications')} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{t('pushNotification')}</Text>
        {OPTIONS.map(({ key, hintKey }) => (
          <View key={key} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t(key)}</Text>
              <Text style={styles.rowHint}>{t(hintKey)}</Text>
            </View>
            <Switch
              value={prefs[key] !== false}
              onValueChange={() => toggle(key)}
              trackColor={{ false: Colors.line, true: Colors.brown900 }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
        <Text style={styles.always}>🔒 {t('notifSecurityAlwaysOn')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  rowLabel: { fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900 },
  rowHint: { fontFamily: 'Lora_400Regular', fontSize: 12, lineHeight: 17, color: Colors.brown600, marginTop: 3 },
  always: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600, marginTop: 18 },
});
