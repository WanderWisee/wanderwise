import { Text } from './Typography';
import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function formatDate(d, dateFormat = 'mdy') {
  if (!d) return null;
  const month = String(d.month + 1).padStart(2, '0');
  const day = String(d.day).padStart(2, '0');
  return dateFormat === 'dmy' ? `${day}/${month}/${d.year}` : `${month}/${day}/${d.year}`;
}

function dateKey(d) {
  return `${d.year}-${d.month}-${d.day}`;
}

function isBefore(a, b) {
  if (a.year !== b.year) return a.year < b.year;
  if (a.month !== b.month) return a.month < b.month;
  return a.day < b.day;
}

export default function CalendarPicker(props) {
  return props.visible ? <CalendarContent {...props} /> : null;
}

function partsToIsoKey(d) {
  return `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function dayCountOf(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end.year, end.month, end.day) - new Date(start.year, start.month, start.day)) / 86400000) + 1;
}

// Text for a date field, same as the website's date field:
// "Oct 10 – 12, 2026 · 3 day(s)" or "Oct 10, 2026 · Day tour".
export function rangeLabel(range, { t, formatDateRange, dayTour = false }) {
  if (!range?.start) return t('selectDates');
  const startIso = partsToIsoKey(range.start);
  if (!range.end) return `${formatDateRange(startIso, startIso)} – …`;
  const endIso = partsToIsoKey(range.end);
  const count = dayCountOf(range.start, range.end);
  return dayTour && count === 1
    ? `${formatDateRange(startIso, endIso)} · ${t('dayTourLabel')}`
    : `${formatDateRange(startIso, endIso)} · ${count} ${t('daysSuffix')}`;
}

// Same as the website's date picker (DateRangePicker): tap the start date,
// then the end date (the calendar closes by itself). Days in between light
// up, today has a ring, and past days can't be picked unless allowPast.
// dayTour: tap the same day twice, press "Day tour", or close after
// picking only the start. Clear removes the dates (onClear).
function CalendarContent({ onClose, onConfirm, onClear, initialRange, allowPast = false, dayTour = false }) {
  const today = new Date();
  const todayParts = { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  const isPast = (d) => !allowPast && isBefore(d, todayParts);

  const startsInPast = !!initialRange?.start && isPast(initialRange.start);
  const [viewYear, setViewYear] = useState(!startsInPast && initialRange?.start?.year || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(!startsInPast && initialRange?.start ? initialRange.start.month : today.getMonth());
  const [start, setStart] = useState(initialRange?.start || null);
  const [end, setEnd] = useState(initialRange?.end || null);
  const { t, language } = useApp();
  const locale = language === 'fil' ? 'fil-PH' : 'en-US';

  const canGoBack = allowPast || viewYear > todayParts.year || (viewYear === todayParts.year && viewMonth > todayParts.month);

  function goPrevMonth() {
    if (!canGoBack) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function goNextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function finish(range) {
    onConfirm(range);
    onClose();
  }

  // Closing with only a start date = a day tour (when allowed), like the web.
  function close() {
    if (dayTour && start && !end) { finish({ start, end: start }); return; }
    onClose();
  }

  function handleDayPress(day) {
    const picked = { year: viewYear, month: viewMonth, day };
    if (isPast(picked)) return;
    if (!start || end || isBefore(picked, start)) {
      setStart(picked);
      setEnd(null);
      return;
    }
    // Same day again = day tour (only when allowed).
    if (!dayTour && dateKey(picked) === dateKey(start)) return;
    setEnd(picked);
    finish({ start, end: picked });
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    try { return new Date(2026, 1, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }); } catch { return WEEKDAYS[i]; }
  });
  let monthTitle = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  try { monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' }); } catch {}

  function cellStatus(day) {
    if (!day) return null;
    const cellDate = { year: viewYear, month: viewMonth, day };
    if ((start && dateKey(cellDate) === dateKey(start)) || (end && dateKey(cellDate) === dateKey(end))) return 'selected';
    if (start && end && isBefore(start, cellDate) && isBefore(cellDate, end)) return 'in-range';
    return null;
  }

  const count = dayCountOf(start, end);
  const hint = !start || end ? t('pickStartDate') : dayTour ? t('pickEndDateOrDayTour') : t('pickEndDate');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.modalBackdrop} onPress={close}>
        <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.hint}>{hint}</Text>

          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goPrevMonth} disabled={!canGoBack} accessibilityLabel="Previous month" style={[styles.calendarNavButton, !canGoBack && { opacity: 0.35 }]}>
              <Text style={styles.calendarNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonthLabel}>{monthTitle}</Text>
            <TouchableOpacity onPress={goNextMonth} accessibilityLabel="Next month" style={styles.calendarNavButton}>
              <Text style={styles.calendarNavText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {weekdays.map((w, i) => (
              <Text key={`w${i}`} style={styles.weekdayText}>{w}</Text>
            ))}
          </View>

          {/* Isang row bawat linggo (7 kahon na pantay ang lapad) para hindi
              mapunta sa susunod na linya ang Sabado. */}
          <View style={styles.calendarGrid}>
            {weeks.map((week, w) => (
              <View key={`week-${w}`} style={styles.weekRow}>
                {week.map((day, j) => {
                  const i = w * 7 + j;
                const status = cellStatus(day);
                const past = !!day && isPast({ year: viewYear, month: viewMonth, day });
                const isToday = !!day && dateKey({ year: viewYear, month: viewMonth, day }) === dateKey(todayParts);
                return (
                  <TouchableOpacity
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={day ? `${formatDate({ year: viewYear, month: viewMonth, day })}${isToday ? ` (${t('today')})` : ''}` : undefined}
                    accessibilityState={{ selected: status === 'selected', disabled: !day || past }}
                    disabled={!day || past}
                    onPress={() => day && handleDayPress(day)}
                    style={[styles.dayCell, status === 'in-range' && styles.dayCellRange]}
                  >
                    {day ? (
                      <View style={[
                        styles.dayCellInner,
                        isToday && !status && styles.dayCellInnerToday,
                        status === 'selected' && styles.dayCellInnerSelected,
                      ]}>
                        <Text style={[
                          styles.dayCellText,
                          past && styles.dayCellTextPast,
                          isToday && !status && styles.dayCellTextToday,
                          status === 'selected' && styles.dayCellTextSelected,
                        ]}>
                          {day}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
                })}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerCount}>{dayTour && count === 1 ? t('dayTourLabel') : count > 0 ? `${count} ${t('daysSuffix')}` : ''}</Text>
            <View style={styles.footerActions}>
              {dayTour && !!start && !end && (
                <TouchableOpacity onPress={() => finish({ start, end: start })} hitSlop={8}>
                  <Text style={styles.footerLink}>{t('dayTourBtn')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                hitSlop={8}
                onPress={() => {
                  setStart(null);
                  setEnd(null);
                  if (onClear) onClear();
                }}
              >
                <Text style={styles.footerLink}>{t('clearDates')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(51,28,8,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  calendarCard: {
    width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderWidth: 1, borderColor: '#E6DFC0',
    shadowColor: Colors.brown900, shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  calendarNavButton: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E6DFC0', backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  calendarNavText: { fontSize: 20, lineHeight: 22, color: Colors.brown900 },
  calendarMonthLabel: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.brown900, textTransform: 'capitalize' },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayText: {
    flex: 1, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#8A7654', textTransform: 'uppercase',
  },
  calendarGrid: { width: '100%' },
  weekRow: { flexDirection: 'row', width: '100%' },
  // Same look as the website picker (.ww-drp-*)
  hint: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.teal, textAlign: 'center', marginBottom: 10 },
  dayCell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', marginVertical: 1 },
  dayCellRange: { backgroundColor: '#E8F2EE' },
  dayCellInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayCellInnerToday: { borderWidth: 1, borderColor: '#E8D8B8' },
  dayCellInnerSelected: { backgroundColor: Colors.teal },
  dayCellText: { fontFamily: 'Poppins_400Regular', fontSize: 13.5, color: Colors.brown900 },
  dayCellTextPast: { color: '#D4C9A8' },
  dayCellTextToday: { fontFamily: 'Poppins_700Bold', color: '#B89968' },
  dayCellTextSelected: { fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E6DFC0' },
  footerCount: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600 },
  footerActions: { flexDirection: 'row', gap: 16 },
  footerLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#A33A2A' },
});
