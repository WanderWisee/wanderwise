import React, { useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import "../../App.css";

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profileName,
    setProfileName,
    profileEmail,
    setProfileEmail,
    profileAvatar,
    setProfileAvatar,
  } = useAppData();
  const avatarInputRef = useRef(null);

  const handleAvatarClick = () => avatarInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Applies right away — no need to click "Save" separately for
    // the photo, it shows up in Profile immediately.
    setProfileAvatar(URL.createObjectURL(file));
  };

  const [activeSection, setActiveSection] = useState(
    location.state?.section || "account"
  );
  const [name, setName] = useState(profileName);
  const [email, setEmail] = useState(profileEmail);

  const [language, setLanguage] = useState("English");
  const [dateFormat, setDateFormat] = useState("");
  const [timeFormat, setTimeFormat] = useState("");
  const [distanceFormat, setDistanceFormat] = useState("");

  const notificationLabels = [
    "Trip reminders",
    "Price drops",
    "New followers",
    "Journal likes",
    "Comments",
    "Trip invites",
    "Weekly digest",
    "Promotions",
    "App updates",
  ];
  const [notifications, setNotifications] = useState(
    notificationLabels.map(() => true)
  );

  const toggleNotification = (index) => {
    setNotifications((prev) =>
      prev.map((v, i) => (i === index ? !v : v))
    );
  };

  const handleSaveAccount = () => {
    // TEMPORARY: no backend call yet.
    setProfileName(name);
    setProfileEmail(email);
  };

  return (
    <div className="ww-settings-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/travel-tips">Guides</Link>
          <Link to="/hotels">Hotels</Link>
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
            <h1>Settings</h1>
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
            Account
          </p>
          <p
            className={`ww-settings-nav-item ${activeSection === "preferences" ? "active" : ""}`}
            onClick={() => setActiveSection("preferences")}
          >
            User preferences
          </p>
          <p
            className={`ww-settings-nav-item ${activeSection === "notifications" ? "active" : ""}`}
            onClick={() => setActiveSection("notifications")}
          >
            Notifications
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
                <span>Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label className="ww-settings-field">
                <span>Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <button className="ww-settings-save-btn" onClick={handleSaveAccount}>
                Save
              </button>
            </div>
          )}

          {activeSection === "preferences" && (
            <div className="ww-settings-preferences">
              <h2>🌐 Language</h2>
              <div className="ww-settings-select-box">
                <span className="ww-settings-select-label">Change language</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option>English</option>
                  <option>Filipino</option>
                </select>
              </div>

              <h2>Formatting</h2>

              <p className="ww-settings-field-label">Date Format</p>
              <select
                className="ww-settings-plain-select"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="">Select</option>
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
              </select>

              <p className="ww-settings-field-label">Time Format</p>
              <select
                className="ww-settings-plain-select"
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
              >
                <option value="">Select</option>
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </select>

              <p className="ww-settings-field-label">Distance Format</p>
              <select
                className="ww-settings-plain-select"
                value={distanceFormat}
                onChange={(e) => setDistanceFormat(e.target.value)}
              >
                <option value="">Select</option>
                <option value="km">Kilometers</option>
                <option value="mi">Miles</option>
              </select>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="ww-settings-notifications">
              <h2>Push Notification</h2>
              {notificationLabels.map((label, i) => (
                <label className="ww-settings-notification-row" key={label}>
                  <input
                    type="checkbox"
                    checked={notifications[i]}
                    onChange={() => toggleNotification(i)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}