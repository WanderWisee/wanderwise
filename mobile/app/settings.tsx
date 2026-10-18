import AppIcon from '../components/AppIcon';
import { Text } from '../components/Typography';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import FadeScrollView from '../components/FadeScrollView';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { confirmLogout } from '../utils/confirmLogout';

const SETTINGS_ITEMS = [
  { key: 'account', labelKey: 'settingsAccount', icon: 'user', tint: '#F4D9A8', route: '/settings/account' },
  { key: 'preferences', labelKey: 'settingsPreferences', icon: 'settings', tint: '#C9D9C4', route: '/settings/preferences' },
  { key: 'notifications', labelKey: 'settingsNotifications', icon: 'bell', tint: '#D9C4D0', route: '/settings/notifications' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { t, signOut } = useApp();
  const { confirm } = useDialog();

  async function handleLogout() {
    if (!(await confirmLogout(confirm, t))) return;
    await signOut();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AppIcon name="arrow-left" style={styles.backText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>
        <View style={{ width: 34 }} />
      </View>

      <FadeScrollView fadeHeight={24} contentContainerStyle={styles.content}>
        <View style={styles.itemsCard}>
          {SETTINGS_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.row, index !== SETTINGS_ITEMS.length - 1 && styles.rowDivider]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.6}
            >
              <View style={[styles.iconBadge, { backgroundColor: item.tint }]}>
                <AppIcon name={item.icon} size={20} />
              </View>
              <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
              <AppIcon name="chevron-right" style={styles.rowChevron} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <AppIcon name="logout" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </FadeScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: Colors.brown900 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  itemsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
    marginBottom: 24, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  iconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: Colors.brown900 },
  rowChevron: { fontSize: 18, color: Colors.brown600 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.brown900, borderRadius: 16, height: 52,
    shadowColor: Colors.brown900, shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  logoutIcon: { fontSize: 15, color: Colors.onButton },
  logoutText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.onButton },
});