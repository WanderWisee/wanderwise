import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { notificationText, notificationIcon } from "../../utils/notificationText";
import { requestPushPermission, isOneSignalEnabled } from "../../utils/oneSignal";
import "../../App.css";

// The server sends UTC times without the "Z" — add it so the browser
// converts to local (Philippine) time correctly.
function toLocalDate(value) {
  const s = String(value);
  return new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDate, formatTime } = usePreferences();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const token = (() => {
    try {
      return localStorage.getItem("wanderwise_token");
    } catch {
      return null;
    }
  })();

  const load = () => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = (n) => {
    if (n.isRead || !token) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    fetch(`/api/notifications/${n.id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const handleOpen = (n) => {
    markRead(n);
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = () => {
    if (!token) return;
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    fetch("/api/notifications/read-all", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  // Browsers only allow asking after a click, so this is a button.
  const handleEnableBrowserNotifications = async () => {
    if (typeof Notification === "undefined") return;
    // Goes through OneSignal when it's set up (real push, even when the
    // tab is closed); otherwise the browser's own permission prompt.
    const result = await requestPushPermission();
    setPermission(result);
  };

  const formatWhen = (value) => {
    const d = toLocalDate(value);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `${formatTime(d)} ${t("today")}`;
    return `${formatDate(d, { month: "short", day: "numeric" })}, ${formatTime(d)}`;
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="ww-notifications-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">{t("navHome")}</a>
          <a href="/travel-tips">{t("navGuides")}</a>
          <a href="/hotels">{t("navHotels")}</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-notifications-main">
        <div className="ww-notifications-header">
          <h1 className="ww-notifications-title">{t("notificationsTitle")}</h1>
          <div className="ww-notifications-actions">
            {unreadCount > 0 && (
              <button type="button" className="ww-show-more-btn" style={{ marginTop: 0 }} onClick={handleMarkAllRead}>
                ✓ {t("markAllRead")}
              </button>
            )}
            <button
              type="button"
              className="ww-booking-cancel"
              onClick={() => navigate("/settings", { state: { section: "notifications" } })}
            >
              ⚙ {t("notificationSettings")}
            </button>
          </div>
        </div>

        {permission === "default" && (
          <div className="ww-notif-permission">
            <span>{t(isOneSignalEnabled() ? "enableBrowserNotifHintPush" : "enableBrowserNotifHint")}</span>
            <button type="button" className="ww-optimize-btn" onClick={handleEnableBrowserNotifications}>
              {t("enableBrowserNotif")}
            </button>
          </div>
        )}
        {permission === "denied" && <p className="ww-notifications-empty">{t("browserNotifBlocked")}</p>}

        {loading ? (
          <p className="ww-notifications-empty">{t("loadingEllipsis")}</p>
        ) : notifications.length === 0 ? (
          <p className="ww-notifications-empty">{t("noUpdatesRightNow")}</p>
        ) : (
          <ul className="ww-notifications-list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`ww-notif-item ${n.isRead ? "" : "ww-notif-unread"}`}
                onClick={() => handleOpen(n)}
              >
                <span className="ww-notif-icon">{notificationIcon(n.type)}</span>
                <div className="ww-notif-body">
                  <p className="ww-notif-text">{notificationText(n, t, formatTime)}</p>
                  <p className="ww-notif-time">{formatWhen(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="ww-notif-dot" />}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}