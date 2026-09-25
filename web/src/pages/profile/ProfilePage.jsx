import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import "../../App.css";

const destinationImageCache = {};

async function fetchDestinationImage(destination) {
  if (!destination) return null;
  if (destinationImageCache[destination] !== undefined) {
    return destinationImageCache[destination];
  }
  try {
    const res = await fetch(`/api/destination-image?name=${encodeURIComponent(destination)}`);
    if (!res.ok) {
      destinationImageCache[destination] = null;
      return null;
    }
    const data = await res.json();
    const url = data && data.found && data.url ? data.url : null;
    destinationImageCache[destination] = url;
    return url;
  } catch {
    destinationImageCache[destination] = null;
    return null;
  }
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    journalEntries,
    profileName,
    profileAvatar,
    profileUserId,
    profileBio,
    profileLocation,
  } = useAppData();

  const [activeTab, setActiveTab] = useState("trips");

  const [trips, setTrips] = useState([]);
  const [tripImages, setTripImages] = useState({});
  const [loadingTrips, setLoadingTrips] = useState(true);

  const [shareCopied, setShareCopied] = useState(false);

  // --- Student search: hidden by default. Clicking the 🔍 icon opens a
  // small floating search popover right under the icon (like Facebook's
  // search) — it does NOT touch or replace Home/Guides/Hotels/Menu. ---
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchBoxRef = useRef(null);
  const searchInputRef = useRef(null);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const token = localStorage.getItem("wanderwise_token");
      try {
        const resp = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = resp.ok ? await resp.json() : [];
        setSearchResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        closeSearch();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  const goToStudentProfile = (userId) => {
    closeSearch();
    navigate(`/profile/view/${userId}`);
  };

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

  const defaultJournalEntries = [
    {
      id: "default-boracay",
      title: "Boracay, Aklan",
      coverImage: "/assets/boracay.jpg",
      isDefault: true,
    },
  ];

  const displayPlaceName = (j) => j.title.replace(/ Travel \w+$/i, "");

  const placesVisitedCount = new Set(
    trips.map((t) => t.destination).filter(Boolean).map((d) => d.trim().toLowerCase())
  ).size;

  const handleShare = async () => {
    const link = `${window.location.origin}/profile/view/${profileUserId}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.alert(`Copy this link:\n${link}`);
    }
  };

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
          <div className="ww-navbar-search-anchor" ref={searchBoxRef}>
            <span onClick={openSearch} style={{ cursor: "pointer" }}>🔍</span>

            {searchOpen && (
              <div className="ww-navbar-search-popover">
                <div className="ww-navbar-search-inputrow">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="ww-navbar-search-input"
                    placeholder="Search for a student"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  />
                  <span className="ww-navbar-search-close" onClick={closeSearch}>✕</span>
                </div>
                {showDropdown && (
                  <div className="ww-navbar-search-dropdown">
                    {searching ? (
                      <p className="ww-navbar-search-empty">Searching...</p>
                    ) : searchResults.length === 0 ? (
                      <p className="ww-navbar-search-empty">No students found.</p>
                    ) : (
                      searchResults.map((r) => (
                        <div
                          key={r.id}
                          className="ww-navbar-search-result"
                          onClick={() => goToStudentProfile(r.id)}
                        >
                          <div
                            className="ww-navbar-search-result-avatar"
                            style={
                              r.avatarUrl
                                ? { backgroundImage: `url(${r.avatarUrl})` }
                                : undefined
                            }
                          />
                          <span>{r.firstName} {r.lastName}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
        <p className="ww-profile-bio">{profileBio || "No bio yet."}</p>
        <p className="ww-profile-location">{profileLocation || "Location not set"}</p>

        <div className="ww-profile-stats">
          <div>
            <strong>{trips.length}</strong>
            <span>trips</span>
          </div>
          <div>
            <strong>{journalEntries.length}</strong>
            <span>journal posts</span>
          </div>
          <div>
            <strong>{placesVisitedCount}</strong>
            <span>places visited</span>
          </div>
        </div>

        <div className="ww-profile-actions">
          <button className="ww-profile-edit-btn" onClick={() => navigate("/settings")}>
            Edit
          </button>
          <button className="ww-profile-share-btn" onClick={handleShare}>
            {shareCopied ? "Link copied!" : "Share"}
          </button>
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
                    alt={displayPlaceName(j)}
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <p>{displayPlaceName(j)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}