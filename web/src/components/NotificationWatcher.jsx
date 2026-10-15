import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { usePreferences } from "../context/PreferencesContext";
import { notificationText } from "../utils/notificationText";
import {
  initOneSignal,
  isOneSignalEnabled,
  loginOneSignal,
  logoutOneSignal,
  userIdFromToken,
} from "../utils/oneSignal";

// Runs in the background on every page (see App.jsx):
// 1. Links this browser to the logged-in student in OneSignal, so real
//    push notifications reach this laptop even when WanderWise is closed.
// 2. Every minute checks /api/notifications. If OneSignal isn't set up
//    yet, it shows its own browser pop-up for anything new (only works
//    while WanderWise is open).
const POLL_MS = 60 * 1000;

// Red badge on the navbar bell: puts the unread count on <html> and the
// CSS in App.css draws it on the bell icon of every page. 0 hides it.
export function setUnreadBadge(count) {
  const root = document.documentElement;
  if (count > 0) {
    root.setAttribute("data-ww-unread", String(count));
    root.style.setProperty("--ww-unread-label", `"${count > 9 ? "9+" : count}"`);
  } else {
    root.removeAttribute("data-ww-unread");
    root.style.removeProperty("--ww-unread-label");
  }
}

export default function NotificationWatcher() {
  const { t } = useLanguage();
  const { formatTime } = usePreferences();
  const shownIdsRef = useRef(new Set());
  const startedAtRef = useRef(Date.now());

  // Keep the latest t/formatTime without restarting the timer.
  const textRef = useRef({ t, formatTime });
  textRef.current = { t, formatTime };

  // OneSignal: start it, and log this browser in/out with the student.
  useEffect(() => {
    if (!isOneSignalEnabled()) return undefined;
    initOneSignal();
    const sync = () => {
      let token = null;
      try {
        token = localStorage.getItem("wanderwise_token");
      } catch {
        token = null;
      }
      if (token) loginOneSignal(userIdFromToken(token));
      else logoutOneSignal();
    };
    sync();
    const timer = setInterval(sync, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      let token = null;
      try {
        token = localStorage.getItem("wanderwise_token");
      } catch {
        token = null;
      }
      if (!token) {
        setUnreadBadge(0); // logged out
        return;
      }

      try {
        const resp = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok || cancelled) return;
        const items = await resp.json();
        if (!Array.isArray(items)) return;

        setUnreadBadge(items.filter((n) => !n.isRead).length);

        // With OneSignal on, it already sends the pop-up — don't show a second one.
        const canPopUp =
          !isOneSignalEnabled() && typeof Notification !== "undefined" && Notification.permission === "granted";

        items.forEach((n) => {
          if (n.isRead || shownIdsRef.current.has(n.id)) return;
          shownIdsRef.current.add(n.id);

          // Don't pop up old notifications from before this visit — only
          // ones created in the last 10 minutes or after the page opened.
          const created = new Date(String(n.createdAt).endsWith("Z") ? n.createdAt : n.createdAt + "Z").getTime();
          const isFresh = created >= startedAtRef.current - 10 * 60 * 1000;
          if (!canPopUp || !isFresh) return;

          const { t: tt, formatTime: ft } = textRef.current;
          const popup = new Notification("WanderWise", {
            body: notificationText(n, tt, ft),
            icon: "/assets/brand/logo.png",
            tag: `ww-${n.id}`,
          });
          popup.onclick = () => {
            window.focus();
            if (n.link) window.location.href = n.link;
          };
        });
      } catch {
        // Offline — try again next minute.
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    // Also check right away when the student comes back to the tab, or
    // after logging in/out (so the badge doesn't wait a full minute).
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    window.addEventListener("wanderwise-auth-changed", onFocus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("wanderwise-auth-changed", onFocus);
    };
  }, []);

  return null;
}