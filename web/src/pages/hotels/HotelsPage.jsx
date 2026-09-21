import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

// Google Maps can't carry check-in/check-out dates in the URL, so this
// just opens a live map search for "hotels in <destination>" — real
// results straight from Google, not stored/fake data.
function buildGoogleMapsHotelUrl(destination) {
  const query = `hotels in ${destination}`;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

export default function HotelsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState(location.state?.search || "");
  const [buddies, setBuddies] = useState(location.state?.buddies || 0);
  const [startDate, setStartDate] = useState(location.state?.startDate || "");
  const [endDate, setEndDate] = useState(location.state?.endDate || "");

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

  const openGoogleMaps = (destinationName) => {
    if (!startDate || !endDate) {
      alert("Please select your start and end dates first.");
      return;
    }
    window.open(buildGoogleMapsHotelUrl(destinationName), "_blank", "noopener,noreferrer");
  };

  const handleSelectDestination = (dest) => openGoogleMaps(dest.name);

  const handleSearch = () => {
    if (!search.trim()) {
      alert("Please tell us where you want to go.");
      return;
    }
    openGoogleMaps(search.trim());
  };

  // If we arrived here with a search already filled in (e.g. from the
  // Dashboard's search bar) and dates were also provided, run the
  // search automatically instead of making the person click again.
  useEffect(() => {
    if (location.state?.search && location.state?.startDate && location.state?.endDate) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ww-hotels-page">
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
      </main>

      <section className="ww-hotels-destinations">
        <h2 className="ww-hotels-section-title">
          Discover Hotels at Top Destinations!
        </h2>

        <div className="ww-hotels-grid">
          {destinations.map((dest) => (
            <div
              className="ww-hotel-card"
              key={dest.name}
              onClick={() => handleSelectDestination(dest)}
              style={{ cursor: "pointer" }}
            >
              <img src={dest.img} alt={dest.name} />
              <div className="ww-hotel-caption">
                <h3>{dest.name}</h3>
                <p>Hotels</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}