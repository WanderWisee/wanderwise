import React from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="wanderwise-home">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img
            src="/assets/logo.jpg"
            alt="WanderWise logo"
            className="ww-logo"
          />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav>
          <a href="#about" className="ww-nav-link">About Us</a>
        </nav>
      </header>

      <main className="ww-hero">
        <h1 className="ww-hero-title">
          Tourism Students, Welcome to your travel companion! ✈️
        </h1>
        <p className="ww-hero-subtitle">
          Plan smarter, explore further, and create trips you'll
          <br />
          never forget. Your next adventure starts here!
        </p>

        <hr className="ww-divider" />

        <div className="ww-actions">
          <button className="ww-login-btn" onClick={() => navigate("/login")}>Log in</button>
          <button className="ww-signup-btn" onClick={() => navigate("/register")}>Sign up</button>
        </div>
      </main>
    </div>
  );
}