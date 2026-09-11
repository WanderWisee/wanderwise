import React from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

export default function DirectionsPage() {
  const navigate = useNavigate();

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
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
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