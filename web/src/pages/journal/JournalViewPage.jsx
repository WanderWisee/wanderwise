import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import PlaceMap from "../../components/PlaceMap";
import { useAppData } from "../../context/AppDataContext";
import "../../App.css";

export default function JournalViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { journalEntries } = useAppData();

  const journal = journalEntries.find((j) => String(j.id) === id);

  return (
    <div className="ww-guide-page">
      <header className="ww-navbar ww-navbar-compact">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/travel-tips">Guides</Link>
          <Link to="/hotels">Hotels</Link>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-guide-main">
        {!journal ? (
          <p className="ww-expense-empty">Journal entry not found.</p>
        ) : (
          <>
            <h1 className="ww-guide-title">{journal.title}</h1>

            {journal.entries.length === 0 ? (
              <p className="ww-expense-empty">No places were added to this story.</p>
            ) : (
              journal.entries.map((entry) => (
                <section className="ww-guide-section" key={entry.id}>
                  <div className="ww-guide-intro">
                    <div className="ww-guide-text">
                      <p className="ww-guide-pin">
                        📍{entry.place || "Unnamed place"}{" "}
                        {"★".repeat(entry.rating)}
                        {"☆".repeat(5 - entry.rating)}
                      </p>
                      {entry.description && (
                        <p className="ww-guide-description">{entry.description}</p>
                      )}

                      {entry.pros?.length > 0 && (
                        <>
                          <p className="ww-guide-list-title">
                            Pros of Visiting {entry.place || "this place"}:
                          </p>
                          <ul className="ww-guide-list">
                            {entry.pros.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {entry.cons?.length > 0 && (
                        <>
                          <p className="ww-guide-list-title">
                            Cons of Visiting {entry.place || "this place"}:
                          </p>
                          <ul className="ww-guide-list">
                            {entry.cons.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                    <img
                      src={entry.img}
                      alt={entry.place || "place"}
                      className="ww-guide-image"
                    />
                  </div>

                  {entry.hotels?.length > 0 && (
                    <>
                      <h3 className="ww-guide-hotel-heading">Hotel Option</h3>
                      <div className="ww-guide-hotels-grid">
                        {entry.hotels.map((h) => (
                          <div className="ww-guide-hotel-card" key={h.id}>
                            <p className="ww-guide-hotel-name">🏨 {h.name}</p>
                            {h.description && (
                              <p className="ww-guide-hotel-desc">{h.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {entry.place && entry.place.trim() && (
                    <>
                      <h3 className="ww-guide-location-heading">Location</h3>
                      <div className="ww-guide-map">
                        <PlaceMap placeName={entry.place} height={220} />
                      </div>
                    </>
                  )}
                </section>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}