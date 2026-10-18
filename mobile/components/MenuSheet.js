import AppIcon from './AppIcon';
import { Text } from './Typography';
import { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Pressable, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { confirmLogout } from '../utils/confirmLogout';
import { fetchNotifications, fullName } from '../services/userService';
import { Avatar } from './ui';

const MENU_GROUPS = [
  [
    { key: 'classes', labelKey: 'myClasses', icon: 'graduation', route: '/classes' },
    { key: 'notifications', labelKey: 'notificationsTitle', icon: 'bell', route: '/notifications' },
    { key: 'join', labelKey: 'joinWithLink', icon: 'link', route: '/join' },
  ],
  [
    { key: 'settings', labelKey: 'settingsTitle', icon: 'settings', route: '/settings' },
    { key: 'history', labelKey: 'history', icon: 'clock', route: '/history' },
  ],
  [
    { key: 'language', labelKey: 'language', icon: 'globe', route: '/language' },
    { key: 'about', labelKey: 'aboutUs', icon: 'info', route: '/about' },
  ],
];

export default function MenuSheet({ visible, onClose, onShareProfile = null }) {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const { t, user, signOut } = useApp();
  const { confirm } = useDialog();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!visible) { progress.setValue(0); return; }
    closing.current = false;
    let active = true;
    fetchNotifications()
      .then((list) => { if (active) setUnread(list.filter((n) => !n.isRead).length); })
      .catch(() => {});
    Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    return () => { active = false; progress.stopAnimation(); };
  }, [visible, progress]);

  function handleClose(afterClose = null) {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      onClose();
      afterClose?.();
    });
  }

  function open(route) { handleClose(() => router.push(route)); }

  function handleLogout() {
    // Close the menu first, then ask (the question shows on the screen).
    handleClose(async () => {
      if (!(await confirmLogout(confirm, t))) return;
      await signOut();
      router.replace('/');
    });
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => handleClose()}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => handleClose()} accessibilityRole="button" accessibilityLabel={t('closeMenu')}>
          <Animated.View style={[styles.overlay, { opacity: progress }]} />
        </Pressable>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={() => handleClose()}
          style={[styles.sheet, { maxHeight: height - insets.top - 16, paddingBottom: Math.max(16, insets.bottom), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}
        >
          <View style={styles.handle} />
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={styles.title}>{t('menu')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('closeMenu')} style={styles.closeButton} onPress={() => handleClose()}>
              <AppIcon name="x" size={20} color={Colors.brown600} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <TouchableOpacity style={styles.profileRow} accessibilityRole="button" accessibilityLabel={t('editProfile')} onPress={() => open('/settings/account')} activeOpacity={0.75}>
              <Avatar person={user} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.profileName} numberOfLines={1}>{fullName(user, t('student'))}</Text>
                {!!user?.email && <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>}
                <Text style={styles.profileLink}>{t('editProfile')}</Text>
              </View>
              <AppIcon name="chevron-right" size={18} color={Colors.brown600} />
            </TouchableOpacity>
            {onShareProfile && (
              <TouchableOpacity style={styles.shareRow} accessibilityRole="button" onPress={() => handleClose(onShareProfile)} activeOpacity={0.7}>
                <View style={styles.iconBadge}><AppIcon name="external" size={20} color={Colors.teal} /></View>
                <Text style={styles.menuLabel}>{t('shareProfile')}</Text>
                <AppIcon name="chevron-right" size={17} color={Colors.brown600} />
              </TouchableOpacity>
            )}
            {MENU_GROUPS.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.group}>
                {group.map((item, index) => (
                  <TouchableOpacity key={item.key} style={[styles.menuRow, index !== group.length - 1 && styles.rowDivider]} accessibilityRole="button" onPress={() => open(item.route)} activeOpacity={0.65}>
                    <View style={styles.iconBadge}><AppIcon name={item.icon} size={20} color={Colors.teal} /></View>
                    <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
                    {item.key === 'notifications' && unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
                    <AppIcon name="chevron-right" size={17} color={Colors.brown600} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.logoutButton} accessibilityRole="button" onPress={handleLogout} activeOpacity={0.75}>
            <AppIcon name="logout" size={19} color={Colors.error} />
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(51,28,8,0.4)' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: Colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, overflow: 'hidden' },
  handle: { width: 40, height: 4, backgroundColor: Colors.line, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 32, color: Colors.brown900 },
  closeButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 4, gap: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.line },
  profileName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 23, color: Colors.brown900 },
  profileEmail: { fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 18, color: Colors.brown600 },
  profileLink: { fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 20, color: Colors.teal, marginTop: 4 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, padding: 12, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.line },
  group: { backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  iconBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 14, lineHeight: 22, color: Colors.brown900 },
  badge: { minWidth: 22, minHeight: 22, borderRadius: 11, backgroundColor: Colors.brown900, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: Colors.mint },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 48, marginHorizontal: 20, marginTop: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line, borderRadius: 14, paddingVertical: 12 },
  logoutText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: Colors.error },
});
