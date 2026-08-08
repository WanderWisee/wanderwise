import React, { useState } from "react";
import "../../App.css";

export default function HotelsPage() {
  const [search, setSearch] = useState("");
  const [buddies, setBuddies] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
          <span className="ww-menu-dropdown">Menu</span>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
          <span>👤</span>
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
          <button className="ww-search-btn">Search</button>
        </div>
      </main>

      <section className="ww-hotels-destinations">
        <h2 className="ww-hotels-section-title">
          Discover Hotels at Top Destinations!
        </h2>

        <div className="ww-hotels-grid">
          {destinations.map((dest) => (
            <div className="ww-hotel-card" key={dest.name}>
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