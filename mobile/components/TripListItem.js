import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { DestinationImage } from './ui';

export default function TripListItem({ trip, onPress, onShare = null, onMenu = null, showActions = true }) {
  const { t, formatDateRange } = useApp();
  const dateLabel = formatDateRange(trip.startDate, trip.endDate);
  // Parehong web: "Trip to <destination>" ang pangalan ng trip; ang
  // trip.title ay ang pangalan ng "Where to go?" list sa loob nito.
  const title = trip.destination ? `${t('tripToPrefix')} ${trip.destination}` : trip.title || t('untitledTrip');
  const meta = dateLabel;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <DestinationImage name={trip.destination} style={styles.thumb} emojiSize={26} />

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.metaText} numberOfLines={1}>
          {meta || t('noDatesSet')}
        </Text>
      </View>

      {showActions && (
        <View style={styles.actions}>
          {onShare && (
            <TouchableOpacity onPress={onShare} style={styles.actionButton} hitSlop={6} accessibilityLabel={t('share')}>
              <Text style={{ fontSize: 16, color: Colors.brown900 }}>↗</Text>
            </TouchableOpacity>
          )}
          {onMenu && (
            <TouchableOpacity onPress={onMenu} style={styles.actionButton} hitSlop={6} accessibilityLabel={t('moreActions')}>
              <Text style={{ fontSize: 18, color: Colors.brown600 }}>⋯</Text>
            </TouchableOpacity>
          )}
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
    width: 64, height: 64, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  info: { flex: 1 },
  title: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 5 },
  metaText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600 },
  actions: { flexDirection: 'row', gap: 4 },
  actionButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
