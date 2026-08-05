import React from "react";
import { GoogleMap, LoadScript } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "420px",
  borderRadius: "20px",
  overflow: "hidden",
};

const center = {
  lat: 14.6110,
  lng: 121.0470,
};

export default function GoogleMapSection() {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  return (
    <section className="ww-map-section">
      <h2 className="ww-map-title">Explore Nearby Destinations</h2>
      <div className="ww-map-container">
        <LoadScript googleMapsApiKey={apiKey || ""}>
          <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13} />
        </LoadScript>
      </div>
      <p className="ww-map-note">Your map loads once the API key is configured in <code>.env</code>.</p>
    </section>
  );
}
