import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  // TODO: replace with real fetch('/api/notifications') once backend is ready
  useEffect(() => {
    setNotifications([]);
  }, []);

  return (
    <div className="ww-notifications-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">Home</a>
          <a href="/travel-tips">Guides</a>
          <a href="/hotels">Hotels</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-notifications-main">
        <h1 className="ww-notifications-title">Notifications</h1>
        {notifications.length === 0 ? (
          <p className="ww-notifications-empty">No updates at the moment.</p>
        ) : (
          <ul className="ww-notifications-list">
            {notifications.map((n) => (
              <li key={n.id}>{n.message}</li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}