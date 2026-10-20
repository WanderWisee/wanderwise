import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Icon from "./Icon";

// Custom SVG pin icons drawn inline — no external image requests at
// all, so browser Tracking Prevention / ad blockers can't block them.
function makeNumberedPinIcon(number) {
  return L.divIcon({
    className: "",
    html: `
      <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23 0 15 0z"
              fill="#FC7E00" stroke="#2b1c12" stroke-width="1.5"/>
        <circle cx="15" cy="15" r="10" fill="#fff"/>
        <text x="15" y="20" text-anchor="middle" font-size="13" font-weight="bold" fill="#FC7E00" font-family="Poppins, sans-serif">${number}</text>
      </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

// Orange pin without a number (places before "Optimize route").
const plainPinIcon = L.divIcon({
  className: "",
  html: `
    <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23 0 15 0z"
            fill="#FC7E00" stroke="#2b1c12" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="6" fill="#fff"/>
    </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -38],
});

// Blue dot for the user's location (start of the optimized route).
const youAreHereIcon = L.divIcon({
  className: "",
  html: `
    <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="11" fill="#2f7ae0" fill-opacity="0.25"/>
      <circle cx="13" cy="13" r="6" fill="#2f7ae0" stroke="#fff" stroke-width="2.5"/>
    </svg>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -12],
});

// A distinct brown pin (no number) for the overall trip destination —
// stands out from the orange numbered "Where to go?" pins.
const destinationIcon = L.divIcon({
  className: "",
  html: `
    <svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 25 13 25s13-15.3 13-25C26 5.8 20.2 0 13 0z"
            fill="#3a2416" stroke="#2b1c12" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="5" fill="#fff"/>
    </svg>`,
  iconSize: [26, 38],
  iconAnchor: [13, 38],
  popupAnchor: [0, -34],
});

const PH_CENTER = [12.8797, 121.7740]; // center of the Philippines

// "Pin on map": the next click on the map sets the place's location.
function PickOnClick({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (active && onPick) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Zooms the map to the day's route when it is shown.
function FitRoute({ path }) {
  const map = useMap();
  const key = path && path.length ? `${path[0]}-${path[path.length - 1]}-${path.length}` : "";
  React.useEffect(() => {
    if (path && path.length > 1) map.fitBounds(path, { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

// Plain marker map — no route drawing here. The full itinerary route was
// removed (redundant with the dedicated Directions page), and the
// single-place "how do I get there" route now lives entirely on its own
// /directions page, so this component stays focused on just showing pins.
//
// Zoom with the mouse wheel / trackpad (or pinch on a phone) — there are
// no +/- buttons.
// route (optional): { path: [[lat, lng], …], stops } — the day's route after
// "Optimize route", drawn in the order of the itinerary list.
// origin (optional): { lat, lng } — the user's location, where the route starts.
export default function TripMap({ places, destinationMarker, destinationLabel, pinMode = false, onPick, route = null, origin = null, originLabel = "You are here" }) {
  // Each place carries the same number it has in the lists
  // (displayNumber); older callers without it get their list position.
  // displayNumber is set only for the optimized day's stops; other pins
  // are plain (no number).
  const numbered = places;
  const geocoded = numbered.filter((p) => p.lat != null && p.lng != null);

  const center = destinationMarker
    ? [destinationMarker.lat, destinationMarker.lng]
    : geocoded.length > 0
    ? [geocoded[0].lat, geocoded[0].lng]
    : PH_CENTER;
  const zoom = destinationMarker || geocoded.length > 0 ? 12 : 6;

  return (
    <div className={pinMode ? "ww-trip-map ww-trip-map-pinning" : "ww-trip-map"}>
      <MapContainer
        key={`${center[0]}-${center[1]}`} // re-centers when the primary pin changes
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "420px", borderRadius: "8px" }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <PickOnClick active={pinMode} onPick={onPick} />

        {route && route.path && route.path.length > 1 && (
          <>
            <Polyline positions={route.path} pathOptions={{ color: "#2f6f5f", weight: 5, opacity: 0.85 }} />
            <FitRoute path={route.path} />
          </>
        )}

        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={youAreHereIcon} zIndexOffset={1000}>
            <Popup>{originLabel}</Popup>
          </Marker>
        )}

        {destinationMarker && (
          <Marker position={[destinationMarker.lat, destinationMarker.lng]} icon={destinationIcon}>
            <Popup><Icon name="target" /> {destinationLabel || "Trip destination"}</Popup>
          </Marker>
        )}

        {geocoded.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={p.displayNumber ? makeNumberedPinIcon(p.displayNumber) : plainPinIcon}>
            <Popup><Icon name="map-pin" />{p.displayNumber ? `${p.displayNumber}. ` : " "}{p.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}