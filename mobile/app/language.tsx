import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import Backdrop from '../components/Backdrop';
import { ScreenHeader } from '../components/ui';

// English at Filipino — ang dalawang wikang may buong translation sa web,
// at parehong translations file ang gamit ng mobile.
const LANGUAGES = [
  { code: 'en', label: 'English', initial: 'EN' },
  { code: 'fil', label: 'Filipino', sub: 'Tagalog', initial: 'FIL' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useApp();

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />
      <ScreenHeader title={t('language')} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>{t('selectPreferredLanguage')}</Text>

        <View>
          {LANGUAGES.map((lang, index) => {
            const isSelected = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.row, index !== LANGUAGES.length - 1 && styles.rowDivider]}
                onPress={() => setLanguage(lang.code)}
                activeOpacity={0.6}
              >
                <View style={[styles.initialBadge, isSelected && styles.initialBadgeSelected]}>
                  <Text style={[styles.initialText, isSelected && styles.initialTextSelected]}>{lang.initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{lang.label}</Text>
                  {lang.sub && <Text style={styles.rowSub}>{lang.sub}</Text>}
                </View>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  initialBadge: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.line,
  },
  initialBadgeSelected: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  initialText: { fontFamily: 'Lora_600SemiBold', fontSize: 11.5, color: Colors.brown900 },
  initialTextSelected: { color: Colors.mint },
  rowLabel: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
  rowSub: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.mint },
});
