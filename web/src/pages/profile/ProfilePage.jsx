import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import "../../App.css";

// Wikipedia's free REST API (no key needed) is used to grab a real photo
// for a destination by name. If nothing is found, we fall back to a plain
// placeholder card instead of a broken image. Cached module-level so we
// don't re-fetch the same destination's photo over and over.
const destinationImageCache = {};

// Wikipedia's summary endpoint hands back a small thumbnail by default
// (usually ~320px wide) — fine for a search result, but blurry/low-quality
// when stretched to fill a profile card. Thumbnail URLs encode their width
// right in the path (".../320px-File.jpg"), so bumping that number up gets
// a noticeably sharper image from the same file without needing the full
// (often multi-MB) original.
function upscaleWikiThumbnail(url, targetWidth = 800) {
  if (!url) return url;
  if (/\/\d+px-/.test(url)) {
    return url.replace(/\/\d+px-/, `/${targetWidth}px-`);
  }
  return url;
}

async function fetchDestinationImage(destination) {
  if (!destination) return null;
  if (destinationImageCache[destination] !== undefined) {
    return destinationImageCache[destination];
  }
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(destination)}`
    );
    if (!res.ok) {
      destinationImageCache[destination] = null;
      return null;
    }
    const data = await res.json();
    const rawUrl =
      (data && data.thumbnail && data.thumbnail.source) ||
      (data && data.originalimage && data.originalimage.source) ||
      null;
    const url = rawUrl ? upscaleWikiThumbnail(rawUrl) : null;
    destinationImageCache[destination] = url;
    return url;
  } catch {
    destinationImageCache[destination] = null;
    return null;
  }
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { journalEntries, profileName, profileAvatar } = useAppData();

  const [activeTab, setActiveTab] = useState("trips");

  const [trips, setTrips] = useState([]);
  const [tripImages, setTripImages] = useState({});
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token) {
      setLoadingTrips(false);
      return;
    }
    fetch("/api/trips", { headers: { Authorization: `Bearer ${token}` } })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoadingTrips(false));
  }, []);

  useEffect(() => {
    const uniqueDestinations = [...new Set(trips.map((t) => t.destination).filter(Boolean))];
    uniqueDestinations.forEach((dest) => {
      fetchDestinationImage(dest).then((url) => {
        if (url) setTripImages((prev) => ({ ...prev, [dest]: url }));
      });
    });
  }, [trips]);

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this trip? This can't be undone.")) return;
    const token = localStorage.getItem("wanderwise_token");
    try {
      const resp = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
      }
    } catch (err) {
      console.warn("Failed to delete trip:", err);
    }
  };

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
            {loadingTrips ? (
              <p className="ww-profile-empty-text">Loading your trips...</p>
            ) : trips.length === 0 ? (
              <p className="ww-profile-empty-text">
                No trips yet — plan one to see it here.
              </p>
            ) : (
              <div className="ww-profile-grid">
                {trips.map((t) => {
                  const imgUrl = tripImages[t.destination];
                  return (
                    <div
                      className="ww-profile-card"
                      key={t.id}
                      onClick={() => navigate(`/trip-plan?tripId=${t.id}`)}
                      style={{ cursor: "pointer", position: "relative" }}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={t.destination}
                          style={{
                            width: "100%",
                            height: 140,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: 140,
                            background: "linear-gradient(135deg, #cfe8e5, #9fd0cb)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 32,
                          }}
                        >
                          📍
                        </div>
                      )}
                      <p>{t.destination || t.title || "Untitled trip"}</p>
                      <span
                        onClick={(e) => handleDeleteTrip(e, t.id)}
                        title="Delete this trip"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        🗑
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
                  <img
                    src={j.coverImage}
                    alt={j.title}
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
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