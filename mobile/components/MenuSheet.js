import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { logout } from '../services/authService';

const MENU_ITEMS = [
  { key: 'notifications', label: 'Notifications', icon: '🔔', route: '/notifications' },
  { key: 'settings', label: 'Settings', icon: '⚙️', route: '/settings' },
  { key: 'history', label: 'History', icon: '🕘', route: '/history' },
  { key: 'language', label: 'Language', icon: '🌐', route: '/language' },
];

export default function MenuSheet({ visible, onClose }) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    onClose();
    router.replace('/');
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.title}>Menu</Text>

        {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuRow}
              onPress={() => {
                onClose();
                router.push(item.route);
              }}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>⏻  Log out</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(46,27,14,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line,
    alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontFamily: 'Lora_600SemiBold', fontSize: 24, color: Colors.brown900, marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16, marginBottom: 12,
  },
  menuIcon: { fontSize: 18 },
  menuLabel: { fontFamily: 'Lora_400Regular', fontSize: 15, color: Colors.brown900 },
  logoutButton: {
    backgroundColor: Colors.brown900, borderRadius: 14,
    height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  logoutText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
});