import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import DateRangePicker from "../../components/DateRangePicker";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useAppData } from "../../context/AppDataContext";
import '../../App.css';
import Icon from "../../components/Icon";

// Brown pin (same style as the trip destination pin in the Trip Plan
// Builder), drawn inline so ad blockers can't block an image request.
const tripPinIcon = L.divIcon({
  className: "",
  html: `
    <svg width="28" height="40" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 25 13 25s13-15.3 13-25C26 5.8 20.2 0 13 0z"
            fill="#3a2416" stroke="#2b1c12" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="5" fill="#a9e4dc"/>
    </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

// Destination -> { lat, lng } (or null if not found). Kept outside the
// component so going back to the Dashboard doesn't look them up again.
const destinationCoordsCache = {};

async function lookUpDestination(destination) {
  const key = destination.trim().toLowerCase();
  if (key in destinationCoordsCache) return destinationCoordsCache[key];
  try {
    // Our own backend proxy for OpenStreetMap (cached + retried there).
    const resp = await fetch(`/api/geocode?query=${encodeURIComponent(`${destination}, Philippines`)}`);
    const data = await resp.json();
    const coords = data && data.found ? { lat: data.lat, lng: data.lon } : null;
    destinationCoordsCache[key] = coords;
    return coords;
  } catch {
    return null; // not cached, so it's tried again next time
  }
}

// Zooms the map to show every trip pin (stays on the whole Philippines
// when there are none).
function FitToPins({ pins }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 9);
      return;
    }
    map.fitBounds(
      pins.map((p) => [p.lat, p.lng]),
      { padding: [40, 40], maxZoom: 9 }
    );
  }, [map, pins]);
  return null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDateRange } = usePreferences();
  const { profileFirstName } = useAppData();

  // Travel trips
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Search
  const [buddies, setBuddies] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const PH_CENTER = [12.8797, 121.7740];

  // Map pins for the user's itineraries: destination -> coords.
  const [tripCoords, setTripCoords] = useState({});

  useEffect(() => {
    const uniqueDestinations = [
      ...new Set(trips.map((trip) => (trip.destination || "").trim()).filter(Boolean)),
    ];
    if (uniqueDestinations.length === 0) return;
    let cancelled = false;
    (async () => {
      // One at a time, so OpenStreetMap doesn't reject quick repeat requests.
      for (const destination of uniqueDestinations) {
        const coords = await lookUpDestination(destination);
        if (cancelled) return;
        setTripCoords((prev) => ({ ...prev, [destination.toLowerCase()]: coords }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trips]);

  // One pin per destination; trips to the same place share a pin.
  const tripPins = useMemo(() => {
    const byDestination = {};
    trips.forEach((trip) => {
      const destination = (trip.destination || "").trim();
      const coords = tripCoords[destination.toLowerCase()];
      if (!destination || !coords) return;
      const key = destination.toLowerCase();
      if (!byDestination[key]) {
        byDestination[key] = { destination, lat: coords.lat, lng: coords.lng, trips: [] };
      }
      byDestination[key].trips.push(trip);
    });
    return Object.values(byDestination);
  }, [trips, tripCoords]);

  const tripDates = (trip) =>
    trip.startDate ? formatDateRange(trip.startDate, trip.endDate) : t("noDatesSet");

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
          <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
          <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">{t("navHome")}</a>
          <a href="/travel-tips">{t("navGuides")}</a>
          <a href="/hotels">{t("navHotels")}</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}><Icon name="search" /></span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}><Icon name="bell" /></span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}><Icon name="user" /></span>
        </div>
      </header>

      {/* Same greeting as the mobile home screen. */}
      {profileFirstName && (
        <h1 className="ww-dashboard-greeting">
          {t("helloPrefix")} {profileFirstName}!
        </h1>
      )}

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
                  <span><Icon name="map-pin" /> {trip.destination || trip.title || t("untitledTrip")}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#8a7654",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon name="calendar" /> {tripDates(trip)}
                  </span>
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

            <FitToPins pins={tripPins} />

            {/* A pin for every destination in "Your Itineraries" */}
            {tripPins.map((pin) => (
              <Marker key={pin.destination} position={[pin.lat, pin.lng]} icon={tripPinIcon}>
                <Popup>
                  <strong><Icon name="map-pin" /> {pin.destination}</strong>
                  {pin.trips.map((trip) => (
                    <div key={trip.id} style={{ marginTop: 8 }}>
                      <div><Icon name="calendar" /> {tripDates(trip)}</div>
                      <span
                        onClick={() => navigate(`/trip-plan?tripId=${trip.id}`)}
                        style={{ color: "#2f6f5f", fontWeight: 600, cursor: "pointer" }}
                      >
                        {t("openItinerary")} <Icon name="arrow-right" />
                      </span>
                    </div>
                  ))}
                </Popup>
              </Marker>
            ))}
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

          <div className="ww-date-field">
            <label className="ww-planning-label">{t("dates")}</label>
            {/* One calendar: tap the start date, then the end date. */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
              }}
            />
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