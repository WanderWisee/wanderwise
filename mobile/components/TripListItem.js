import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function parse(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { month: months[m - 1], day: d };
  }
  if (startDate && endDate) {
    const s = parse(startDate);
    const e = parse(endDate);
    if (s.month === e.month) return `${s.month} ${s.day} – ${e.day}`;
    return `${s.month} ${s.day} – ${e.month} ${e.day}`;
  }
  const only = parse(startDate || endDate);
  return `${only.month} ${only.day}`;
}

export default function TripListItem({ trip, onPress, onShare = null, onMenu = null, showActions = true }) {
  const dateLabel = formatDateRange(trip.startDate, trip.endDate);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.thumb}>
        <Text style={{ fontSize: 26 }}>🏝️</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{trip.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 10 }}>👤</Text>
          </View>
        <Text style={styles.metaText} numberOfLines={1}>
            {dateLabel || trip.destination || 'No dates set'}
            {typeof trip.placesCount === 'number'
              ? ` • ${trip.placesCount > 0 ? `${trip.placesCount} place${trip.placesCount > 1 ? 's' : ''}` : 'No places'}`
              : ''}
          </Text>
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onShare} style={styles.actionButton}>
            <Text style={{ fontSize: 16 }}>↗</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMenu} style={styles.actionButton}>
            <Text style={{ fontSize: 16, color: Colors.brown600 }}>⋯</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12,
  },
  thumb: {
    width: 64, height: 64, borderRadius: 14, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.line,
  },
  info: { flex: 1 },
  title: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  metaText: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600 },
  actions: { flexDirection: 'row', gap: 4 },
  actionButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});