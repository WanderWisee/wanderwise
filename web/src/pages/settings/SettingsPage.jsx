import React, { useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
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

  const [dateFormat, setDateFormat] = useState("");
  const [timeFormat, setTimeFormat] = useState("");
  const [distanceFormat, setDistanceFormat] = useState("");

  // Labels stay as stable keys internally — only the on-screen text
  // (via t()) changes with the language.
  const notificationKeys = [
    "notifTripReminders",
    "notifPriceDrops",
    "notifNewFollowers",
    "notifJournalLikes",
    "notifComments",
    "notifTripInvites",
    "notifWeeklyDigest",
    "notifPromotions",
    "notifAppUpdates",
  ];
  const [notifications, setNotifications] = useState(
    notificationKeys.map(() => true)
  );

  const toggleNotification = (index) => {
    setNotifications((prev) =>
      prev.map((v, i) => (i === index ? !v : v))
    );
  };

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
                  placeholder="Tell other students a bit about yourself"
                  maxLength={300}
                />
              </label>

              <label className="ww-settings-field">
                <span>{t("accountLocation")}</span>
                <input
                  value={profileLocationInput}
                  onChange={(e) => setProfileLocationInput(e.target.value)}
                  placeholder="e.g. Lucena City, Quezon"
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
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="">{t("select")}</option>
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
              </select>

              <p className="ww-settings-field-label">{t("timeFormat")}</p>
              <select
                className="ww-settings-plain-select"
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
              >
                <option value="">{t("select")}</option>
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </select>

              <p className="ww-settings-field-label">{t("distanceFormat")}</p>
              <select
                className="ww-settings-plain-select"
                value={distanceFormat}
                onChange={(e) => setDistanceFormat(e.target.value)}
              >
                <option value="">{t("select")}</option>
                <option value="km">Kilometers</option>
                <option value="mi">Miles</option>
              </select>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="ww-settings-notifications">
              <h2>{t("pushNotification")}</h2>
              {notificationKeys.map((key, i) => (
                <label className="ww-settings-notification-row" key={key}>
                  <input
                    type="checkbox"
                    checked={notifications[i]}
                    onChange={() => toggleNotification(i)}
                  />
                  <span>{t(key)}</span>
                </label>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}