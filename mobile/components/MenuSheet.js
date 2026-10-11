import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { fetchNotifications, fullName } from '../services/userService';
import { Avatar } from './ui';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

const MENU_ITEMS = [
  { key: 'notifications', labelKey: 'notificationsTitle', icon: '🔔', tint: '#F4D9A8', route: '/notifications' },
  { key: 'settings', labelKey: 'settingsTitle', icon: '⚙️', tint: '#C9D9C4', route: '/settings' },
  { key: 'history', labelKey: 'history', icon: '🕘', tint: '#D9C4D0', route: '/history' },
  { key: 'language', labelKey: 'language', icon: '🌐', tint: '#B8D4D9', route: '/language' },
  { key: 'join', labelKey: 'joinWithLink', icon: '🔗', tint: '#F4D9A8', route: '/join' },
  { key: 'about', labelKey: 'aboutUs', icon: 'ℹ️', tint: '#C9D9C4', route: '/about' },
];

export default function MenuSheet({ visible, onClose }) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const { t, user, signOut } = useApp();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (visible) {
      fetchNotifications()
        .then((list) => setUnread(list.filter((n) => !n.isRead).length))
        .catch(() => {});
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(DRAWER_WIDTH);
      overlayAnim.setValue(0);
    }
  }, [visible]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  async function handleLogout() {
    handleClose();
    await signOut();
    router.replace('/');
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.drawer,
            { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <LinearGradient colors={['#FBF7E8', Colors.cream2]} style={StyleSheet.absoluteFill} />

          <View style={styles.content}>
            <Text style={styles.title}>{t('menu')}</Text>

            <TouchableOpacity
              style={styles.profileRow}
              onPress={() => {
                handleClose();
                router.push('/settings/account');
              }}
              activeOpacity={0.7}
            >
              <Avatar person={user} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>{fullName(user, t('student'))}</Text>
                <Text style={styles.profileLink}>{t('editProfile')}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />

            {/* Menu items */}
            <View style={styles.itemsList}>
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuRow}
                  onPress={() => {
                    handleClose();
                    router.push(item.route);
                  }}
                  activeOpacity={0.6}
                >
                  <View style={[styles.iconBadge, { backgroundColor: item.tint }]}>
                    <Text style={{ fontSize: 15 }}>{item.icon}</Text>
                  </View>
                  <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
                  {item.key === 'notifications' && unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  )}
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.logoutIcon}>⏻</Text>
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(46,27,14,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    shadowColor: Colors.brown900,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: -6, height: 0 },
    elevation: 12,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Lora_600SemiBold', fontSize: 26, color: Colors.brown900, marginBottom: 22,
  },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
  profileLink: {
    fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600,
    textDecorationLine: 'underline', marginTop: 2,
  },
  divider: { height: 1, backgroundColor: Colors.line, marginBottom: 18 },
  itemsList: { flex: 1 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13,
  },
  iconBadge: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900 },
  chevron: { fontSize: 17, color: Colors.brown600 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { fontFamily: 'Lora_600SemiBold', fontSize: 10.5, color: '#FFFFFF' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.brown900, borderRadius: 14, height: 50, marginBottom: 30,
    shadowColor: Colors.brown900, shadowOpacity: 0.2, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  logoutIcon: { fontSize: 14, color: Colors.mint },
  logoutText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },
});