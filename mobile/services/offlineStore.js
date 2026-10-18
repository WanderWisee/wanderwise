import AsyncStorage from '@react-native-async-storage/async-storage';

// Offline mode (mobile): a copy of the trips on the phone, plus an "outbox"
// of trip edits made without internet that is sent automatically once the
// phone is back online. Uses AsyncStorage (already in the app), so there is
// no new native package and it can ship through an OTA update.
const PREFIX = 'ww_offline:';
const CACHE = `${PREFIX}cache:`;
const PENDING = `${PREFIX}pending:`;

// ApiError status 0 = no connection / server unreachable / timed out.
export function isOfflineError(error) {
  return !!error && error.status === 0;
}

async function readJson(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the app still works online.
  }
}

// ===== Saved copies (trip list, trip details, expenses, crew, bookings) =====

export const getCached = (name) => readJson(CACHE + name);
export const setCached = (name, value) => writeJson(CACHE + name, value);

// ===== Outbox: one pending full save per trip =====
// A trip save replaces the whole plan, so only the newest edit matters.

export const getPendingSave = (tripId) => readJson(PENDING + tripId);

export const setPendingSave = (tripId, entry) =>
  writeJson(PENDING + tripId, { ...entry, queuedAt: Date.now() });

export async function removePendingSave(tripId) {
  try {
    await AsyncStorage.removeItem(PENDING + tripId);
  } catch {
    // ignore
  }
}

export async function listPendingTripIds() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((k) => k.startsWith(PENDING)).map((k) => k.slice(PENDING.length));
  } catch {
    return [];
  }
}

// On sign out / expired login: the saved copies belong to that account.
export async function clearOfflineData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    // ignore
  }
}

// ===== Trips open on screen =====
// An open trip syncs itself (and can show the "trip was changed" dialog),
// so the background sync skips it.

const openTrips = new Map();

export function markTripOpen(tripId) {
  const key = String(tripId);
  openTrips.set(key, (openTrips.get(key) || 0) + 1);
  return () => {
    const left = (openTrips.get(key) || 1) - 1;
    if (left <= 0) openTrips.delete(key);
    else openTrips.set(key, left);
  };
}

export const isTripOpen = (tripId) => openTrips.has(String(tripId));

// ===== Online / offline state for banners =====

let offline = false;
const listeners = new Set();

export function setOffline(value) {
  if (offline === value) return;
  offline = value;
  listeners.forEach((listener) => {
    try {
      listener(value);
    } catch {
      // One listener must not stop the others.
    }
  });
}

export const isOffline = () => offline;

export function onOfflineChange(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
