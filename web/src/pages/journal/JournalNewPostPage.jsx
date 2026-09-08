import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

export default function JournalNewPostPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Defaults to a PH destination — pass a different one via
  // navigate("/journal/new", { state: { destination: "El Nido" } })
  const destination = location.state?.destination || "Boracay Islands";

  const [entries, setEntries] = useState([
    {
      id: 1,
      place: "Boracay White Beach",
      img: "/assets/boracay.jpg",
      rating: 5,
      tips: "",
      hotel: "",
    },
    { id: 2, place: "", img: "/assets/el-nido.jpg", rating: 4, tips: "", hotel: "" },
    { id: 3, place: "", img: "/assets/baguio.jpg", rating: 4, tips: "", hotel: "" },
  ]);

  const updateEntry = (id, field, value) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handlePost = () => {
    // TEMPORARY: no backend call yet.
    console.log({ destination, entries });
    navigate("/profile");
  };

  return (
    <div className="ww-journal-page">
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
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
            👤
          </span>
        </div>
      </header>

      <main className="ww-journal-main">
        <h1 className="ww-journal-title">{destination} Travel Story ✎</h1>

        <div className="ww-journal-upload-card">
          <h2>Upload a Photo!</h2>
          <button className="ww-journal-gallery-btn">🖼 From Gallery</button>
          <p className="ww-journal-upload-note">
            Note: Choose a clear and high-quality image that represents the tour destination.
          </p>
          <div className="ww-journal-file-row">
            <button className="ww-journal-choose-file-btn">📁 Choose File</button>
            <span>No file chosen</span>
          </div>
          <button className="ww-journal-upload-btn">Upload Photo</button>
        </div>

        <hr className="ww-journal-divider" />

        <h2 className="ww-journal-rate-title">Rate your experience!</h2>

        {entries.map((entry) => (
          <div className="ww-journal-entry" key={entry.id}>
            <img src={entry.img} alt={entry.place || "destination"} className="ww-journal-entry-img" />
            <div className="ww-journal-entry-fields">
              {entry.place ? (
                <p className="ww-journal-entry-place">📍{entry.place}</p>
              ) : (
                <input
                  className="ww-journal-place-input"
                  placeholder="📍 Add a place"
                  value={entry.place}
                  onChange={(e) => updateEntry(entry.id, "place", e.target.value)}
                />
              )}

              <div className="ww-journal-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    onClick={() => updateEntry(entry.id, "rating", n)}
                    style={{ cursor: "pointer" }}
                  >
                    {n <= entry.rating ? "★" : "☆"}
                  </span>
                ))}
              </div>

              <textarea
                className="ww-journal-tips-input"
                placeholder="Write your tips"
                value={entry.tips}
                onChange={(e) => updateEntry(entry.id, "tips", e.target.value)}
              />

              <input
                className="ww-journal-hotel-input"
                placeholder="🛏 Add hotel"
                value={entry.hotel}
                onChange={(e) => updateEntry(entry.id, "hotel", e.target.value)}
              />
            </div>
          </div>
        ))}

        <button className="ww-journal-post-btn" onClick={handlePost}>
          Post
        </button>
      </main>
    </div>
  );
}