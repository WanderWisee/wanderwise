import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

// Destinations we have our own curated guide + results page for.
// Anything else typed into the search bar shows the Agoda/Klook links.
const DESTINATIONS_WITH_GUIDE = ["boracay"];

// NOTE: verify these URL patterns against a real manual search on
// agoda.com / klook.com — their query params can change over time.
function buildAgodaSearchUrl(query, startDate, endDate) {
  const params = new URLSearchParams({
    text: query,
    checkIn: startDate,
    checkOut: endDate,
  });
  return `https://www.agoda.com/search?${params.toString()}`;
}

function buildKlookSearchUrl(query) {
  const params = new URLSearchParams({ query });
  return `https://www.klook.com/search/result/?${params.toString()}`;
}

export default function HotelsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [buddies, setBuddies] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Set when the searched place has no guide of our own — shows a
  // small panel with real <a> links to Agoda/Klook instead of trying
  // to window.open() both (which popup blockers only allow one of).
  const [externalSearch, setExternalSearch] = useState(null);

  const destinations = [
  { name: "San Juan, La Union", img: "/assets/la-union.webp" },
  { name: "Boracay, Aklan", img: "/assets/boracay.jpg" },
  { name: "El Nido, Palawan", img: "/assets/el-nido.jpg" },
  { name: "Baguio City", img: "/assets/baguio.jpg" },
  { name: "Siargao Island", img: "/assets/siargao.png" },
  { name: "Cebu City", img: "/assets/cebu.webp" },
  { name: "Coron, Palawan", img: "/assets/coron.webp" },
  { name: "Vigan, Ilocos Sur", img: "/assets/vigan.jpg" },
  { name: "Tagaytay, Cavite", img: "/assets/tagaytay.jpg" },
];

  const handleSelectDestination = (dest) => {
    const hasGuide = dest.name === "Boracay, Aklan";
    if (!hasGuide) return;

    if (!startDate || !endDate) {
      alert("Please select your start and end dates first.");
      return;
    }

    setExternalSearch(null);
    navigate("/hotels/results", {
      state: { destination: dest.name, startDate, endDate, buddies },
    });
  };

  const handleSearch = () => {
    if (!startDate || !endDate) {
      alert("Please select your start and end dates first.");
      return;
    }
    if (!search.trim()) {
      alert("Please tell us where you want to go.");
      return;
    }

    const query = search.trim();
    const hasOwnGuide = DESTINATIONS_WITH_GUIDE.some((d) =>
      query.toLowerCase().includes(d)
    );

    if (hasOwnGuide) {
      setExternalSearch(null);
      navigate("/hotels/results", {
        state: { destination: "Boracay, Aklan", startDate, endDate, buddies },
      });
      return;
    }

    // No guide of our own — show the Agoda/Klook link panel instead
    // of trying to open both in new tabs at once.
    setExternalSearch({ query, startDate, endDate });
  };

  return (
    <div className="ww-hotels-page">
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

      <main className="ww-hotels-hero">
        <h1 className="ww-hotels-title">All your stays in one place!</h1>
        <p className="ww-hotels-subtitle">
          A smarter way to find the perfect accommodation—built around your
          preferences.
        </p>

        <div className="ww-hotels-search-bar">
          <div className="ww-hotels-search-input">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Discover where to go"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ww-dates-row">
            <div className="ww-date-field">
              <label className="ww-planning-label">Start Date</label>
              <input
                type="date"
                className="ww-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="ww-date-field">
              <label className="ww-planning-label">End Date</label>
              <input
                type="date"
                className="ww-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="ww-buddies-counter">
            <span>Travel Buddies</span>
            <div className="ww-counter-controls">
              <button onClick={() => setBuddies(Math.max(0, buddies - 1))}>
                -
              </button>
              <span>{buddies}</span>
              <button onClick={() => setBuddies(buddies + 1)}>+</button>
            </div>
          </div>
          <button className="ww-search-btn" onClick={handleSearch}>
            Search
          </button>
        </div>

        {externalSearch && (
          <div className="ww-external-recommend-panel">
            <p>
              We don't have a guide for "{externalSearch.query}" yet — check
              these instead:
            </p>
            <div className="ww-external-search-row">
              <a
                className="ww-external-search-btn"
                href={buildAgodaSearchUrl(
                  externalSearch.query,
                  externalSearch.startDate,
                  externalSearch.endDate
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Search on Agoda
              </a>
              <a
                className="ww-external-search-btn"
                href={buildKlookSearchUrl(externalSearch.query)}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Search on Klook
              </a>
            </div>
          </div>
        )}
      </main>

      <section className="ww-hotels-destinations">
        <h2 className="ww-hotels-section-title">
          Discover Hotels at Top Destinations!
        </h2>

        <div className="ww-hotels-grid">
          {destinations.map((dest) => {
            // Only Boracay has real results content for now.
            const hasGuide = dest.name === "Boracay, Aklan";
            return (
              <div
                className="ww-hotel-card"
                key={dest.name}
                onClick={() => handleSelectDestination(dest)}
                style={{
                  opacity: hasGuide ? 1 : 0.5,
                  cursor: hasGuide ? "pointer" : "not-allowed",
                }}
              >
                <img src={dest.img} alt={dest.name} />
                <div className="ww-hotel-caption">
                  <h3>{dest.name}</h3>
                  <p>Hotels</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}