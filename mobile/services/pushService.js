import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';

// Push notifications sa phone (Android APK) — kahit sarado ang app.
// Pagka-login, hihingi ng permission, kukunin ang Expo push token at
// ise-save sa backend (POST /api/me/push-token). Pag-logout, tatanggalin
// ito para hindi na makatanggap ang phone ng notif ng account na iyon.
// Hindi gumagana ang remote push sa Expo Go; sa APK lang ito lalabas.

const PUSH_TOKEN_KEY = 'wanderwise_push_token';

// Ipakita ang notif kahit bukas ang app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'WanderWise',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#A9E4DC',
  });
}

export async function registerForPush() {
  if (Platform.OS === 'web') return null;
  try {
    await ensureAndroidChannel();

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return null;

    await request('/me/push-token', {
      method: 'POST',
      body: { token, platform: Platform.OS },
      timeout: 10000,
    });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {});
    return token;
  } catch {
    // Walang push sa Expo Go / emulator, o walang internet — tuloy lang ang app.
    return null;
  }
}

// Tawagin BAGO burahin ang login token (kailangan pa ang login para sa request).
export async function unregisterPush() {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
    await request('/me/push-token', { method: 'DELETE', body: { token }, timeout: 5000 });
  } catch {
    // Kung pumalya, lilinisin ng backend ang token kapag nag-login ang ibang account.
  }
}
