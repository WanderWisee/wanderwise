import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import "../../App.css";

export default function TravelTipsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { journalEntries } = useAppData();
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
          <Link to="/dashboard">Home</Link>
          <Link to="/travel-tips">Guides</Link>
          <Link to="/hotels">Hotels</Link>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-tips-main">
        <h1 className="ww-tips-title">Discover Travel Tips</h1>

        <div className="ww-search-wrapper">
          <input
            type="text"
            className="ww-tips-search"
            placeholder="🔍  Discover where to go"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <h2 className="ww-tips-subtitle">New Travel Tips</h2>

        <div className="ww-tips-grid">
          {unmatchedJournalEntries.map((j) => (
            <div className="ww-tips-card" key={`journal-${j.id}`}>
              <img src={j.coverImage} alt={j.title} />
              <h3>{j.title}</h3>
              <button
                className="ww-itinerary-btn"
                onClick={() => navigate(`/journal/view/${j.id}`)}
              >
                See Itineraries
              </button>
            </div>
          ))}

          {filteredDestinations.map((dest) => {
            const matchedJournal = findMatchingJournal(dest.name);
            // Boracay always has its own built-in guide; any other
            // destination becomes enabled once you've posted a
            // matching journal entry for it.
            const hasGuide = dest.name === "Boracay, Aklan" || !!matchedJournal;
            return (
              <div className="ww-tips-card" key={dest.name}>
                <img src={dest.img} alt={dest.name} />
                <h3>{dest.name}</h3>
                <button
                  className="ww-itinerary-btn"
                  disabled={!hasGuide}
                  style={{
                    opacity: hasGuide ? 1 : 0.5,
                    cursor: hasGuide ? "pointer" : "not-allowed",
                  }}
                  onClick={() => {
                    if (!hasGuide) return;
                    if (matchedJournal) {
                      navigate(`/journal/view/${matchedJournal.id}`);
                    } else {
                      navigate("/travel-guide", { state: { destination: dest.name } });
                    }
                  }}
                >
                  See Itineraries
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}