import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("account"); // "account" | "preferences" | "notifications"

  const [name, setName] = useState("Rolando Hamburger");
  const [username, setUsername] = useState("User 150");
  const [email, setEmail] = useState("User150@gmail.com");

  const [language, setLanguage] = useState("English");
  const [plannerMode, setPlannerMode] = useState("");
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
    console.log({ name, username, email });
  };

  return (
    <div className="ww-settings-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">Home</a>
          <a href="/travel-tips">Guides</a>
          <a href="/hotels">Hotels</a>
          <span className="ww-menu-dropdown">Menu</span>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
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
                <div className="ww-settings-avatar" />
                <span className="ww-settings-avatar-edit">✎</span>
              </div>

              <label className="ww-settings-field">
                <span>Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label className="ww-settings-field">
                <span>Username</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
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

              <h2>Trip and Journal Planner</h2>
              <p className="ww-settings-subtext">Plan trips offline, sync when connected.</p>
              <select
                className="ww-settings-plain-select"
                value={plannerMode}
                onChange={(e) => setPlannerMode(e.target.value)}
              >
                <option value="">Select</option>
                <option value="offline">Offline first</option>
                <option value="online">Always online</option>
              </select>

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