import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import '../../App.css';

export default function DashboardPage() {
  const navigate = useNavigate();

  // Travel trips
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Search
  const [buddies, setBuddies] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Google Maps
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  const mapCenter = {
    lat: 14.5995,
    lng: 120.9842,
  };

  const mapContainerStyle = {
    width: "100%",
    height: "420px",
    borderRadius: "12px",
  };

  const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
  };

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

      {/* Travel Stories */}
      <section className="ww-stories-card">
        <h2>Your Travel Stories</h2>

        {loadingTrips ? (
          <p>Loading your trips...</p>
        ) : trips.length === 0 ? (
          <p>
            No trips yet. Start planning your next adventure!
          </p>
        ) : (
          <ul>
            {trips.map((trip) => (
              <li key={trip.id}>
                <strong>
                  {trip.destination || trip.title}
                </strong>{" "}
                — {trip.startDate || "TBD"} to{" "}
                {trip.endDate || "TBD"}
              </li>
            ))}
          </ul>
        )}

        <button
          className="ww-start-planning-btn"
          onClick={() => navigate("/trip-planning")}
        >
          + Start Planning
        </button>
      </section>

      {/* Explore */}
      <section className="ww-explore-section">
        <h2 className="ww-section-title">
          Start Exploring
        </h2>

        <div className="ww-map-card">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={11}
              options={mapOptions}
            >
              <Marker position={mapCenter} />
            </GoogleMap>
          ) : (
            <div className="ww-map-loading">
              Loading map...
            </div>
          )}
        </div>
      </section>

      {/* Search */}
      <section className="ww-search-bar-section">
        <h2 className="ww-search-title">
          Discover your great places to stay!
        </h2>

        <div className="ww-search-bar">

          <div className="ww-search-input-group">
            <label>Search Places</label>

            <input
              type="text"
              placeholder="Where do you want to go?"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
            />
          </div>

          <div className="ww-dates-row">
            <div className="ww-date-field">
              <label className="ww-planning-label">
                Start Date
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
                End Date
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
            <span>Travel Buddies</span>

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
            Search
          </button>

        </div>
      </section>

      {/* Destinations */}
      <section className="ww-destinations-section">
        <h2 className="ww-section-title">
          Top Destinations
        </h2>

        <div className="ww-destinations-grid">
          {destinations.map((dest) => (
            <div
              className="ww-destination-card"
              key={dest.name}
            >
              <img
                src={dest.img}
                alt={dest.name}
              />

              <h3>{dest.name}</h3>

              <button className="ww-itinerary-btn">
                See Itineraries
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Booking */}
      <section className="ww-booking-section">
        <h2 className="ww-section-title">
          Book your trip on another booking site!
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