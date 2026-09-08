import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

export default function TripPlanningPage() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [people, setPeople] = useState(0);

  const navigate = useNavigate();

  const handleLetsGo = () => {
    // TEMPORARY: no backend call yet — just navigate with the trip info
    navigate("/trip-plan", {
      state: { destination, startDate, endDate, people },
    });
  };

  return (
    <div className="ww-planning-page">
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
          <span>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-planning-main">
        <h1 className="ww-planning-title">Begin your journey</h1>

        <div className="ww-planning-form">
          <label className="ww-planning-label">Destination?</label>
          <input
            type="text"
            className="ww-planning-input"
            placeholder="Thailand"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />

          <hr className="ww-planning-divider" />

          <label className="ww-planning-label">Dates</label>
          <div className="ww-dates-row">
            <input
              type="date"
              className="ww-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="ww-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <hr className="ww-planning-divider" />

          <label className="ww-planning-label ww-center-label">
            How many people?
          </label>
          <div className="ww-people-counter">
            <button onClick={() => setPeople(Math.max(0, people - 1))}>
              −
            </button>
            <span>{people}</span>
            <button onClick={() => setPeople(people + 1)}>+</button>
          </div>

          <button className="ww-lets-go-btn" onClick={handleLetsGo}>
            Let's go
          </button>
        </div>
      </main>
    </div>
  );
}