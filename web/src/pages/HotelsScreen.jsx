import React, { useEffect, useState } from 'react';
import '../App.css';

const token = localStorage.getItem('wanderwise_token');

export default function HotelsScreen() {
  const [hotels, setHotels] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/hotels', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((body) => setHotels(body.hotels || []));
  }, []);

  return (
    <div className="ww-screen ww-hotels-screen">
      <div className="ww-card ww-guide-header">
        <div className="ww-card-header">
          <div className="ww-logo">🛡️</div>
          <span>WanderWise!</span>
          <button className="ww-menu-button">☰</button>
        </div>
        <h2>All your stays in one place!</h2>
        <div className="ww-date-row">
          <input type="date" className="ww-date-input" />
          <input type="date" className="ww-date-input" />
        </div>
      </div>

      <div className="ww-hotel-list">
        {hotels.map((hotel) => (
          <div key={hotel.id} className="ww-hotel-card">
            <img src={hotel.imageUrl} alt={hotel.name} />
            <div className="ww-hotel-card-body">
              <h3>{hotel.name}</h3>
              <p>{hotel.location}</p>
              <p>{hotel.price}</p>
              <p>{hotel.details}</p>
              <button className="ww-cta-button ww-solid">View Deal</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
