import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useLanguage } from "../context/LanguageContext";

// Leaflet's default marker icon points at image paths that Create React
// App doesn't resolve automatically — importing them explicitly and
// re-registering fixes the "broken image" pin.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Small module-level cache so the same place name isn't geocoded twice
// across re-renders or across different components on the same page.
const geocodeCache = {};

// Goes through our own backend's /api/geocode instead of calling
// Nominatim straight from the browser — a direct browser fetch to
// Nominatim can get rate-limited/blocked, which shows up as a confusing
// "CORS policy" error even though the real cause is the rate limit.
async function geocodeOnce(query) {
  if (geocodeCache[query] !== undefined) return geocodeCache[query];
  try {
    const res = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const coords =
      data && data.found
        ? { lat: data.lat, lng: data.lon }
        : null;
    geocodeCache[query] = coords;
    return coords;
  } catch {
    geocodeCache[query] = null;
    return null;
  }
}

// A very specific name + context combo (e.g. "White Beach, Boracay Islands,
// Philippines") can fail to match anything on Nominatim even though the
// place name alone would — so this tries a few queries, most specific
// first, and falls back to just the context (dropping a pin on the general
// area) rather than showing nothing at all.
async function geocodePlace(placeName, context) {
  const attempts = [];
  if (context) attempts.push(`${placeName}, ${context}, Philippines`);
  attempts.push(`${placeName}, Philippines`);
  if (context) attempts.push(`${context}, Philippines`);

  for (const query of attempts) {
    const result = await geocodeOnce(query);
    if (result) return result;
  }
  return null;
}

// Drops a single pin for a place name — give it just a name (e.g. "White
// Beach") and, optionally, a broader `context` (e.g. "Boracay") to help
// disambiguate it from same-named places elsewhere.
export default function PlaceMap({ placeName, context, height = 220 }) {
  const [coords, setCoords] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!placeName || !placeName.trim()) {
      setCoords(null);
      setNotFound(false);
      return;
    }
    let cancelled = false;
    setCoords(null);
    setNotFound(false);
    geocodePlace(placeName, context).then((result) => {
      if (cancelled) return;
      if (result) setCoords(result);
      else setNotFound(true);
    });
    return () => {
      cancelled = true;
    };
  }, [placeName, context]);

  if (!placeName || !placeName.trim()) return null;

  const placeholderStyle = {
    height,
    width: "100%",
    borderRadius: 12,
    background: "#f2f6f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#7a8b89",
    fontSize: 14,
    textAlign: "center",
    padding: 8,
  };

  if (notFound) {
    return <div style={placeholderStyle}>📍 {t("locationNotFoundFor")} "{placeName}"</div>;
  }

  if (!coords) {
    return <div style={placeholderStyle}>{t("loadingMap")}</div>;
  }

  return (
    <MapContainer
      center={[coords.lat, coords.lng]}
      zoom={13}
      style={{ height, width: "100%", borderRadius: 12 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[coords.lat, coords.lng]}>
        <Popup>{placeName}</Popup>
      </Marker>
    </MapContainer>
  );
}