import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../App.css";

export default function InviteCrewPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    destination = "",
    startDate = "",
    endDate = "",
    people = 0,
    tripState = null,
    returnPath = "/trip-plan",
  } = location.state || {};

  const [inviteInput, setInviteInput] = useState("");
  const shareLink = "https://wanderwise.com/plan/wdfse2326";

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareLink);
  };

  const handleBack = () => {
    navigate(returnPath, {
      state: { destination, startDate, endDate, people, restoredTripState: tripState },
    });
  };

  return (
    <div className="ww-invite-page">
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

      <main className="ww-invite-main">
        <h1 className="ww-invite-title" onClick={handleBack} style={{ cursor: "pointer" }}>
          ← Invite your crew
        </h1>

        <div className="ww-invite-link-row">
          <span>🔗 {shareLink}</span>
          <button className="ww-copy-btn" onClick={handleCopy}>Copy</button>
        </div>

        <input
          className="ww-invite-user-input"
          placeholder="👤 Invite user"
          value={inviteInput}
          onChange={(e) => setInviteInput(e.target.value)}
        />

        <button className="ww-send-invite-btn">Send</button>
      </main>
    </div>
  );
}