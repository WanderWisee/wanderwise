import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import "../App.css";

export default function DashboardPage() {
  const [buddies, setBuddies] = useState(0);
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  const mapCenter = { lat: 14.5995, lng: 120.9842 }; // Manila
  const mapContainerStyle = {
    width: "100%",
    height: "420px",
    borderRadius: "12px",
  };

  const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
  };

  const destinations = [
    { name: "Boracay Islands", img: "/assets/boracay.jpg" },
    { name: "El Nido, Palawan", img: "/assets/el-nido.jpg" },
    { name: "Baguio City", img: "/assets/baguio.jpg" },
  ];

  return (
    <div className="ww-dashboard">
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
          <a href="/home">Home</a>
          <a href="/guides">Guides</a>
          <a href="/hotels">Hotels</a>
          <a href="/menu">Menu</a>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
          <span>👤</span>
        </div>
      </header>

      <section className="ww-stories-card">
        <h2>Your Travel Stories</h2>
        <p>No trips yet. Start planning your next adventure!</p>
        <button className="ww-start-planning-btn" onClick={() => navigate('/trip-planning')}>
          + Start Planning
        </button>
      </section>

      <section className="ww-explore-section">
        <h2 className="ww-section-title">Start Exploring</h2>
        <div className="ww-map-card">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={11}
              options={mapOptions}
            >
              <Marker position={mapCenter} />
            </GoogleMap>
          ) : (
            <div className="ww-map-loading">Loading map...</div>
          )}
        </div>
      </section>

      <section className="ww-search-bar-section">
        <h2 className="ww-search-title">Discover your great places to stay!</h2>
        <div className="ww-search-bar">
          <div className="ww-search-input-group">
            <label>Search Places</label>
            <input type="text" placeholder="" />
          </div>
          <button className="ww-date-btn">📅 Start Date</button>
          <button className="ww-date-btn">📅 End Date</button>
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
      </section>

      <section className="ww-destinations-section">
        <h2 className="ww-section-title">Top Destinations</h2>
        <div className="ww-destinations-grid">
          {destinations.map((dest) => (
            <div className="ww-destination-card" key={dest.name}>
              <img src={dest.img} alt={dest.name} />
              <h3>{dest.name}</h3>
              <button className="ww-itinerary-btn">See Itineraries</button>
            </div>
          ))}
        </div>
      </section>

      <section className="ww-booking-section">
        <h2 className="ww-section-title">Book your trip on another booking site!</h2>
        <div className="ww-booking-grid">
          <a href="https://www.klook.com" className="ww-booking-card ww-klook">
            Klook
          </a>
          <a href="https://www.airbnb.com" className="ww-booking-card ww-airbnb">
            Airbnb
          </a>
          <a href="https://www.agoda.com" className="ww-booking-card ww-agoda">
            agoda
          </a>
        </div>
      </section>
    </div>
  );
}