import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

export default function TripPlanningPage() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [people, setPeople] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLetsGo = async () => {
    const token = localStorage.getItem('wanderwise_token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const resp = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: destination || 'My Trip',
          destination,
          startDate,
          endDate,
          notes: `Travelers: ${people}`,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setMessage(data?.error || 'Could not save trip.');
        return;
      }
      setMessage('Trip saved successfully.');
      navigate('/dashboard');
    } catch (err) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <a href="/guides">Guides</a>
          <a href="/hotels">Hotels</a>
          <span className="ww-menu-dropdown">Menu ▾</span>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
          <span>👤</span>
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

          {message && <div style={{ color: '#8b0000', marginTop: 12 }}>{message}</div>}
          <button className="ww-lets-go-btn" onClick={handleLetsGo} disabled={loading}>
            {loading ? 'Saving...' : "Let's go"}
          </button>
        </div>
      </main>
    </div>
  );
}