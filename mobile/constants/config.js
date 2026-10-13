import Constants from 'expo-constants';

const BACKEND_PORT = 5269;

function guessDevHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (!hostUri) return null;

  const host = String(hostUri).split(':')[0];

  if (/ngrok|exp\.direct/.test(host)) {
    console.warn(
      '[WanderWise] Set EXPO_PUBLIC_API_URL in mobile/.env.local when using an Expo tunnel.'
    );
    return null;
  }

  return host || null;
}

function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  const host = guessDevHost() || 'localhost';

  return `http://${host}:${BACKEND_PORT}/api`;
}

export const API_URL = resolveApiUrl();

export const WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL ||
  `http://${guessDevHost() || 'localhost'}:3000`
).replace(/\/+$/, '');

export const STORAGE_KEYS = {
  token: 'wanderwise_token',
  language: 'wanderwise_language',
  preferences: 'wanderwise_preferences',
  pendingJoin: 'wanderwise_pending_join',
};