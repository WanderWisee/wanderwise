import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';

// "14:30" -> "2:30 PM". Tumatanggap din ng "14:30:00" mula sa backend.
export function formatTime12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function parseInitial(hhmm) {
  if (!hhmm) return { hour: 9, minute: 0, period: 'AM' };
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return { hour: 9, minute: 0, period: 'AM' };
  return {
    hour: h % 12 === 0 ? 12 : h % 12,
    minute: m - (m % 5),
    period: h >= 12 ? 'PM' : 'AM',
  };
}

export default function TimePickerSheet({ visible, initial, onClose, onSave }) {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');
  const { t } = useApp();

  useEffect(() => {
    if (visible) {
      const p = parseInitial(initial);
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
    }
  }, [visible]);

  function handleSave() {
    let h24 = hour % 12;
    if (period === 'PM') h24 += 12;
    onSave(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('selectTime')}</Text>

          <View style={styles.columnsRow}>
            <View style={styles.column}>
              <TouchableOpacity style={styles.stepper} onPress={() => setHour((h) => (h === 12 ? 1 : h + 1))}>
                <Text style={styles.stepperText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.value}>{hour}</Text>
              <TouchableOpacity style={styles.stepper} onPress={() => setHour((h) => (h === 1 ? 12 : h - 1))}>
                <Text style={styles.stepperText}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.colon}>:</Text>

            <View style={styles.column}>
              <TouchableOpacity style={styles.stepper} onPress={() => setMinute((m) => (m + 5) % 60)}>
                <Text style={styles.stepperText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.value}>{String(minute).padStart(2, '0')}</Text>
              <TouchableOpacity style={styles.stepper} onPress={() => setMinute((m) => (m - 5 + 60) % 60)}>
                <Text style={styles.stepperText}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.periodColumn}>
              {['AM', 'PM'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodButton, period === p && styles.periodButtonActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearButton} onPress={() => onSave(null)}>
              <Text style={styles.clearText}>{t('clear')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(46,27,14,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30,
  },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22 },
  title: {
    fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900,
    textAlign: 'center', marginBottom: 18,
  },
  columnsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  column: { alignItems: 'center' },
  stepper: {
    width: 44, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperText: { fontSize: 13, color: Colors.brown900 },
  value: {
    fontFamily: 'Lora_600SemiBold', fontSize: 28, color: Colors.brown900,
    marginVertical: 8, minWidth: 48, textAlign: 'center',
  },
  colon: { fontFamily: 'Lora_600SemiBold', fontSize: 28, color: Colors.brown900 },
  periodColumn: { gap: 8, marginLeft: 8 },
  periodButton: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.cream2,
  },
  periodButtonActive: { backgroundColor: Colors.brown900 },
  periodText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },
  periodTextActive: { color: Colors.mint },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  clearButton: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  clearText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },
  saveButton: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },
});