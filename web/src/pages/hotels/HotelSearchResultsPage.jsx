import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

// NOTE: verify these URL patterns against a real manual search on
// agoda.com / klook.com — their query params can change over time.
function buildAgodaSearchUrl(query, startDate, endDate) {
  const params = new URLSearchParams({
    text: query,
    checkIn: startDate || "",
    checkOut: endDate || "",
  });
  return `https://www.agoda.com/search?${params.toString()}`;
}

function buildKlookSearchUrl(query) {
  const params = new URLSearchParams({ query });
  return `https://www.klook.com/search/result/?${params.toString()}`;
}

// Google Maps can't carry check-in/check-out dates in the URL, so this
// just opens a map search centered on "hotels in <destination>" —
// real, live results straight from Google, not stored/fake data.
function buildGoogleMapsHotelUrl(destination) {
  const query = `hotels in ${destination}`;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

export default function HotelSearchResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const destination = location.state?.destination || "";
  const startDate = location.state?.startDate || "";
  const endDate = location.state?.endDate || "";
  const initialBuddies = location.state?.buddies ?? 0;

  const [buddies, setBuddies] = useState(initialBuddies);

  const handleOpenGoogleMaps = () => {
    window.open(buildGoogleMapsHotelUrl(destination), "_blank", "noopener,noreferrer");
  };

  const handleSearchOnAgoda = () => {
    window.open(buildAgodaSearchUrl(destination, startDate, endDate), "_blank", "noopener,noreferrer");
  };

  const handleSearchOnKlook = () => {
    window.open(buildKlookSearchUrl(destination), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="ww-search-results-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <div>
            <span className="ww-brand-name">WanderWise!</span>
            <p className="ww-brand-subtitle">Hotels and Lodging</p>
          </div>
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

      <main className="ww-results-main">
        <div className="ww-results-top">
          <h1 className="ww-results-title">{destination}</h1>
          <div className="ww-results-controls">
            <div className="ww-buddies-counter">
              <span>Travel Buddies</span>
              <div className="ww-counter-controls">
                <button onClick={() => setBuddies(Math.max(0, buddies - 1))}>-</button>
                <span>{buddies}</span>
                <button onClick={() => setBuddies(buddies + 1)}>+</button>
              </div>
            </div>
            <button className="ww-date-btn">
              📅 {startDate && endDate ? `${startDate} - ${endDate}` : "Select dates"}
            </button>
          </div>
        </div>

        <div className="ww-maps-cta">
          <p>See real, live hotel availability and prices near {destination}:</p>
          <button className="ww-search-btn" onClick={handleOpenGoogleMaps}>
            🗺️ View Hotels on Google Maps
          </button>
        </div>

        <div className="ww-external-search-row">
          <span>Want more options?</span>
          <button className="ww-external-search-btn" onClick={handleSearchOnAgoda}>
            🔗 Search on Agoda
          </button>
          <button className="ww-external-search-btn" onClick={handleSearchOnKlook}>
            🔗 Search on Klook
          </button>
        </div>
      </main>
    </div>
  );
}