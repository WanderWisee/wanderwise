import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import "../../App.css";

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  // Formatting + notification choices, saved to the account and used by
  // every page (dates, times, distances, and which notifications arrive).
  const { prefs, updatePrefs, formatDate, formatTime, formatDistance } = usePreferences();
  const [savedHint, setSavedHint] = useState("");

  const savePref = async (changes) => {
    const ok = await updatePrefs(changes);
    setSavedHint(ok ? t("settingSaved") : t("networkError"));
    setTimeout(() => setSavedHint(""), 2000);
  };
  const {
    profileName,
    setProfileName,
    profileEmail,
    setProfileEmail,
    profileAvatar,
    setProfileAvatar,
    profileBio,
    setProfileBio,
    profileLocation,
    setProfileLocation,
  } = useAppData();
  const avatarInputRef = useRef(null);

  const handleAvatarClick = () => avatarInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result; // "data:image/png;base64,...."
      setProfileAvatar(base64); // shows up immediately in the UI

      const token = localStorage.getItem("wanderwise_token");
      if (!token) return;

      try {
        await fetch("/api/me/avatar", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ avatarBase64: base64 }),
        });
      } catch (err) {
        // Network error — picture still shows for now, but won't
        // survive a reload until this call succeeds.
      }
    };
    reader.readAsDataURL(file);
  };

  const [activeSection, setActiveSection] = useState(
    location.state?.section || "account"
  );
  const [name, setName] = useState(profileName);
  const [email, setEmail] = useState(profileEmail);
  const [bio, setBio] = useState(profileBio);
  const [profileLocationInput, setProfileLocationInput] = useState(profileLocation);
  const [savingAccount, setSavingAccount] = useState(false);

  // The profile loads from the server a moment after the page opens (and
  // changes when someone else logs in) — copy it into the boxes when it
  // arrives, instead of only once when the page first opened.
  useEffect(() => setName(profileName), [profileName]);
  useEffect(() => setEmail(profileEmail), [profileEmail]);
  useEffect(() => setBio(profileBio), [profileBio]);
  useEffect(() => setProfileLocationInput(profileLocation), [profileLocation]);

  // Only the notifications WanderWise actually sends. Each maps to one
  // saved setting.
  const notificationOptions = [
    { key: "notifTripReminders", hintKey: "notifTripRemindersHint" },
    { key: "notifTripInvites", hintKey: "notifTripInvitesHint" },
    { key: "notifComments", hintKey: "notifCommentsHint" },
    { key: "notifTripUpdates", hintKey: "notifTripUpdatesHint" },
  ];

  const handleSaveAccount = async () => {
    // Name/Email are still local-only — not wired to the backend yet.
    setProfileName(name);
    setProfileEmail(email);

    // Bio/Location ARE wired to the backend — this is what shows up on
    // your public profile when another student searches for you.
    setProfileBio(bio);
    setProfileLocation(profileLocationInput);

    setSavingAccount(true);
    const token = localStorage.getItem("wanderwise_token");
    if (token) {
      try {
        await fetch("/api/me/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bio, location: profileLocationInput }),
        });
      } catch (err) {
        // Network error — the fields still show locally for now, but
        // won't survive a reload until this call succeeds.
      }
    }
    setSavingAccount(false);
  };

  return (
    <div className="ww-settings-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <Link to="/dashboard">{t("home")}</Link>
          <Link to="/travel-tips">{t("guides")}</Link>
          <Link to="/hotels">{t("hotels")}</Link>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
            👤
          </span>
        </div>
      </header>

      <div className="ww-settings-body">
        <aside className="ww-settings-sidebar">
          <div className="ww-settings-heading-row">
            <h1>{t("settingsTitle")}</h1>
            {activeSection !== "account" && (
              <span
                className="ww-settings-back-arrow"
                onClick={() => setActiveSection("account")}
                style={{ cursor: "pointer" }}
              >
                ←
              </span>
            )}
          </div>

          <p
            className={`ww-settings-nav-item ${activeSection === "account" ? "active" : ""}`}
            onClick={() => setActiveSection("account")}
          >
            {t("settingsAccount")}
          </p>
          <p
            className={`ww-settings-nav-item ${activeSection === "preferences" ? "active" : ""}`}
            onClick={() => setActiveSection("preferences")}
          >
            {t("settingsPreferences")}
          </p>
          <p
            className={`ww-settings-nav-item ${activeSection === "notifications" ? "active" : ""}`}
            onClick={() => setActiveSection("notifications")}
          >
            {t("settingsNotifications")}
          </p>
        </aside>

        <main className="ww-settings-main">
          {activeSection === "account" && (
            <div className="ww-settings-account">
              <div className="ww-settings-avatar-wrapper">
                <div
                  className="ww-settings-avatar"
                  style={
                    profileAvatar
                      ? { backgroundImage: `url(${profileAvatar})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                />
                <span
                  className="ww-settings-avatar-edit"
                  onClick={handleAvatarClick}
                  style={{ cursor: "pointer" }}
                >
                  ✎
                </span>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </div>

              <label className="ww-settings-field">
                <span>{t("accountName")}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label className="ww-settings-field">
                <span>{t("accountEmail")}</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <label className="ww-settings-field">
                <span>{t("accountBio")}</span>
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("bioPlaceholder")}
                  maxLength={300}
                />
              </label>

              <label className="ww-settings-field">
                <span>{t("accountLocation")}</span>
                <input
                  value={profileLocationInput}
                  onChange={(e) => setProfileLocationInput(e.target.value)}
                  placeholder={t("locationPlaceholder")}
                  maxLength={150}
                />
              </label>

              <button className="ww-settings-save-btn" onClick={handleSaveAccount} disabled={savingAccount}>
                {savingAccount ? t("saving") : t("save")}
              </button>
            </div>
          )}

          {activeSection === "preferences" && (
            <div className="ww-settings-preferences">
              <h2>🌐 {t("changeLanguage")}</h2>
              <div className="ww-settings-select-box">
                <span className="ww-settings-select-label">{t("changeLanguage")}</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="fil">Filipino</option>
                </select>
              </div>

              <h2>{t("formatting")}</h2>

              <p className="ww-settings-field-label">{t("dateFormat")}</p>
              <select
                className="ww-settings-plain-select"
                value={prefs.dateFormat}
                onChange={(e) => savePref({ dateFormat: e.target.value })}
              >
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
              </select>

              <p className="ww-settings-field-label">{t("timeFormat")}</p>
              <select
                className="ww-settings-plain-select"
                value={prefs.timeFormat}
                onChange={(e) => savePref({ timeFormat: e.target.value })}
              >
                <option value="12h">{t("hour12")}</option>
                <option value="24h">{t("hour24")}</option>
              </select>

              <p className="ww-settings-field-label">{t("distanceFormat")}</p>
              <select
                className="ww-settings-plain-select"
                value={prefs.distanceFormat}
                onChange={(e) => savePref({ distanceFormat: e.target.value })}
              >
                <option value="km">{t("kilometers")}</option>
                <option value="mi">{t("miles")}</option>
              </select>

              {/* Live preview so the student sees the effect right away. */}
              <p className="ww-settings-preview">
                {t("formatPreview")}: {formatDate("2026-04-17")} · {formatTime("14:30")} · {formatDistance(2300)}
              </p>
              {savedHint && <p className="ww-settings-saved">{savedHint}</p>}
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="ww-settings-notifications">
              <h2>{t("pushNotification")}</h2>
              {notificationOptions.map(({ key, hintKey }) => (
                <label className="ww-settings-notification-row" key={key}>
                  {/* A setting the account hasn't saved yet counts as ON. */}
                  <input
                    type="checkbox"
                    checked={prefs[key] !== false}
                    onChange={() => savePref({ [key]: prefs[key] === false })}
                  />
                  <span>
                    {t(key)}
                    <small className="ww-settings-notif-hint">{t(hintKey)}</small>
                  </span>
                </label>
              ))}
              {/* Security alerts can't be turned off. */}
              <p className="ww-settings-notif-always" style={{ fontSize: 13, opacity: 0.75, marginTop: 14 }}>🔒 {t("notifSecurityAlwaysOn")}</p>
              {savedHint && <p className="ww-settings-saved">{savedHint}</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}