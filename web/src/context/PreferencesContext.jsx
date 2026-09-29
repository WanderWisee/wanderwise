import React, { createContext, useContext, useEffect, useRef, useState } from "react";

// Settings → Formatting (date, time, distance) and Settings →
// Notifications, shared across the whole app like LanguageContext.
// Saved to the student's account (/api/me/settings) so they follow them
// to any device; also cached in localStorage so pages show the right
// format immediately, before the server answers.

const DEFAULTS = {
  notifTripReminders: true,
  notifTripInvites: true,
  notifComments: true,
  dateFormat: "mdy", // "mdy" = January 17, 2026 / 01/17/2026 · "dmy" = 17 January 2026 / 17/01/2026
  timeFormat: "12h", // "12h" = 2:30 PM · "24h" = 14:30
  distanceFormat: "km", // "km" or "mi"
};

const CACHE_KEY = "wanderwise_preferences";
const METERS_PER_MILE = 1609.344;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function writeCache(prefs) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable — the setting still works for this visit.
  }
}

function readToken() {
  try {
    return localStorage.getItem("wanderwise_token");
  } catch {
    return null;
  }
}

// Accepts "2026-04-17", "2026-04-17T00:00:00" or a Date.
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10)) && s.length <= 10) {
    return new Date(s + "T00:00:00");
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(readCache);
  const lastTokenRef = useRef(null);

  const loadFromServer = async (token) => {
    try {
      const resp = await fetch("/api/me/settings", { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) return;
      const data = await resp.json();
      const merged = { ...DEFAULTS, ...data };
      setPrefs(merged);
      writeCache(merged);
    } catch {
      // Offline — keep the cached settings.
    }
  };

  // Load once on start, and again whenever someone logs in (the token
  // changes without a page reload after login).
  useEffect(() => {
    const check = () => {
      const token = readToken();
      if (token && token !== lastTokenRef.current) {
        lastTokenRef.current = token;
        loadFromServer(token);
      }
      if (!token) lastTokenRef.current = null;
    };
    check();
    const timer = setInterval(check, 3000);
    return () => clearInterval(timer);
  }, []);

  // Changes one or more settings: shows right away, then saves.
  const updatePrefs = async (changes) => {
    const next = { ...prefs, ...changes };
    setPrefs(next);
    writeCache(next);
    const token = readToken();
    if (!token) return true;
    try {
      const resp = await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(changes),
      });
      return resp.ok;
    } catch {
      return false;
    }
  };

  const dateLocale = prefs.dateFormat === "dmy" ? "en-GB" : "en-US";

  // "January 17, 2026" (mdy) or "17 January 2026" (dmy). Pass options to
  // change the style, e.g. { month: "short", day: "numeric" }.
  const formatDate = (value, options = { month: "long", day: "numeric", year: "numeric" }) => {
    const d = toDate(value);
    return d ? d.toLocaleDateString(dateLocale, options) : "";
  };

  // "04/17/2026" (mdy) or "17/04/2026" (dmy).
  const formatDateNumeric = (value) =>
    formatDate(value, { month: "2-digit", day: "2-digit", year: "numeric" });

  // "April 17 – 19, 2026" / "17 – 19 April 2026", or both dates in full
  // when the range crosses months or years.
  const formatDateRange = (start, end) => {
    const s = toDate(start);
    const e = toDate(end);
    if (!s) return "";
    if (!e || s.getTime() === e.getTime()) return formatDate(s);
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    if (sameMonth) {
      const month = s.toLocaleDateString(dateLocale, { month: "long" });
      return prefs.dateFormat === "dmy"
        ? `${s.getDate()} – ${e.getDate()} ${month} ${s.getFullYear()}`
        : `${month} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${formatDate(s)} – ${formatDate(e)}`;
  };

  // Accepts "14:30" (itinerary time) or a Date.
  const formatTime = (value) => {
    if (!value) return "";
    let d = value;
    if (!(value instanceof Date)) {
      const m = String(value).match(/^(\d{1,2}):(\d{2})/);
      if (!m) return String(value);
      d = new Date();
      d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    }
    const hour12 = prefs.timeFormat !== "24h";
    return d.toLocaleTimeString(hour12 ? "en-US" : "en-GB", {
      hour: hour12 ? "numeric" : "2-digit",
      minute: "2-digit",
      hour12,
    });
  };

  // Distance in meters → "2.3 km" or "1.4 mi".
  const formatDistance = (meters) => {
    if (meters == null || isNaN(meters)) return "";
    if (prefs.distanceFormat === "mi") return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <PreferencesContext.Provider
      value={{
        prefs,
        updatePrefs,
        formatDate,
        formatDateNumeric,
        formatDateRange,
        formatTime,
        formatDistance,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}