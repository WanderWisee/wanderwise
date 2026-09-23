import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

export default function TripPlanningPage() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [people, setPeople] = useState(0);
  const [destinationOptions, setDestinationOptions] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/destinations")
      .then((resp) => resp.json())
      .then((data) => setDestinationOptions(Array.isArray(data) ? data : []))
      .catch(() => setDestinationOptions([]));
  }, []);

  const handleLetsGo = async () => {
    const trimmed = destination.trim();
    if (trimmed) {
      try {
        // If it's not in the list yet, this adds it — so the database
        // keeps growing with whatever people actually search for.
        await fetch("/api/destinations/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
      } catch (err) {
        // Non-blocking — still let the user continue planning even if
        // this couldn't be saved.
      }
    }

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
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
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
            placeholder="Where are you headed?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            list="destination-options"
          />
          <datalist id="destination-options">
            {destinationOptions.map((d) => (
              <option key={d.id} value={d.name} />
            ))}
          </datalist>

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