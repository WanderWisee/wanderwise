import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function formatDate(d) {
  if (!d) return null;
  return `${String(d.month + 1).padStart(2, '0')}/${String(d.day).padStart(2, '0')}/${d.year}`;
}

function dateKey(d) {
  return `${d.year}-${d.month}-${d.day}`;
}

function isBefore(a, b) {
  if (a.year !== b.year) return a.year < b.year;
  if (a.month !== b.month) return a.month < b.month;
  return a.day < b.day;
}

export default function CalendarPicker({ visible, onClose, onConfirm, initialRange }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialRange?.start?.year || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialRange?.start?.month ?? today.getMonth());
  const [start, setStart] = useState(initialRange?.start || null);
  const [end, setEnd] = useState(initialRange?.end || null);
  const { t } = useApp();

  // Tuwing bubuksan, simulan sa kasalukuyang napiling range.
  useEffect(() => {
    if (!visible) return;
    setStart(initialRange?.start || null);
    setEnd(initialRange?.end || null);
    if (initialRange?.start) {
      setViewYear(initialRange.start.year);
      setViewMonth(initialRange.start.month);
    }
  }, [visible]);

  function goPrevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function goNextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayPress(day) {
    const picked = { year: viewYear, month: viewMonth, day };
    if (!start || (start && end)) {
      setStart(picked);
      setEnd(null);
    } else if (isBefore(picked, start)) {
      setStart(picked);
      setEnd(null);
    } else {
      setEnd(picked);
    }
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function cellStatus(day) {
    if (!day) return null;
    const cellDate = { year: viewYear, month: viewMonth, day };
    if (start && dateKey(cellDate) === dateKey(start)) return end ? 'range-start' : 'selected';
    if (end && dateKey(cellDate) === dateKey(end)) return 'range-end';
    if (start && end && isBefore(start, cellDate) && isBefore(cellDate, end)) return 'in-range';
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goPrevMonth} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={goNextMonth} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavText}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekdayText}>{w}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((day, i) => {
              const status = cellStatus(day);
              return (
                <TouchableOpacity
                  key={i}
                  disabled={!day}
                  onPress={() => day && handleDayPress(day)}
                  style={styles.dayCell}
                >
                  {day ? (
                    <View style={[
                      styles.dayCellInner,
                      status === 'in-range' && styles.dayCellInnerRange,
                      (status === 'selected' || status === 'range-start' || status === 'range-end') && styles.dayCellInnerSelected,
                    ]}>
                      <Text style={[
                        styles.dayCellText,
                        (status === 'in-range' || status === 'selected' || status === 'range-start' || status === 'range-end') && styles.dayCellTextSelected,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.calendarSummary}>
            <Text style={styles.calendarSummaryText}>
              {start ? formatDate(start) : t('startDate')} — {end ? formatDate(end) : t('endDate')}
            </Text>
          </View>

          <View style={styles.dateCardActions}>
            <TouchableOpacity style={styles.dateCancelButton} onPress={onClose}>
              <Text style={styles.dateCancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateConfirmButton}
              disabled={!start || !end}
              onPress={() => {
                onConfirm({ start, end });
                onClose();
              }}
            >
              <Text style={styles.dateConfirmButtonText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(46,27,14,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  calendarCard: {
    width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    shadowColor: Colors.brown900, shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  calendarNavButton: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  calendarNavText: { fontSize: 16, color: Colors.brown900 },
  calendarMonthLabel: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayText: {
    flex: 1, textAlign: 'center', fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  },
  dayCellInner: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 999,
  },
  dayCellInnerRange: { backgroundColor: Colors.brown900, opacity: 0.55 },
  dayCellInnerSelected: { backgroundColor: Colors.brown900, opacity: 1 },
  dayCellText: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown900 },
  dayCellTextSelected: { fontFamily: 'Lora_600SemiBold', color: Colors.mint },
  calendarSummary: {
    marginTop: 14, paddingVertical: 10, alignItems: 'center',
    backgroundColor: Colors.cream2, borderRadius: 10,
  },
  calendarSummaryText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown900 },
  dateCardActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  dateCancelButton: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  dateCancelButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },
  dateConfirmButton: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  dateConfirmButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },
});