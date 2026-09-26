import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function TravelTipsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { journalEntries } = useAppData();
  const { t } = useLanguage();
  const [search, setSearch] = useState(location.state?.search || "");

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
  const getDisplayTitle = (title) => {
    const bare = title.replace(/ Travel \w+$/i, "").trim();
    return `${bare} ${t("travelStorySuffix")}`;
  };

  // Case-insensitive match: does a journal post's title mention this
  // destination's name? (e.g. "El Nido, Palawan Travel Story" matches
  // the "El Nido, Palawan" destination card.)
  const matchesDestination = (journalTitle, destName) => {
    const place = destName.split(",")[0].trim().toLowerCase();
    return journalTitle.toLowerCase().includes(place);
  };

  const findMatchingJournal = (destName) =>
    journalEntries.find((j) => matchesDestination(j.title, destName));

  // Journal posts about places NOT already in the static destinations
  // list still get their own cards.
  const unmatchedJournalEntries = journalEntries
    .filter((j) => !destinations.some((d) => matchesDestination(j.title, d.name)))
    .filter((j) => j.title.toLowerCase().includes(search.toLowerCase()));

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
          {unmatchedJournalEntries.map((j) => (
            <div
              className="ww-tips-card"
              key={`journal-${j.id}`}
              onClick={() => navigate(`/journal/view/${j.id}`)}
              style={{ cursor: "pointer" }}
            >
              <img src={j.coverImage} alt={j.title} />
              <h3>{getDisplayTitle(j.title)}</h3>
              <button
                className="ww-itinerary-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/journal/view/${j.id}`);
                }}
              >
                {t("seeItineraries")}
              </button>
            </div>
          ))}

          {filteredDestinations.map((dest) => {
            const matchedJournal = findMatchingJournal(dest.name);
            // Boracay always has its own built-in guide; any other
            // destination becomes enabled once you've posted a
            // matching journal entry for it.
            const hasGuide = dest.name === "Boracay, Aklan" || !!matchedJournal;

            const goToGuide = () => {
              if (!hasGuide) return;
              if (matchedJournal) {
                navigate(`/journal/view/${matchedJournal.id}`);
              } else {
                navigate("/travel-guide", { state: { destination: dest.name } });
              }
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