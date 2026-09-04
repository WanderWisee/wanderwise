import React from "react";
import "../../App.css";

export default function DirectionsPage() {
  return (
    <div className="ww-directions-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
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

      <main className="ww-directions-main">
        <h1 className="ww-directions-title">Directions</h1>
        <div className="ww-directions-map">
          {/* TODO: replace with live Google Maps Directions embed once
              @react-google-maps/api DirectionsService is wired up */}
          <img src="/assets/directions-sample.jpg" alt="Directions map" />
        </div>
      </main>
    </div>
  );
}