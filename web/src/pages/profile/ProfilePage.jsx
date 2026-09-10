import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import "../../App.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { journalEntries, profileName, profileAvatar } = useAppData();

  const [activeTab, setActiveTab] = useState("trips");

  // Placeholder data — swap out once trips are actually persisted.
  const trips = [{ id: 1, name: "La Union", img: "/assets/la-union.webp" }];

  // A default example card, same as the one in Guides — links to the
  // real Boracay guide content instead of a user-posted journal entry.
  const defaultJournalEntries = [
    {
      id: "default-boracay",
      title: "Boracay, Aklan",
      coverImage: "/assets/boracay.jpg",
      isDefault: true,
    },
  ];

  return (
    <div className="ww-profile-page">
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

      <div className="ww-profile-cover" />

      <div className="ww-profile-info">
        <div
          className="ww-profile-avatar"
          style={
            profileAvatar
              ? { backgroundImage: `url(${profileAvatar})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
        <h1 className="ww-profile-username">{profileName}</h1>
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
              {[...defaultJournalEntries, ...journalEntries].map((j) => (
                <div
                  className="ww-profile-card"
                  key={j.id}
                  onClick={() =>
                    j.isDefault
                      ? navigate("/travel-guide", { state: { destination: "Boracay Islands" } })
                      : navigate(`/journal/view/${j.id}`)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <img src={j.coverImage} alt={j.title} />
                  <p>{j.title}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}