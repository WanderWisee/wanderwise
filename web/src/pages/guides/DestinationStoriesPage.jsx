import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import JournalAvatar from "../../components/JournalAvatar";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import "../../App.css";

// The server sends UTC times without the "Z" — add it so the browser
// converts them to local (Philippine) time.
function toLocalDate(value) {
  const s = String(value);
  return new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
}

// Guides → "See Itineraries": every student's journal about one place,
// shown like a Facebook feed — small profile picture and name on top,
// then the story. Tapping the name/picture opens that student's profile
// (all their journals); tapping the story opens the journal itself.
export default function DestinationStoriesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { formatDate } = usePreferences();

  const params = new URLSearchParams(location.search);
  const place = params.get("place") || "";
  const heading = params.get("title") || place;
  const hasBuiltInGuide = place.toLowerCase() === "boracay";

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token || !place) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/journal/feed?q=${encodeURIComponent(place)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => setStories(Array.isArray(data) ? data : []))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [place]);

  const fullName = (a) => [a?.firstName, a?.lastName].filter(Boolean).join(" ") || t("student");
  const openProfile = (author) => navigate(`/profile/view/${author.id}`);

  return (
    <div className="ww-planning-page">
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

      <main className="ww-stories-main">
        <p className="ww-stories-back" onClick={() => navigate("/travel-tips")}>
          ← {t("backToGuides")}
        </p>
        <h1 className="ww-stories-title">
          {heading} {t("travelStorySuffix")}
        </h1>
        <p className="ww-stories-subtitle">{t("storiesSubtitle")}</p>

        {hasBuiltInGuide && (
          <div
            className="ww-story-card ww-story-guide"
            onClick={() => navigate("/travel-guide", { state: { destination: "Boracay, Aklan" } })}
          >
            <span className="ww-story-guide-icon">📘</span>
            <div>
              <p className="ww-story-name">{t("officialGuide")}</p>
              <p className="ww-story-meta">{t("officialGuideHint")}</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
        ) : stories.length === 0 ? (
          <p className="ww-expense-empty">{t("storiesEmpty")}</p>
        ) : (
          stories.map((s) => (
            <article className="ww-story-card" key={s.id}>
              {/* Author row — like a Facebook post header */}
              <div className="ww-story-header">
                <JournalAvatar author={s.author} size={40} onClick={() => openProfile(s.author)} />
                <div>
                  <p className="ww-story-name" onClick={() => openProfile(s.author)}>
                    {fullName(s.author)}
                  </p>
                  <p className="ww-story-meta">{formatDate(toLocalDate(s.createdAt))}</p>
                </div>
              </div>

              <div className="ww-story-body" onClick={() => navigate(`/journal/view/${s.id}`)}>
                <h3 className="ww-story-title">{s.title}</h3>
                {s.coverImage && <img className="ww-story-cover" src={s.coverImage} alt={s.title || ""} />}
                <p className="ww-story-meta">
                  📍 {s.placesCount} {t("storyPlacesCount")} · 💬 {s.commentsCount} {t("storyCommentsCount")}
                </p>
              </div>

              <div className="ww-story-actions">
                <button type="button" className="ww-itinerary-btn" onClick={() => navigate(`/journal/view/${s.id}`)}>
                  {t("readStory")}
                </button>
                <button type="button" className="ww-booking-cancel" onClick={() => openProfile(s.author)}>
                  👤 {t("viewProfile")}
                </button>
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}