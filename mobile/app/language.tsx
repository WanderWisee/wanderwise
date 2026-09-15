import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import Backdrop from '../components/Backdrop';

const LANGUAGES = [
  { code: 'en', label: 'English', initial: 'EN' },
  { code: 'fil', label: 'Filipino', initial: 'FIL' },
  { code: 'ja', label: '日本語', sub: 'Japanese', initial: 'JA' },
  { code: 'ko', label: '한국어', sub: 'Korean', initial: 'KO' },
  { code: 'zh', label: '中文', sub: 'Chinese', initial: 'ZH' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('en');

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Select your preferred language</Text>

        <View>
          {LANGUAGES.map((lang, index) => {
            const isSelected = selected === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.row,
                  index !== LANGUAGES.length - 1 && styles.rowDivider,
                  isSelected && styles.rowSelected,
                ]}
                onPress={() => setSelected(lang.code)}
                activeOpacity={0.6}
              >
                <View style={[styles.initialBadge, isSelected && styles.initialBadgeSelected]}>
                  <Text style={[styles.initialText, isSelected && styles.initialTextSelected]}>
                    {lang.initial}
                  </Text>
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
  sectionLabel: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  rowSelected: { backgroundColor: 'transparent' },
  initialBadge: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.line,
  },
  initialBadgeSelected: {
    backgroundColor: Colors.brown900, borderColor: Colors.brown900,
  },
  initialText: {
    fontFamily: 'Lora_600SemiBold', fontSize: 11.5, color: Colors.brown900,
  },
  initialTextSelected: { color: Colors.mint },
  rowLabel: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
  rowSub: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.mint },
});