import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './Typography';
import { Colors, Fonts } from '../constants/theme';
import { useApp } from '../context/AppContext';

// Kalendaryo para sa petsa ng kapanganakan: pumili ng TAON → BUWAN → ARAW.
// (Mas mabilis kaysa mag-swipe ng buwan-buwan pabalik sa 2004.)
// value: Date | null · onConfirm(Date) · min/max: Date

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fil: ['Ene', 'Peb', 'Mar', 'Abr', 'May', 'Hun', 'Hul', 'Ago', 'Set', 'Okt', 'Nob', 'Dis'],
};
const WEEKDAYS = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  fil: ['L', 'L', 'M', 'M', 'H', 'B', 'S'],
};

export default function BirthdayPicker({ visible, value, min, max, onClose, onConfirm }) {
  if (!visible) return null;
  return <PickerContent value={value} min={min} max={max} onClose={onClose} onConfirm={onConfirm} />;
}

function PickerContent({ value, min, max, onClose, onConfirm }) {
  const { t, language } = useApp();
  const lang = language === 'fil' ? 'fil' : 'en';
  const start = value || new Date(max.getFullYear() - 7, 0, 1);
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const [day, setDay] = useState(value ? value.getDate() : null);
  const [step, setStep] = useState(value ? 'day' : 'year');

  const years = useMemo(() => {
    const list = [];
    for (let y = max.getFullYear(); y >= min.getFullYear(); y--) list.push(y);
    return list;
  }, [min, max]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const allowed = (y, m, d) => {
    const date = new Date(y, m, d);
    return date >= min && date <= max;
  };
  const picked = day && day <= daysInMonth && allowed(year, month, day) ? new Date(year, month, day) : null;

  const label = picked
    ? `${MONTHS[lang][month]} ${day}, ${year}`
    : step === 'year'
      ? t('dobPickYear')
      : step === 'month'
        ? `${year}`
        : `${MONTHS[lang][month]} ${year}`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t('dobLabelShort')}</Text>
          <Text style={styles.value}>{label}</Text>

          <View style={styles.tabs}>
            {['year', 'month', 'day'].map((s) => (
              <TouchableOpacity key={s} style={[styles.tab, step === s && styles.tabActive]} onPress={() => setStep(s)}>
                <Text style={[styles.tabText, step === s && styles.tabTextActive]}>
                  {s === 'year' ? year : s === 'month' ? MONTHS[lang][month] : day || '—'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {step === 'year' && (
            <ScrollView style={styles.yearScroll} contentContainerStyle={styles.grid}>
              {years.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.cell, styles.yearCell, y === year && styles.cellSelected]}
                  onPress={() => {
                    setYear(y);
                    setStep('month');
                  }}
                >
                  <Text style={[styles.cellText, y === year && styles.cellTextSelected]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {step === 'month' && (
            <View style={styles.grid}>
              {MONTHS[lang].map((name, m) => {
                const ok = allowed(year, m, 1) || allowed(year, m, new Date(year, m + 1, 0).getDate());
                return (
                  <TouchableOpacity
                    key={name}
                    disabled={!ok}
                    style={[styles.cell, styles.monthCell, m === month && styles.cellSelected, !ok && styles.cellDisabled]}
                    onPress={() => {
                      setMonth(m);
                      setStep('day');
                    }}
                  >
                    <Text style={[styles.cellText, m === month && styles.cellTextSelected]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {step === 'day' && (
            <View>
              <View style={styles.weekRow}>
                {WEEKDAYS[lang].map((w, i) => (
                  <Text key={i} style={styles.weekday}>{w}</Text>
                ))}
              </View>
              <View style={styles.grid}>
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <View key={`blank-${i}`} style={[styles.cell, styles.dayCell]} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const ok = allowed(year, month, d);
                  return (
                    <TouchableOpacity
                      key={d}
                      disabled={!ok}
                      style={[styles.cell, styles.dayCell, d === day && styles.cellSelected, !ok && styles.cellDisabled]}
                      onPress={() => setDay(d)}
                    >
                      <Text style={[styles.cellText, d === day && styles.cellTextSelected]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirm, !picked && { opacity: 0.4 }]}
              disabled={!picked}
              onPress={() => picked && onConfirm(picked)}
            >
              <Text style={styles.confirmText}>{t('dobConfirm')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(51, 28, 8, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  title: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.brown600, textAlign: 'center' },
  value: { fontFamily: Fonts.semibold, fontSize: 20, color: Colors.brown900, textAlign: 'center', marginTop: 2, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.cream2, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.brown900 },
  tabText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.brown900 },
  tabTextActive: { color: Colors.mint },
  yearScroll: { maxHeight: 260 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  yearCell: { width: '25%', paddingVertical: 10 },
  monthCell: { width: '33.33%', paddingVertical: 14 },
  dayCell: { width: '14.28%', aspectRatio: 1 },
  cellSelected: { backgroundColor: Colors.brown900 },
  cellDisabled: { opacity: 0.3 },
  cellText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.brown900 },
  cellTextSelected: { color: Colors.mint, fontFamily: Fonts.semibold },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: '14.28%', textAlign: 'center', fontFamily: Fonts.medium, fontSize: 11, color: Colors.brown600 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancel: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.brown900 },
  confirm: { flex: 1, height: 44, borderRadius: 12, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.mint },
});
