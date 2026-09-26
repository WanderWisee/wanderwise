import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../../context/LanguageContext";
import '../../App.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Travel trips
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Search
  const [buddies, setBuddies] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const PH_CENTER = [12.8797, 121.7740];

  const destinations = [
    {
      name: "Boracay Islands",
      img: "/assets/boracay.jpg",
    },
    {
      name: "El Nido, Palawan",
      img: "/assets/el-nido.jpg",
    },
    {
      name: "Baguio City",
      img: "/assets/baguio.jpg",
    },
  ];

  // Load user's trips
  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const loadTrips = async () => {
      try {
        const resp = await fetch("/api/trips", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (resp.ok) {
          const data = await resp.json().catch(() => []);
          setTrips(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load trips:", err);
      } finally {
        setLoadingTrips(false);
      }
    };

    loadTrips();
  }, [navigate]);

  return (
    <div className="ww-dashboard">

      {/* Header */}
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">{t("navHome")}</a>
          <a href="/travel-tips">{t("navGuides")}</a>
          <a href="/hotels">{t("navHotels")}</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      {/* Travel Stories */}
      <div className="ww-stories-row">
        <section className="ww-stories-card">
          <h2>{t("yourTravelStories")}</h2>

          <p>
            {t("noTripsYetStartPlanning")}
          </p>

          <button
            className="ww-start-planning-btn"
            onClick={() => navigate("/trip-planning")}
          >
            + {t("startPlanning")}
          </button>
        </section>

        <section className="ww-stories-card">
          <h2>{t("yourItineraries")}</h2>

          {loadingTrips ? (
            <p>{t("loadingYourTrips")}</p>
          ) : trips.length === 0 ? (
            <p>{t("noItinerariesYet")}</p>
          ) : (
            <div className="ww-stories-list">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="ww-story-item"
                  onClick={() => navigate(`/trip-plan?tripId=${trip.id}`)}
                >
                  📍 {trip.destination || trip.title || t("untitledTrip")}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Explore */}
      <section className="ww-explore-section">
        <h2 className="ww-section-title">
          {t("startExploring")}
        </h2>

        <div className="ww-dashboard-map-wrapper">
          <MapContainer
            center={PH_CENTER}
            zoom={6}
            style={{ width: "100%", height: "420px", borderRadius: "12px" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </MapContainer>
        </div>
      </section>

      {/* Search */}
      <section className="ww-search-bar-section">
        <h2 className="ww-search-title">
          {t("discoverGreatPlaces")}
        </h2>

        <div className="ww-search-bar">

          <div className="ww-search-input-group">
            <label>{t("searchPlaces")}</label>

            <input
              type="text"
              placeholder={t("whereDoYouWantToGo")}
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
            />
          </div>

          <div className="ww-dates-row">
            <div className="ww-date-field">
              <label className="ww-planning-label">
                {t("startDate")}
              </label>

              <input
                type="date"
                className="ww-date-input"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
              />
            </div>

            <div className="ww-date-field">
              <label className="ww-planning-label">
                {t("endDate")}
              </label>

              <input
                type="date"
                className="ww-date-input"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
              />
            </div>
          </div>

          <div className="ww-buddies-counter">
            <span>{t("travelBuddies")}</span>

            <div className="ww-counter-controls">
              <button
                onClick={() =>
                  setBuddies(
                    Math.max(0, buddies - 1)
                  )
                }
              >
                -
              </button>

              <span>{buddies}</span>

              <button
                onClick={() =>
                  setBuddies(buddies + 1)
                }
              >
                +
              </button>
            </div>
          </div>

          <button
            className="ww-search-btn"
            onClick={() =>
              navigate("/hotels", {
                state: {
                  search: searchQuery,
                  startDate,
                  endDate,
                },
              })
            }
          >
            {t("search")}
          </button>

        </div>
      </section>

      {/* Destinations */}
      <section className="ww-destinations-section">
        <h2 className="ww-section-title">
          {t("topDestinations")}
        </h2>

        <div className="ww-destinations-grid">
          {destinations.map((dest) => {
            // Only Boracay has a real guide page for now.
            const hasGuide = dest.name === "Boracay Islands";
            return (
              <div className="ww-destination-card" key={dest.name}>
                <img src={dest.img} alt={dest.name} />
                <h3>{dest.name}</h3>
                <button
                  className="ww-itinerary-btn"
                  disabled={!hasGuide}
                  style={{
                    opacity: hasGuide ? 1 : 0.5,
                    cursor: hasGuide ? "pointer" : "not-allowed",
                  }}
                  onClick={() =>
                    hasGuide &&
                    navigate("/travel-guide", {
                      state: { destination: dest.name },
                    })
                  }
                >
                  {t("seeItineraries")}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Booking */}
      <section className="ww-booking-section">
        <h2 className="ww-section-title">
          {t("bookOnAnotherSite")}
        </h2>

        <div className="ww-booking-grid">
          <a
            href="https://www.klook.com"
            className="ww-booking-card ww-klook"
            target="_blank"
            rel="noopener noreferrer"
          >
            Klook
          </a>

          <a
            href="https://www.airbnb.com"
            className="ww-booking-card ww-airbnb"
            target="_blank"
            rel="noopener noreferrer"
          >
            Airbnb
          </a>

          <a
            href="https://www.agoda.com"
            className="ww-booking-card ww-agoda"
            target="_blank"
            rel="noopener noreferrer"
          >
            Agoda
          </a>
        </div>
      </section>

    </div>
  );
}