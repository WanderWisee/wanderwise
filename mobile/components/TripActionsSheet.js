import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function TripActionsSheet({ visible, onClose, onShare, onEdit, onDelete }) {
  const { t } = useApp();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.row} onPress={() => { onClose(); onShare(); }}>
            <Text style={styles.icon}>↗</Text>
            <Text style={styles.label}>{t('inviteYourCrew')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => { onClose(); onEdit(); }}>
            <Text style={styles.icon}>✎</Text>
            <Text style={styles.label}>{t('editYourTrip')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => { onClose(); onDelete(); }}>
            <Text style={[styles.icon, { color: Colors.error }]}>🗑</Text>
            <Text style={[styles.label, { color: Colors.error }]}>{t('deleteOrLeaveTrip')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(46,27,14,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line,
    alignSelf: 'center', marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  icon: { fontSize: 17, width: 22, color: Colors.brown900 },
  label: { fontFamily: 'Lora_400Regular', fontSize: 15, color: Colors.brown900 },
});