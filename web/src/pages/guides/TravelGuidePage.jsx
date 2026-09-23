import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import PlaceMap from "../../components/PlaceMap";
import "../../App.css";

const guideSections = [
  {
    pinLabel: "White Beach",
    subtitle: "The Main Strip ★★★★★",
    description:
      "White Beach is Boracay's four-kilometer stretch of powder-white sand and the island's main hub. Divided into Stations 1, 2, and 3, it's lined with resorts, beach bars, and restaurants right on the shore.",
    pros: [
      "Iconic powdery white sand and calm, swimmable water",
      "Widest range of resorts, restaurants, and beach bars",
      "Easy walking access to shops, spas, and nightlife",
    ],
    cons: ["Can get very crowded at sunset", "Pricier than other parts of the island"],
    image: "/assets/boracay-white-beach.jpg",
    hotels: [
      { name: "Discovery Shores Boracay", description: "All-suite beachfront resort right on White Beach, known for its minimalist rooms and quiet pool area." },
      { name: "Henann Regency Resort & Spa", description: "Large family-friendly resort near Station 2, close to the busiest strip of restaurants and bars." },
      { name: "Alta Vista de Boracay", description: "Hillside villas with a private beach cabana, a quieter option a short tricycle ride from the main strip." },
    ],
  },
  {
    pinLabel: "Bulabog Beach",
    subtitle: "Watersports & Kite Surfing",
    description:
      "On the eastern side of the island, Bulabog Beach is Boracay's watersports center — the go-to spot for kiteboarding and windsurfing thanks to steady winds, especially from November to April.",
    pros: ["Best spot on the island for kite and windsurfing lessons", "Fewer crowds than White Beach", "More budget-friendly hostels and guesthouses"],
    cons: ["Water can be too shallow or seaweedy for regular swimming", "Fewer dining options after dark"],
    image: "/assets/boracay-bulabog.jpg",
    hotels: [
      { name: "Angol Point Beachfront Cottages", description: "Simple beachfront cottages popular with kitesurfers, steps away from the launch area." },
      { name: "Boracay Kite Resort", description: "Budget-friendly rooms run by a kitesurf school, with board storage and lesson packages on-site." },
    ],
  },
];

export default function TravelGuidePage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Falls back to "Boracay Islands" if no destination was passed in
  // (e.g. someone opens this page directly without clicking a card).
  const destination = location.state?.destination || "Boracay Islands";

  return (
    <div className="ww-guide-page">
      <header className="ww-navbar ww-navbar-compact">
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

      <main className="ww-guide-main">
        <h1 className="ww-guide-title">{destination} Travel Journey</h1>

        {guideSections.map((section) => (
          <section className="ww-guide-section" key={section.pinLabel}>
            <div className="ww-guide-intro">
              <div className="ww-guide-text">
                <p className="ww-guide-pin">📍{section.pinLabel}</p>
                <p className="ww-guide-subtitle">{section.subtitle}</p>
                <p className="ww-guide-description">{section.description}</p>

                <p className="ww-guide-list-title">Pros of Staying in {section.pinLabel}:</p>
                <ul className="ww-guide-list">
                  {section.pros.map((p) => <li key={p}>{p}</li>)}
                </ul>

                <p className="ww-guide-list-title">Cons of Staying in {section.pinLabel}:</p>
                <ul className="ww-guide-list">
                  {section.cons.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
              <img src={section.image} alt={section.pinLabel} className="ww-guide-image" />
            </div>

            <h3 className="ww-guide-hotel-heading">Hotel Option</h3>
            <div className="ww-guide-hotels-grid">
              {section.hotels.map((h) => (
                <div className="ww-guide-hotel-card" key={h.name}>
                  <p className="ww-guide-hotel-name">🏨 {h.name}</p>
                  <p className="ww-guide-hotel-desc">{h.description}</p>
                  <button className="ww-guide-details-btn">Details</button>
                </div>
              ))}
            </div>

            <h3 className="ww-guide-location-heading">Location</h3>
            <div className="ww-guide-map">
              <PlaceMap placeName={section.pinLabel} context={destination} height={260} />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}