import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import JournalAvatar from "../../components/JournalAvatar";
import { useAppData } from "../../context/AppDataContext";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function TravelTipsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { journalEntries } = useAppData();
  const { t } = useLanguage();
  const [search, setSearch] = useState(location.state?.search || "");

  // Every student's journal posts (not just yours), so Guides works like a
  // shared feed. Falls back to your own posts if the server can't be reached.
  const [feed, setFeed] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token) return;
    fetch("/api/journal/feed?limit=200", { headers: { Authorization: `Bearer ${token}` } })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => setFeed(Array.isArray(data) ? data : null))
      .catch(() => setFeed(null));
  }, []);
  const allJournals = (feed || journalEntries).filter((j) => j.title);

  useEffect(() => {
    setSearch(location.state?.search || "");
  }, [location.state]);

  const destinations = [
    { name: "Boracay, Aklan", img: "/assets/boracay.jpg" },
    { name: "El Nido, Palawan", img: "/assets/el-nido.jpg" },
    { name: "Baguio City", img: "/assets/baguio.jpg" },
    { name: "Siargao Island", img: "/assets/siargao.png" },
    { name: "Chocolate Hills, Bohol", img: "/assets/bohol.jpg" },
    { name: "Vigan, Ilocos Sur", img: "/assets/vigan.jpg" },
    { name: "Coron, Palawan", img: "/assets/coron.webp" },
    { name: "Sagada, Mountain Province", img: "/assets/sagada.jpg" },
  ];

  const filteredDestinations = destinations.filter((dest) =>
    dest.name.toLowerCase().includes(search.toLowerCase())
  );

  // The title stored on a journal entry might just be the bare place
  // ("El Nido, Palawan") or already have any "Travel <word>" suffix on
  // it. Either way, Guides should always show a consistent
  // "<Place> Travel Story" heading — strip whatever single word follows
  // "Travel" at the end (if any), then add "Travel Story" back.
  const bareTitle = (title) => title.replace(/ Travel \w+$/i, "").trim();
  const getDisplayTitle = (title) => `${bareTitle(title)} ${t("travelStorySuffix")}`;

  // The word to look for in journal titles: "Baguio City" → "Baguio",
  // "Siargao Island" → "Siargao", "El Nido, Palawan" → "El Nido".
  const keywordFor = (destName) =>
    destName.split(",")[0].replace(/\b(city|islands?)\b/gi, "").trim();

  // Opens the list of every student's story about this place.
  const openStories = (place, title) =>
    navigate(`/travel-tips/stories?place=${encodeURIComponent(place)}&title=${encodeURIComponent(title)}`);

  // Up to 3 small profile pictures of the people who wrote about a place.
  const authorsOf = (journals) => {
    const seen = new Set();
    return journals
      .map((j) => j.author)
      .filter((a) => a && !seen.has(a.id) && seen.add(a.id));
  };
  const renderAuthors = (journals) => {
    const authors = authorsOf(journals);
    if (authors.length === 0) return null;
    return (
      <div className="ww-tips-authors">
        <span className="ww-tips-avatars">
          {authors.slice(0, 3).map((a) => (
            <JournalAvatar key={a.id} author={a} size={26} />
          ))}
        </span>
        <span className="ww-tips-authors-text">
          {journals.length} {t("storiesCountSuffix")}
        </span>
      </div>
    );
  };

  // Case-insensitive match: does a journal post's title mention this
  // destination's name? (e.g. "El Nido, Palawan Travel Story" matches
  // the "El Nido, Palawan" destination card.)
  const matchesDestination = (journalTitle, destName) =>
    journalTitle.toLowerCase().includes(keywordFor(destName).toLowerCase());

  const journalsFor = (destName) => allJournals.filter((j) => matchesDestination(j.title, destName));

  // Journal posts about places NOT already in the static destinations
  // list still get their own cards — one card per place, even if several
  // students wrote about it.
  const unmatchedGroups = Object.values(
    allJournals
      .filter((j) => !destinations.some((d) => matchesDestination(j.title, d.name)))
      .filter((j) => j.title.toLowerCase().includes(search.toLowerCase()))
      .reduce((groups, j) => {
        const key = bareTitle(j.title).toLowerCase();
        (groups[key] = groups[key] || []).push(j);
        return groups;
      }, {})
  );

  return (
    <div className="ww-planning-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img
            src="/assets/logo.jpg"
            alt="WanderWise logo"
            className="ww-logo"
          />
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

      <main className="ww-tips-main">
        <h1 className="ww-tips-title">{t("discoverTravelTips")}</h1>

        <div className="ww-search-wrapper">
          <input
            type="text"
            className="ww-tips-search"
            placeholder={`🔍  ${t("discoverWhereToGo")}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <h2 className="ww-tips-subtitle">{t("newTravelTips")}</h2>

        <div className="ww-tips-grid">
          {unmatchedGroups.map((group) => {
            const j = group[0]; // newest post about this place
            const place = bareTitle(j.title);
            return (
              <div
                className="ww-tips-card"
                key={`journal-${j.id}`}
                onClick={() => openStories(place, place)}
                style={{ cursor: "pointer" }}
              >
                <img src={j.coverImage} alt={j.title} />
                <h3>{getDisplayTitle(j.title)}</h3>
                {renderAuthors(group)}
                <button
                  className="ww-itinerary-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openStories(place, place);
                  }}
                >
                  {t("seeItineraries")}
                </button>
              </div>
            );
          })}

          {filteredDestinations.map((dest) => {
            const matched = journalsFor(dest.name);
            // Boracay always has its own built-in guide; any other
            // destination becomes enabled once any student has posted a
            // journal about it.
            const hasGuide = dest.name === "Boracay, Aklan" || matched.length > 0;

            const goToGuide = () => {
              if (!hasGuide) return;
              openStories(keywordFor(dest.name), dest.name);
            };

            return (
              <div
                className="ww-tips-card"
                key={dest.name}
                onClick={hasGuide ? goToGuide : undefined}
                style={{ cursor: hasGuide ? "pointer" : "default" }}
              >
                <img src={dest.img} alt={dest.name} />
                <h3>{dest.name}</h3>
                {renderAuthors(matched)}
                <button
                  className="ww-itinerary-btn"
                  disabled={!hasGuide}
                  style={{
                    opacity: hasGuide ? 1 : 0.5,
                    cursor: hasGuide ? "pointer" : "not-allowed",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToGuide();
                  }}
                >
                  {t("seeItineraries")}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}