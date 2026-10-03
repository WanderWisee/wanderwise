import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import "../../App.css";

// Same style of inline SVG pins as TripMap — no external image
// requests, so nothing for an ad blocker / tracking prevention to block.
const destinationIcon = L.divIcon({
  className: "",
  html: `
    <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23 0 15 0z"
            fill="#FC7E00" stroke="#2b1c12" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="10" fill="#fff"/>
    </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -38],
});

const youAreHereIcon = L.divIcon({
  className: "",
  html: `
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="9" fill="#2f7ae0" fill-opacity="0.25"/>
      <circle cx="11" cy="11" r="5" fill="#2f7ae0" stroke="#fff" stroke-width="2"/>
    </svg>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -10],
});

function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}


function FitBoundsToRoute({ routeCoords }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      map.fitBounds(routeCoords, { padding: [40, 40] });
    }
  }, [routeCoords, map]);
  return null;
}

export default function DirectionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { formatDistance } = usePreferences(); // km or miles, from Settings

  // Passed in from the "🚗 Directions" link in the trip builder's
  // itinerary — the place to go to, and (if we already had it) the
  // user's current location.
  const { placeName, lat, lng, origin: passedOrigin } = location.state || {};

  const [origin, setOrigin] = useState(passedOrigin || null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (passedOrigin || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("Geolocation failed:", err.message);
        setLocationError("directionsLocationDenied");
      }
    );
  }, [passedOrigin]);

  // Every route OSRM offers (the main one plus alternatives), each as
  // { coords, distanceM, durationS, via }. The student picks one; the
  // others stay on the map in gray so they can compare.
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [routeError, setRouteError] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (!origin || lat == null || lng == null) return;
    let cancelled = false;
    setLoadingRoute(true);
    setRouteError(null);
    // OSRM — free, OpenStreetMap-based routing, no API key needed. Uses
    // the exact same coordinates already confirmed/pinned in the trip
    // builder, so the route drawn here always matches what the student
    // already saw there.
    // alternatives=3 asks for up to 3 extra routes. OSRM only returns
    // alternatives that are really different, so sometimes there's just one.
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${lng},${lat}?overview=full&geometries=geojson&alternatives=3&steps=true`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          setRoutes(
            data.routes.map((route) => ({
              coords: route.geometry.coordinates.map(([rlng, rlat]) => [rlat, rlng]),
              distanceM: route.distance,
              durationS: route.duration,
              // Main roads used, e.g. "Maharlika Highway, SLEX".
              via: (route.legs || []).map((leg) => leg.summary).filter(Boolean).join(", "),
            }))
          );
          setSelectedRoute(0); // OSRM lists the fastest first
        } else {
          setRouteError("directionsNoRoute");
        }
      })
      .catch((err) => {
        console.warn("OSRM route lookup failed", err);
        if (!cancelled) setRouteError("directionsRouteFailed");
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, lat, lng]);

  const hasTarget = lat != null && lng != null;
  const activeRoute = routes[selectedRoute] || null;
  const shortestIndex = routes.length
    ? routes.reduce((best, r, i) => (r.distanceM < routes[best].distanceM ? i : best), 0)
    : -1;
  const center = hasTarget ? [lat, lng] : origin ? [origin.lat, origin.lng] : [12.8797, 121.774];
  const zoom = hasTarget ? 14 : 6;

  return (
    <div className="ww-directions-page">
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

      <main className="ww-directions-main">
        <h1 className="ww-directions-title">
          {t("directionsTitle")}
          {placeName && <span style={{ fontSize: 18, fontWeight: "normal" }}> — {placeName}</span>}
        </h1>

        {!hasTarget ? (
          <p style={{ color: "#7a6a4f" }}>
            {t("directionsNoPlace")}
          </p>
        ) : (
          <>
            <div className="ww-directions-map">
              <MapContainer
                key={`${center[0]}-${center[1]}`}
                center={center}
                zoom={zoom}
                style={{ width: "100%", height: "480px", borderRadius: "8px" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[lat, lng]} icon={destinationIcon}>
                  <Popup>📍 {placeName || t("directionsDestination")}</Popup>
                </Marker>

                {origin && (
                  <Marker position={[origin.lat, origin.lng]} icon={youAreHereIcon}>
                    <Popup>📍 {t("directionsYouAreHere")}</Popup>
                  </Marker>
                )}

                {/* Other routes in gray first, so the chosen one is drawn on
                    top. Clicking a gray route selects it. */}
                {routes.map((r, i) =>
                  i === selectedRoute ? null : (
                    <Polyline
                      key={`alt-${i}`}
                      positions={r.coords}
                      pathOptions={{ color: "#8a8a8a", weight: 5, opacity: 0.6, dashArray: "6 8" }}
                      eventHandlers={{ click: () => setSelectedRoute(i) }}
                    />
                  )
                )}
                {activeRoute && (
                  <>
                    <Polyline
                      key={`active-${selectedRoute}`}
                      positions={activeRoute.coords}
                      pathOptions={{ color: "#2f7ae0", weight: 6, opacity: 0.9 }}
                    />
                    <FitBoundsToRoute routeCoords={routes[0].coords} />
                  </>
                )}
              </MapContainer>
            </div>

            {/* The actual travel time + distance, front and center on this
                page — this IS the point of a dedicated Directions page,
                not just a line on a map. */}
            <div
              style={{
                marginTop: 16,
                padding: "14px 18px",
                borderRadius: 10,
                background: "#eaf2fb",
                border: "1px solid #cfe0f5",
                fontSize: 15,
                maxWidth: 480,
              }}
            >
              {locationError && <p style={{ color: "#a33", margin: 0 }}>⚠️ {t(locationError)}</p>}
              {!locationError && !origin && <p style={{ margin: 0 }}>{t("directionsLoadingLocation")}</p>}
              {origin && loadingRoute && <p style={{ margin: 0 }}>{t("directionsLoadingRoute")}</p>}
              {origin && !loadingRoute && routeError && (
                <p style={{ color: "#a33", margin: 0 }}>⚠️ {t(routeError)}</p>
              )}
              {origin && !loadingRoute && activeRoute && (
                <p style={{ margin: 0 }}>
                  🚗 <strong>{formatDuration(activeRoute.durationS)}</strong> ({formatDistance(activeRoute.distanceM)})
                </p>
              )}
            </div>

            {/* Route choices — like Google Maps: every way there, with its
                time and distance. Tap one to show it on the map. */}
            {origin && !loadingRoute && routes.length > 0 && (
              <div className="ww-route-options">
                <p className="ww-route-options-title">
                  {routes.length > 1 ? `${t("routeOptionsTitle")} (${routes.length})` : t("routeOnlyOne")}
                </p>
                {routes.map((r, i) => (
                  <button
                    type="button"
                    key={`opt-${i}`}
                    className={`ww-route-option ${i === selectedRoute ? "selected" : ""}`}
                    onClick={() => setSelectedRoute(i)}
                  >
                    <span className="ww-route-option-main">
                      <strong>{formatDuration(r.durationS)}</strong> · {formatDistance(r.distanceM)}
                      {routes.length > 1 && i === 0 && <span className="ww-route-tag">⚡ {t("routeFastest")}</span>}
                      {routes.length > 1 && i === shortestIndex && i !== 0 && (
                        <span className="ww-route-tag">📏 {t("routeShortest")}</span>
                      )}
                    </span>
                    {r.via && (
                      <span className="ww-route-option-via">
                        {t("routeVia")} {r.via}
                      </span>
                    )}
                    {i !== 0 && routes.length > 1 && (
                      <span className="ww-route-option-diff">
                        +{formatDuration(Math.max(0, r.durationS - routes[0].durationS))} {t("routeSlowerThanFastest")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}