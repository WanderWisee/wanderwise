import { IconLabel } from '../../components/AppIcon';
import { Text } from '../../components/Typography';
import { View, StyleSheet, ScrollView } from 'react-native';
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
        <IconLabel name="globe" textStyle={styles.sectionTitle}>{t('changeLanguage')}</IconLabel>
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
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 26, color: Colors.brown900, marginTop: 20, marginBottom: 16 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 20, color: Colors.brown600, marginTop: 20, marginBottom: 10 },
  preview: { marginTop: 28, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.line },
  previewLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600 },
  previewValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.brown900, marginTop: 4 },
});
