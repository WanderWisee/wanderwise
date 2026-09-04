import React from "react";
import "../../App.css";

const guideSections = [
  {
    pinLabel: "Urbiztondo Beach",
    subtitle: "Surf Town ★★★★☆",
    description:
      "Urbiztondo is the heart of San Juan's surf scene, lined with surf schools, cafes, and beachfront hostels. What used to be a quiet fishing barangay is now La Union's most popular surf destination.",
    pros: [
      "Best surf breaks in La Union",
      "Wide range of budget to mid-range stays",
      "Lively cafe and beach bar scene",
    ],
    cons: ["Can get crowded during surf season", "Limited parking on weekends"],
    image: "/assets/urbiztondo.jpg",
    mapImage: "/assets/urbiztondo-map.jpg",
    hotels: [
      { name: "Flotsam and Jetsam Hostel", description: "A laid-back surf hostel a short walk from Urbiztondo Beach, popular with solo travelers and student groups." },
      { name: "El Union Coffee", description: "Boutique cafe-stay combo known for its coffee and minimalist rooms overlooking the beach." },
      { name: "San Juan Surf Resort", description: "Mid-range resort with pool access, close to the main surf breaks." },
    ],
  },
  {
    pinLabel: "Bacnotan",
    subtitle: "Countryside Escape",
    description:
      "Bacnotan offers a quieter alternative to San Juan, with cave systems, waterfalls, and countryside views for travelers who want to explore beyond the beach.",
    pros: ["Less crowded than San Juan", "Access to caves and waterfalls", "Budget-friendly homestays"],
    cons: ["Fewer dining options", "Requires transport to reach attractions"],
    image: "/assets/bacnotan.jpg",
    mapImage: "/assets/bacnotan-map.jpg",
    hotels: [
      { name: "Bacnotan Riverside Inn", description: "Simple riverside lodging close to the local cave systems." },
      { name: "Villa Lakay Homestay", description: "Family-run homestay with countryside views and home-cooked meals." },
    ],
  },
];

export default function TravelGuidePage() {
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
          <span className="ww-menu-dropdown">Menu</span>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
          <span>👤</span>
        </div>
      </header>

      <main className="ww-guide-main">
        <h1 className="ww-guide-title">La Union Travel Journey</h1>

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
            <img src={section.mapImage} alt={`${section.pinLabel} map`} className="ww-guide-map" />
          </section>
        ))}
      </main>
    </div>
  );
}