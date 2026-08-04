import React, { useEffect, useState } from 'react';
import '../App.css';

const token = localStorage.getItem('wanderwise_token');

export default function GuidesScreen() {
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/destinations', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((body) => setDestinations(body.destinations || []));
  }, []);

  return (
    <div className="ww-screen ww-guides-screen">
      <div className="ww-card ww-guide-header">
        <div className="ww-card-header">
          <div className="ww-logo">🛡️</div>
          <span>WanderWise!</span>
          <button className="ww-menu-button">☰</button>
        </div>
        <h2>Discover Travel Tips</h2>
        <input className="ww-search-input" placeholder="Discover where to go" />
      </div>

      <div className="ww-guide-list">
        {destinations.slice(0, 4).map((dest) => (
          <div key={dest.id} className="ww-guide-card">
            <img src={dest.imageUrl} alt={dest.name} />
            <div className="ww-guide-card-body">
              <h3>{dest.name}</h3>
              <button className="ww-cta-button ww-solid">See Itineraries</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
