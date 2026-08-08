import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../../App.css";

export default function TravelTipsPage() {
  const location = useLocation();
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
          <a href="/dashboard">Home</a>
          <a href="/travel-tips">Guides</a>
          <a href="/hotels">Hotels</a>
          <span className="ww-menu-dropdown">Menu </span>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
          <span>👤</span>
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
          {filteredDestinations.map((dest) => (
            <div className="ww-tips-card" key={dest.name}>
              <img src={dest.img} alt={dest.name} />
              <h3>{dest.name}</h3>
              <button className="ww-itinerary-btn">See Itineraries</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}