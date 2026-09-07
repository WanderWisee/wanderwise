import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("trips"); // "trips" | "journal"

  // Placeholder data — swap these out once trips/journal entries are
  // actually persisted (e.g. from TripPlanBuilderPage saves).
  const trips = [{ id: 1, name: "La Union", img: "/assets/la-union.webp" }];
  const journalEntries = [{ id: 1, name: "Singapore", img: "/assets/singapore.jpg" }];

  return (
    <div className="ww-profile-page">
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

      <div className="ww-profile-cover" />

      <div className="ww-profile-info">
        <div className="ww-profile-avatar" />
        <h1 className="ww-profile-username">Username_150</h1>
        <p className="ww-profile-bio">bio</p>
        <p className="ww-profile-location">Location</p>

        <div className="ww-profile-stats">
          <div>
            <strong>0</strong>
            <span>followers</span>
          </div>
          <div>
            <strong>0</strong>
            <span>following</span>
          </div>
          <div>
            <strong>0</strong>
            <span>likes</span>
          </div>
        </div>

        <div className="ww-profile-actions">
          <button className="ww-profile-edit-btn" onClick={() => navigate("/settings")}>
            Edit
          </button>
          <button className="ww-profile-share-btn">Share</button>
        </div>
      </div>

      <div className="ww-profile-tabs">
        <span
          className={`ww-profile-tab ${activeTab === "trips" ? "active" : ""}`}
          onClick={() => setActiveTab("trips")}
        >
          🧳 Trips
        </span>
        <span
          className={`ww-profile-tab ${activeTab === "journal" ? "active" : ""}`}
          onClick={() => setActiveTab("journal")}
        >
          📔 Journal
        </span>
      </div>

      <main className="ww-profile-main">
        {activeTab === "trips" ? (
          <>
            <div className="ww-profile-section-header">
              <h2>Your Travels</h2>
              <button
                className="ww-profile-new-btn"
                onClick={() => navigate("/trip-planning")}
              >
                + Add new plan
              </button>
            </div>
            <div className="ww-profile-grid">
              {trips.map((t) => (
                <div className="ww-profile-card" key={t.id}>
                  <img src={t.img} alt={t.name} />
                  <p>{t.name}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="ww-profile-section-header">
              <h2>Your Travel Stories</h2>
              <button
                className="ww-profile-new-btn"
                onClick={() => navigate("/journal/new")}
              >
                + New post
              </button>
            </div>
            <div className="ww-profile-grid">
              {journalEntries.map((j) => (
                <div className="ww-profile-card" key={j.id}>
                  <img src={j.img} alt={j.name} />
                  <p>{j.name}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}