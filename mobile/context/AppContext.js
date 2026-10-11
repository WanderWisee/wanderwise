import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import { translations } from '../i18n/translations';
import { mobileTranslations } from '../i18n/mobileStrings';
import { getToken, onUnauthorized, setToken } from '../services/api';
import { fetchMe, fetchSettings, updateSettings } from '../services/userService';

// Isang context para sa buong app:
//  - session: token + user (/api/me)
//  - language: en / fil — parehong translations ng web
//  - preferences: date/time/distance format at notification toggles
//    (naka-save sa account sa /api/me/settings, kaya pareho sa web)

const DEFAULT_PREFS = {
  notifTripReminders: true,
  notifTripInvites: true,
  notifComments: true,
  notifTripUpdates: true,
  dateFormat: 'mdy',
  timeFormat: '12h',
  distanceFormat: 'km',
};

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const METERS_PER_MILE = 1609.344;

// Tumatanggap ng "2026-04-17", "2026-04-17T10:00:00" (UTC mula sa server) o Date.
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Walang "Z" ang oras na galing sa server pero UTC ito.
  const iso = /T\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? `${s}Z` : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [language, setLanguageState] = useState('en');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const userLoadRef = useRef(0);

  const loadUser = useCallback(async () => {
    const ticket = ++userLoadRef.current;
    try {
      const [me, settings] = await Promise.all([
        fetchMe(),
        fetchSettings().catch(() => null),
      ]);
      if (ticket !== userLoadRef.current) return;
      setUser(me);
      if (settings) {
        const merged = { ...DEFAULT_PREFS, ...settings };
        setPrefs(merged);
        AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(merged)).catch(() => {});
      }
    } catch {
      // Offline o 401 — ang 401 ay hawak na ng onUnauthorized sa ibaba.
    }
  }, []);

  // Simula ng app: basahin ang token, wika at naka-cache na preferences.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [savedToken, savedLang, savedPrefs] = await Promise.all([
          getToken(),
          AsyncStorage.getItem(STORAGE_KEYS.language).catch(() => null),
          AsyncStorage.getItem(STORAGE_KEYS.preferences).catch(() => null),
        ]);
        if (!alive) return;
        if (savedLang === 'en' || savedLang === 'fil') setLanguageState(savedLang);
        if (savedPrefs) {
          try {
            setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(savedPrefs) });
          } catch {
            // sirang cache — default na lang
          }
        }
        setTokenState(savedToken);
        if (savedToken) loadUser();
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadUser]);

  // Kapag 401 ang sagot ng kahit anong request: tapos na ang session.
  useEffect(
    () =>
      onUnauthorized(() => {
        userLoadRef.current++;
        setTokenState(null);
        setUser(null);
      }),
    []
  );

  // Tinatawag pagkatapos ng matagumpay na login/register (naka-save na ang token).
  const signIn = useCallback(async () => {
    const saved = await getToken();
    setTokenState(saved);
    setUser(null);
    if (saved) await loadUser();
  }, [loadUser]);

  const signOut = useCallback(async () => {
    userLoadRef.current++;
    await setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const setLanguage = useCallback((lang) => {
    if (lang !== 'en' && lang !== 'fil') return;
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEYS.language, lang).catch(() => {});
  }, []);

  // Ipinapakita agad, tapos sine-save sa account. Ibinabalik kung nag-save.
  const updatePrefs = useCallback(
    async (changes) => {
      let next;
      setPrefs((prev) => {
        next = { ...prev, ...changes };
        return next;
      });
      AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(next || {})).catch(() => {});
      if (!token) return true;
      try {
        await updateSettings(changes);
        return true;
      } catch {
        return false;
      }
    },
    [token]
  );

  const value = useMemo(() => {
    const dict = { ...translations.en, ...mobileTranslations.en };
    const langDict = language === 'en' ? dict : { ...translations[language], ...mobileTranslations[language] };
    const t = (key) => langDict[key] ?? dict[key] ?? key;

    const dmy = prefs.dateFormat === 'dmy';

    // style: 'long' -> "January 17, 2026" / "17 January 2026"
    //        'short' -> "Jan 17" / "17 Jan"
    //        'numeric' -> "01/17/2026" / "17/01/2026"
    const formatDate = (val, style = 'long') => {
      const d = toDate(val);
      if (!d) return '';
      const day = d.getDate();
      const y = d.getFullYear();
      if (style === 'numeric') {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return dmy ? `${dd}/${mm}/${y}` : `${mm}/${dd}/${y}`;
      }
      if (style === 'short') {
        const m = MONTHS_SHORT[d.getMonth()];
        return dmy ? `${day} ${m}` : `${m} ${day}`;
      }
      const m = MONTHS_LONG[d.getMonth()];
      return dmy ? `${day} ${m} ${y}` : `${m} ${day}, ${y}`;
    };

    const formatDateRange = (start, end) => {
      const s = toDate(start);
      const e = toDate(end);
      if (!s && !e) return '';
      if (!s || !e) return formatDate(s || e, 'short');
      if (s.getTime() === e.getTime()) return formatDate(s, 'short');
      const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
      if (sameMonth) {
        const m = MONTHS_SHORT[s.getMonth()];
        return dmy ? `${s.getDate()} – ${e.getDate()} ${m}` : `${m} ${s.getDate()} – ${e.getDate()}`;
      }
      return `${formatDate(s, 'short')} – ${formatDate(e, 'short')}`;
    };

    // "14:30" -> "2:30 PM" (12h) o "14:30" (24h)
    const formatTime = (val) => {
      if (!val) return '';
      let h;
      let min;
      if (val instanceof Date) {
        h = val.getHours();
        min = val.getMinutes();
      } else {
        const m = String(val).match(/^(\d{1,2}):(\d{2})/);
        if (!m) return String(val);
        h = Number(m[1]);
        min = Number(m[2]);
      }
      const mm = String(min).padStart(2, '0');
      if (prefs.timeFormat === '24h') return `${String(h).padStart(2, '0')}:${mm}`;
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${mm} ${suffix}`;
    };

    const formatDistance = (meters) => {
      if (meters == null || isNaN(meters)) return '';
      if (prefs.distanceFormat === 'mi') return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
      return `${(meters / 1000).toFixed(1)} km`;
    };

    // "5 minutes ago" atbp. — para sa notifications at comments.
    const timeAgo = (val) => {
      const d = toDate(val);
      if (!d) return '';
      const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
      if (sec < 60) return t('timeJustNow');
      if (sec < 3600) return `${Math.floor(sec / 60)}${t('timeMinutesAgoSuffix')}`;
      if (sec < 86400) return `${Math.floor(sec / 3600)}${t('timeHoursAgoSuffix')}`;
      if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}${t('timeDaysAgoSuffix')}`;
      return formatDate(d, 'long');
    };

    return {
      ready,
      token,
      isLoggedIn: !!token,
      user,
      refreshUser: loadUser,
      setUser,
      signIn,
      signOut,
      language,
      setLanguage,
      t,
      prefs,
      updatePrefs,
      formatDate,
      formatDateRange,
      formatTime,
      formatDistance,
      timeAgo,
    };
  }, [ready, token, user, loadUser, signIn, signOut, language, setLanguage, prefs, updatePrefs]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
