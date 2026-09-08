import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

const results = [
  { name: "Hidden Palms Inn/Resort", price: 2900, total: 11600, amenities: "Free Wi-Fi - Free Breakfast - Free Parking - Outdoor Pool - Air Conditioning", image: "/assets/hidden-palms.jpg" },
  { name: "Casa Benito", price: 3100, total: 12400, amenities: "Free Wi-Fi - Free Breakfast - Free Parking - Outdoor Pool - Air Conditioning", image: "/assets/casa-benito.jpg" },
  { name: "Puerto de San Juan Beach Resort", price: 3800, total: 15200, amenities: "Free Wi-Fi - Free Breakfast - Free Parking - Outdoor Pool - Air Conditioning", image: "/assets/puerto-de-san-juan.jpg" },
];

export default function HotelSearchResultsPage() {
  const navigate = useNavigate();
  const [buddies, setBuddies] = useState(2);
  const [minPrice, setMinPrice] = useState(1500);
  const [maxPrice, setMaxPrice] = useState(3000);

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

      <main className="ww-results-main">
        <div className="ww-results-top">
          <h1 className="ww-results-title">La Union Province</h1>
          <div className="ww-results-controls">
            <div className="ww-buddies-counter">
              <span>Travel Buddies</span>
              <div className="ww-counter-controls">
                <button onClick={() => setBuddies(Math.max(0, buddies - 1))}>-</button>
                <span>{buddies}</span>
                <button onClick={() => setBuddies(buddies + 1)}>+</button>
              </div>
            </div>
            <button className="ww-date-btn">📅 4/17 - 4/19</button>
          </div>
        </div>

        <div className="ww-results-map">
          <img src="/assets/la-union-map.jpg" alt="La Union map" />
        </div>

        <div className="ww-filters-row">
          <div className="ww-price-range">
            <span className="ww-price-label">Price Range</span>
            <div className="ww-price-inputs">
              <div>
                <label>Minimum</label>
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </div>
              <div>
                <label>Maximum</label>
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>
          </div>
          <button className="ww-filter-pill">🏨 Property Type</button>
          <button className="ww-filter-pill">⭐ Hotel Class</button>
        </div>

        <div className="ww-results-sort">
          <span>Results</span>
          <span className="ww-sort-divider">|</span>
          <span>Sort by: Lowest price ▾</span>
        </div>

        <div className="ww-results-list">
          {results.map((hotel) => (
            <div className="ww-result-card" key={hotel.name}>
              <img src={hotel.image} alt={hotel.name} className="ww-result-image" />
              <div className="ww-result-info">
                <h3>{hotel.name}</h3>
                <p>{hotel.amenities}</p>
              </div>
              <div className="ww-result-price">
                <p className="ww-result-price-main">₱{hotel.price.toLocaleString()}</p>
                <p className="ww-result-price-total">Total ₱{hotel.total.toLocaleString()}</p>
                <button className="ww-view-deal-btn">View Deal ▾</button>
              </div>
            </div>
          ))}
        </div>

        <div className="ww-pagination">
          <button>‹</button>
          <span className="ww-page-active">1</span>
          <button>›</button>
        </div>
      </main>
    </div>
  );
}