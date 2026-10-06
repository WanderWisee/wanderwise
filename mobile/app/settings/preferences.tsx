import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { ChoiceChips, ScreenHeader } from '../../components/ui';

// Parehong Settings → Preferences ng web. Naka-save sa account
// (/api/me/settings), kaya pareho ang format sa web at sa mobile.
export default function PreferencesScreen() {
  const router = useRouter();
  const { t, language, setLanguage, prefs, updatePrefs, formatDate, formatTime, formatDistance } = useApp();
  const { toast } = useDialog();

  async function save(changes) {
    const ok = await updatePrefs(changes);
    toast(ok ? t('settingSaved') : t('networkError'));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('settingsPreferences')} onBack={() => router.back()} titleSize={18} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>🌐 {t('changeLanguage')}</Text>
        <ChoiceChips
          options={[
            { value: 'en', label: 'English' },
            { value: 'fil', label: 'Filipino' },
          ]}
          value={language}
          onChange={(v) => {
            setLanguage(v);
            toast(v === 'fil' ? 'Na-save ang setting' : 'Setting saved');
          }}
        />

        <Text style={styles.sectionTitle}>{t('formatting')}</Text>

        <Text style={styles.label}>{t('dateFormat')}</Text>
        <ChoiceChips
          options={[
            { value: 'mdy', label: 'MM/DD/YYYY' },
            { value: 'dmy', label: 'DD/MM/YYYY' },
          ]}
          value={prefs.dateFormat}
          onChange={(v) => save({ dateFormat: v })}
        />

        <Text style={styles.label}>{t('timeFormat')}</Text>
        <ChoiceChips
          options={[
            { value: '12h', label: t('hour12') },
            { value: '24h', label: t('hour24') },
          ]}
          value={prefs.timeFormat}
          onChange={(v) => save({ timeFormat: v })}
        />

        <Text style={styles.label}>{t('distanceFormat')}</Text>
        <ChoiceChips
          options={[
            { value: 'km', label: t('kilometers') },
            { value: 'mi', label: t('miles') },
          ]}
          value={prefs.distanceFormat}
          onChange={(v) => save({ distanceFormat: v })}
        />

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>{t('formatPreview')}</Text>
          <Text style={styles.previewValue}>
            {formatDate('2026-04-17')} · {formatTime('14:30')} · {formatDistance(2300)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginTop: 18, marginBottom: 12 },
  label: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 14, marginBottom: 8 },
  preview: {
    marginTop: 26, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.line,
  },
  previewLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600 },
  previewValue: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900, marginTop: 4 },
});
