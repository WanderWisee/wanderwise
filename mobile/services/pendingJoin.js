import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import { joinTripByToken } from './tripService';

// Kapag binuksan ang invite link nang hindi pa naka-login, itatabi muna
// ang token; pagkatapos mag-login o mag-register, sasali na sa trip.

export async function savePendingJoin(shareToken) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.pendingJoin, shareToken);
  } catch {
    // hindi kritikal
  }
}

// Ibinabalik ang tripId kapag nakasali, o null.
export async function consumePendingJoin() {
  let token = null;
  try {
    token = await AsyncStorage.getItem(STORAGE_KEYS.pendingJoin);
    if (token) await AsyncStorage.removeItem(STORAGE_KEYS.pendingJoin);
  } catch {
    return null;
  }
  if (!token) return null;
  try {
    const data = await joinTripByToken(token);
    return data && data.tripId ? data.tripId : null;
  } catch {
    return null;
  }
}

// Kinukuha ang share token mula sa buong link o sa token mismo:
// "https://.../trip-plan/join/abc123" -> "abc123"
export function extractShareToken(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const m = raw.match(/join\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{8,}$/.test(raw) ? raw : '';
}
