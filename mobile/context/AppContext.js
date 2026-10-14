import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { startLiveSync } from '../utils/liveSync';
import { STORAGE_KEYS } from '../constants/config';
import { translations } from '../i18n/translations';
import { mobileTranslations } from '../i18n/mobileStrings';
import { studentTranslations } from '../i18n/studentStrings';

import {
  getToken,
  onUnauthorized,
  setToken,
} from '../services/api';

import {
  fetchMe,
  fetchSettings,
  updateSettings,
} from '../services/userService';

const DEFAULT_PREFS = {
  notifTripReminders: true,
  notifTripInvites: true,
  notifComments: true,
  notifTripUpdates: true,
  dateFormat: 'mdy',
  timeFormat: '12h',
  distanceFormat: 'km',
};

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const METERS_PER_MILE = 1609.344;

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const s = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const iso =
    /T\d{2}:\d{2}/.test(s) &&
    !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)
      ? `${s}Z`
      : s;

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
  const prefsRef = useRef(DEFAULT_PREFS);
  const prefsRevisionRef = useRef(0);
  const pendingPrefsRef = useRef(0);
  const prefsWriteRef = useRef(Promise.resolve());
  const confirmedPrefsRef = useRef(DEFAULT_PREFS);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const loadUser = useCallback(async () => {
    const ticket = ++userLoadRef.current;

    try {
      const [me, settings] = await Promise.all([
        fetchMe(),
        fetchSettings().catch(() => null),
      ]);

      if (ticket !== userLoadRef.current) return;

      setUser(me);

      if (settings && !pendingPrefsRef.current) {
        const merged = {
          ...DEFAULT_PREFS,
          ...settings,
        };

        confirmedPrefsRef.current = merged;
        setPrefs(merged);

        AsyncStorage.setItem(
          STORAGE_KEYS.preferences,
          JSON.stringify(merged)
        ).catch(() => {});
      }
    } catch {
      // Keep existing data during temporary connection failures.
      // Invalid sessions are handled by onUnauthorized.
    }
  }, []);

  // Restore the saved session and local preferences.
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [
          savedToken,
          savedLang,
          savedPrefs,
        ] = await Promise.all([
          getToken(),
          AsyncStorage.getItem(
            STORAGE_KEYS.language
          ).catch(() => null),
          AsyncStorage.getItem(
            STORAGE_KEYS.preferences
          ).catch(() => null),
        ]);

        if (!alive) return;

        if (savedLang === 'en' || savedLang === 'fil') {
          setLanguageState(savedLang);
        }

        if (savedPrefs) {
          try {
            setPrefs({
              ...DEFAULT_PREFS,
              ...JSON.parse(savedPrefs),
            });
          } catch {
            // Ignore an invalid local cache.
          }
        }

        setTokenState(savedToken);

        if (savedToken) {
          void loadUser();
        }
      } finally {
        if (alive) {
          setReady(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadUser]);

  // Refresh account data while the app is active.
  useEffect(() => {
    if (!token) return;

    let active =
      AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive';

    return startLiveSync(
      async (isCurrent) => {
        const ticket = userLoadRef.current;
        const prefsRevision = prefsRevisionRef.current;

        const [me, settings] = await Promise.all([
          fetchMe(),
          fetchSettings(),
        ]);

        if (
          !isCurrent() ||
          ticket !== userLoadRef.current
        ) {
          return;
        }

        setUser(me);

        // Do not replace preferences changed during this request.
        if (
          prefsRevision !== prefsRevisionRef.current ||
          pendingPrefsRef.current
        ) {
          return;
        }

        const merged = {
          ...DEFAULT_PREFS,
          ...settings,
        };

        confirmedPrefsRef.current = merged;
        setPrefs(merged);

        AsyncStorage.setItem(
          STORAGE_KEYS.preferences,
          JSON.stringify(merged)
        ).catch(() => {});
      },
      {
        interval: 10000,
        isActive: () => active,
        subscribe: (wake) => {
          const subscription =
            AppState.addEventListener(
              'change',
              (state) => {
                active = state === 'active';
                wake();
              }
            );

          return () => subscription.remove();
        },
      }
    );
  }, [token]);

  // Clear an expired or invalid session.
  useEffect(
    () =>
      onUnauthorized(() => {
        userLoadRef.current += 1;
        setTokenState(null);
        setUser(null);
      }),
    []
  );

  const signIn = useCallback(async () => {
    const saved = await getToken();

    setTokenState(saved);
    setUser(null);

    if (saved) {
      await loadUser();
    }
  }, [loadUser]);

  const signOut = useCallback(async () => {
    userLoadRef.current += 1;

    await setToken(null);

    setTokenState(null);
    setUser(null);
  }, []);

  const setLanguage = useCallback((lang) => {
    if (lang !== 'en' && lang !== 'fil') return;

    setLanguageState(lang);

    AsyncStorage.setItem(
      STORAGE_KEYS.language,
      lang
    ).catch(() => {});
  }, []);

  const updatePrefs = useCallback(
    async (changes) => {
      prefsRevisionRef.current += 1;
      const revision = prefsRevisionRef.current;


      const next = {
        ...prefsRef.current,
        ...changes,
      };

      prefsRef.current = next;
      setPrefs(next);

      AsyncStorage.setItem(
        STORAGE_KEYS.preferences,
        JSON.stringify(next)
      ).catch(() => {});

      if (!token) return true;

      pendingPrefsRef.current += 1;

      try {
        const write = prefsWriteRef.current.then(() => updateSettings(next));
        prefsWriteRef.current = write.catch(() => {});
        await write;
        confirmedPrefsRef.current = next;
        return true;
      } catch {
        if (prefsRevisionRef.current === revision) {
          prefsRef.current = confirmedPrefsRef.current;
          setPrefs(confirmedPrefsRef.current);
          await AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(confirmedPrefsRef.current)).catch(() => {});
        }
        return false;
      } finally {
        pendingPrefsRef.current -= 1;
      }
    },
    [token]
  );

  const t = useCallback((key) => {
    return studentTranslations[language]?.[key] ?? mobileTranslations[language]?.[key] ?? translations[language]?.[key]
      ?? studentTranslations.en[key] ?? mobileTranslations.en[key] ?? translations.en[key] ?? key;
  }, [language]);

  const value = useMemo(() => {
    const dmy = prefs.dateFormat === 'dmy';

    const formatDate = (val, style = 'long') => {
      const d = toDate(val);
      if (!d) return '';

      const day = d.getDate();
      const y = d.getFullYear();

      if (style === 'numeric') {
        const mm = String(
          d.getMonth() + 1
        ).padStart(2, '0');

        const dd = String(day).padStart(2, '0');

        return dmy
          ? `${dd}/${mm}/${y}`
          : `${mm}/${dd}/${y}`;
      }

      if (style === 'short') {
        const m = MONTHS_SHORT[d.getMonth()];

        return dmy
          ? `${day} ${m}`
          : `${m} ${day}`;
      }

      const m = MONTHS_LONG[d.getMonth()];

      return dmy
        ? `${day} ${m} ${y}`
        : `${m} ${day}, ${y}`;
    };

    const formatDateRange = (start, end) => {
      const s = toDate(start);
      const e = toDate(end);

      if (!s && !e) return '';

      if (!s || !e) {
        return formatDate(s || e, 'short');
      }

      if (s.getTime() === e.getTime()) {
        return formatDate(s, 'short');
      }

      const sameMonth =
        s.getMonth() === e.getMonth() &&
        s.getFullYear() === e.getFullYear();

      if (sameMonth) {
        const m = MONTHS_SHORT[s.getMonth()];

        return dmy
          ? `${s.getDate()} – ${e.getDate()} ${m}`
          : `${m} ${s.getDate()} – ${e.getDate()}`;
      }

      return `${formatDate(
        s,
        'short'
      )} – ${formatDate(e, 'short')}`;
    };

    const formatTime = (val) => {
      if (!val) return '';

      let h;
      let min;

      if (val instanceof Date) {
        h = val.getHours();
        min = val.getMinutes();
      } else {
        const m = String(val).match(
          /^(\d{1,2}):(\d{2})/
        );

        if (!m) return String(val);

        h = Number(m[1]);
        min = Number(m[2]);
      }

      const mm = String(min).padStart(2, '0');

      if (prefs.timeFormat === '24h') {
        return `${String(h).padStart(2, '0')}:${mm}`;
      }

      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;

      return `${h12}:${mm} ${suffix}`;
    };

    const formatDistance = (meters) => {
      if (meters == null || isNaN(meters)) return '';

      if (prefs.distanceFormat === 'mi') {
        return `${(
          meters / METERS_PER_MILE
        ).toFixed(1)} mi`;
      }

      return `${(meters / 1000).toFixed(1)} km`;
    };

    const timeAgo = (val) => {
      const d = toDate(val);
      if (!d) return '';

      const sec = Math.max(
        0,
        (Date.now() - d.getTime()) / 1000
      );

      if (sec < 60) {
        return t('timeJustNow');
      }

      if (sec < 3600) {
        return `${Math.floor(
          sec / 60
        )}${t('timeMinutesAgoSuffix')}`;
      }

      if (sec < 86400) {
        return `${Math.floor(
          sec / 3600
        )}${t('timeHoursAgoSuffix')}`;
      }

      if (sec < 7 * 86400) {
        return `${Math.floor(
          sec / 86400
        )}${t('timeDaysAgoSuffix')}`;
      }

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
  }, [
    ready,
    token,
    user,
    loadUser,
    signIn,
    signOut,
    language,
    setLanguage,
    prefs,
    updatePrefs,
    t,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error(
      'useApp must be used within AppProvider'
    );
  }

  return ctx;
}