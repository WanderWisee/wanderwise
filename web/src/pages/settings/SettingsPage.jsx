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

              <label className="ww-settings-field">
                <span>Bio</span>
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell other students a bit about yourself"
                  maxLength={300}
                />
              </label>

              <label className="ww-settings-field">
                <span>Location</span>
                <input
                  value={profileLocationInput}
                  onChange={(e) => setProfileLocationInput(e.target.value)}
                  placeholder="e.g. Lucena City, Quezon"
                  maxLength={150}
                />
              </label>

              <button className="ww-settings-save-btn" onClick={handleSaveAccount} disabled={savingAccount}>
                {savingAccount ? "Saving..." : "Save"}
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