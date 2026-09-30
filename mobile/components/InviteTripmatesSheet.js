import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/theme';

export default function InviteTripmatesSheet({ visible, onClose, tripId }) {
  const [permission, setPermission] = useState('edit'); // 'edit' | 'view'
  const [email, setEmail] = useState('');

  async function handleCopyLink() {
    const link = `https://wanderwise.app/trip/${tripId}?access=${permission}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Link copied', 'Share it with your tripmates.');
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Invite tripmates</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, permission === 'edit' && styles.toggleButtonActive]}
              onPress={() => setPermission('edit')}
            >
              <Text style={[styles.toggleText, permission === 'edit' && styles.toggleTextActive]}>Can edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, permission === 'view' && styles.toggleButtonActive]}
              onPress={() => setPermission('view')}
            >
              <Text style={[styles.toggleText, permission === 'view' && styles.toggleTextActive]}>View only</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.emailInput}
            placeholder="Invite by email"
            placeholderTextColor={Colors.brown600}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareItem} onPress={handleCopyLink}>
              <View style={styles.shareIconBadge}><Text style={{ fontSize: 18 }}>🔗</Text></View>
              <Text style={styles.shareLabel}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareItem}>
              <View style={styles.shareIconBadge}><Text style={{ fontSize: 18 }}>💬</Text></View>
              <Text style={styles.shareLabel}>Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareItem}>
              <View style={styles.shareIconBadge}><Text style={{ fontSize: 18 }}>⤴</Text></View>
              <Text style={styles.shareLabel}>Other</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.manageRow}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
            <Text style={styles.manageLabel}>Manage tripmates</Text>
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
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900, textAlign: 'center', marginBottom: 18 },
  toggleRow: {
    flexDirection: 'row', backgroundColor: Colors.cream2, borderRadius: 12, padding: 4, marginBottom: 16,
  },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#FFFFFF' },
  toggleText: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: Colors.brown600 },
  toggleTextActive: { fontFamily: 'Lora_600SemiBold', color: Colors.brown900 },
  emailInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 20,
  },
  shareRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  shareItem: { alignItems: 'center', gap: 6 },
  shareIconBadge: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  shareLabel: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  manageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 16,
  },
  manageLabel: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
});