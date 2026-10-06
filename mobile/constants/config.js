import Constants from 'expo-constants';

// ===== Saan kumokonekta ang app =====
//
// Iisang backend ang gamit ng web at mobile (ang .NET API sa /backend),
// kaya iisang database rin — ito ang "synchronized" na bahagi.
//
// Pagkakasunod-sunod ng paghahanap ng address:
//   1. EXPO_PUBLIC_API_URL sa mobile/.env  (hal. http://192.168.1.151:5269/api
//      o ang URL ng naka-deploy na backend)
//   2. Kusang IP ng laptop na nagpapatakbo ng `npx expo start`
//      (gumagana kapag iisang laptop ang Metro at ang backend)
//   3. localhost (para sa Expo web sa parehong computer)
//
// Tandaan: dapat naka-bind ang backend sa 0.0.0.0, hindi sa localhost
// lang, para maabot ito ng telepono. Gamitin ang `dotnet run --launch-profile lan`.

const BACKEND_PORT = 5269;

function guessDevHost() {
  // Hal. "192.168.1.151:8081" habang tumatakbo ang Metro.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri) return null;
  const host = String(hostUri).split(':')[0];
  // Sa `expo start --tunnel`, ngrok domain ito — hindi dito nakatira ang backend.
  if (/ngrok|exp\.direct/.test(host)) {
    console.warn('[WanderWise] Naka-tunnel ang Expo: itakda ang EXPO_PUBLIC_API_URL sa mobile/.env.local');
    return null;
  }
  return host || null;
}

function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const host = guessDevHost();
  if (host) return `http://${host}:${BACKEND_PORT}/api`;

  return `http://localhost:${BACKEND_PORT}/api`;
}

export const API_URL = resolveApiUrl();

// Ang address ng web app — ginagamit sa mga share/invite link para
// pareho ang link na ibinibigay ng web at ng mobile.
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const STORAGE_KEYS = {
  token: 'wanderwise_token',
  language: 'wanderwise_language',
  preferences: 'wanderwise_preferences',
  pendingJoin: 'wanderwise_pending_join',
};
