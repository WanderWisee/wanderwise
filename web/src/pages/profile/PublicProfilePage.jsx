import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

// Same destination-photo lookup used in ProfilePage.jsx — goes through our
// own backend (/api/destination-image) instead of calling Wikipedia
// directly from the browser, and caches per destination so we don't
// re-fetch the same photo over and over.
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

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Same "strip trailing Travel <word>, then reappend Travel Story" trick
  // used in Profile/Guides, so journal titles look consistent everywhere.
  const getDisplayTitle = (title) => {
    const bare = title.replace(/ Travel \w+$/i, "").trim();
    return `${bare} ${t("travelStorySuffix")}`;
  };

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("trips");
  const [shareCopied, setShareCopied] = useState(false);
  const [tripImages, setTripImages] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setNotFound(false);
    fetch(`/api/users/${userId}/public`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => {
        if (resp.status === 404) {
          setNotFound(true);
          return null;
        }
        return resp.ok ? resp.json() : null;
      })
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId, navigate]);

  useEffect(() => {
    if (!profile?.trips) return;
    const uniqueDestinations = [
      ...new Set(profile.trips.map((t) => t.destination).filter(Boolean)),
    ];
    uniqueDestinations.forEach((dest) => {
      fetchDestinationImage(dest).then((url) => {
        if (url) setTripImages((prev) => ({ ...prev, [dest]: url }));
      });
    });
  }, [profile]);

  const handleShare = async () => {
    const link = `${window.location.origin}/profile/view/${userId}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      alert(`${t("copyThisLinkToShare")}\n${link}`);
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
          <Link to="/dashboard">{t("navHome")}</Link>
          <Link to="/travel-tips">{t("navGuides")}</Link>
          <Link to="/hotels">{t("navHotels")}</Link>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      {loading ? (
        <p className="ww-profile-empty-text" style={{ textAlign: "center", marginTop: 40 }}>
          {t("loadingProfile")}
        </p>
      ) : notFound || !profile ? (
        <p className="ww-profile-empty-text" style={{ textAlign: "center", marginTop: 40 }}>
          {t("studentNotFound")}
        </p>
      ) : (
        <>
          <div className="ww-profile-cover" />

          <div className="ww-profile-info">
            <div
              className="ww-profile-avatar"
              style={
                profile.avatarUrl
                  ? { backgroundImage: `url(${profile.avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : undefined
              }
            />
            <h1 className="ww-profile-username">
              {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || t("unnamedStudent")}
            </h1>
            <p className="ww-profile-bio">{profile.bio || t("noBioYet")}</p>
            <p className="ww-profile-location">{profile.location || t("locationNotSet")}</p>

            <div className="ww-profile-stats">
              <div>
                <strong>{profile.tripsCount}</strong>
                <span>{t("trips")}</span>
              </div>
              <div>
                <strong>{profile.journalPostsCount}</strong>
                <span>{t("journalPosts")}</span>
              </div>
              <div>
                <strong>{profile.placesVisitedCount}</strong>
                <span>{t("placesVisited")}</span>
              </div>
            </div>

            <div className="ww-profile-actions">
              <button className="ww-profile-share-btn" onClick={handleShare}>
                {shareCopied ? t("linkCopied") : t("share")}
              </button>
            </div>
          </div>

          <div className="ww-profile-tabs">
            <span
              className={`ww-profile-tab ${activeTab === "trips" ? "active" : ""}`}
              onClick={() => setActiveTab("trips")}
            >
              🧳 {t("trips")}
            </span>
            <span
              className={`ww-profile-tab ${activeTab === "journal" ? "active" : ""}`}
              onClick={() => setActiveTab("journal")}
            >
              📔 {t("journal")}
            </span>
          </div>

          <main className="ww-profile-main">
            {activeTab === "trips" ? (
              <>
                <div className="ww-profile-section-header">
                  <h2>{t("theirTravels")}</h2>
                </div>
                {profile.trips.length === 0 ? (
                  <p className="ww-profile-empty-text">{t("noTripsYet")}</p>
                ) : (
                  <div className="ww-profile-grid">
                    {profile.trips.map((t3) => {
                      const imgUrl = tripImages[t3.destination];
                      return (
                        <div className="ww-profile-card" key={t3.id} style={{ cursor: "default" }}>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={t3.destination}
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
                          <p>{t3.destination || t3.title || t("untitledTrip")}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="ww-profile-section-header">
                  <h2>{t("theirTravelStories")}</h2>
                </div>
                {profile.journalEntries.length === 0 ? (
                  <p className="ww-profile-empty-text">{t("noJournalPostsYet")}</p>
                ) : (
                  <div className="ww-profile-grid">
                    {profile.journalEntries.map((j) => (
                      <div
                        className="ww-profile-card"
                        key={j.id}
                        onClick={() => navigate(`/journal/view/${j.id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <img
                          src={j.coverImage}
                          alt={getDisplayTitle(j.title)}
                          style={{
                            width: "100%",
                            height: 140,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <p>{getDisplayTitle(j.title)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}