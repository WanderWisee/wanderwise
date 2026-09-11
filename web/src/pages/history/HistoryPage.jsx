import React from "react";
import { useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

export default function HistoryPage() {
  const navigate = useNavigate();

  // Empty by default — entries only appear once the user has
  // actually created a trip (TripPlanBuilderPage) or a journal post
  // (JournalNewPostPage). Wire this up to real saved data once
  // persistence exists; for now this stays an empty list.
  const historyItems = [];

  const handleOpen = (item) => {
    if (item.type === "Trip") {
      navigate("/trip-plan", { state: { restoredTripState: item.tripState } });
    } else {
      navigate("/journal/new", { state: { destination: item.title } });
    }
  };

  return (
    <div className="ww-history-page">
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

      <main className="ww-history-main">
        <h1 className="ww-history-title">Your Trip History</h1>

        <div className="ww-history-table">
          <div className="ww-history-header-row">
            <span className="ww-history-col-title">Title</span>
            <span className="ww-history-col-type">Type</span>
            <span className="ww-history-col-viewed">Last viewed</span>
            <span className="ww-history-col-author">Author</span>
          </div>

          {historyItems.length === 0 ? (
            <p className="ww-history-empty">
              No trip history yet. Start planning a trip or writing a journal entry!
            </p>
          ) : (
            historyItems.map((item) => (
              <div
                className="ww-history-row"
                key={item.id}
                onClick={() => handleOpen(item)}
              >
                <span className="ww-history-col-title">{item.title}</span>
                <span className="ww-history-col-type">{item.type}</span>
                <span className="ww-history-col-viewed">{item.lastViewed}</span>
                <span className="ww-history-col-author">👤 {item.author}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}