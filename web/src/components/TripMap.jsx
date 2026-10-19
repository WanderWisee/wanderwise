import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
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

// Plain marker map — no route drawing here. The full itinerary route was
// removed (redundant with the dedicated Directions page), and the
// single-place "how do I get there" route now lives entirely on its own
// /directions page, so this component stays focused on just showing pins.
//
// Zoom with the mouse wheel / trackpad (or pinch on a phone) — there are
// no +/- buttons.
export default function TripMap({ places, destinationMarker, destinationLabel, pinMode = false, onPick }) {
  // Each place carries the same number it has in the lists
  // (displayNumber); older callers without it get their list position.
  const numbered = places.map((p, i) => ({ ...p, displayNumber: p.displayNumber ?? i + 1 }));
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

        {destinationMarker && (
          <Marker position={[destinationMarker.lat, destinationMarker.lng]} icon={destinationIcon}>
            <Popup><Icon name="target" /> {destinationLabel || "Trip destination"}</Popup>
          </Marker>
        )}

        {geocoded.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={makeNumberedPinIcon(p.displayNumber)}>
            <Popup><Icon name="map-pin" />{p.displayNumber} {p.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}