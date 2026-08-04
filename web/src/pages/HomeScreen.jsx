import React, { useEffect, useState } from 'react';
import '../App.css';

const token = localStorage.getItem('wanderwise_token');

function fetchJson(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }).then((res) => res.json());
}

export default function HomeScreen() {
  const [destinations, setDestinations] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planDestination, setPlanDestination] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchJson('http://localhost:4000/api/destinations').then((result) => setDestinations(result.destinations || []));
    fetchJson('http://localhost:4000/api/hotels').then((result) => setHotels(result.hotels || []));
    fetchJson('http://localhost:4000/api/trips').then((result) => setTrips(result.trips || []));
  }, []);

  const createTrip = async () => {
    setMessage('');
    if (!planTitle || !planDestination) {
      setMessage('Please provide a trip title and destination.');
      return;
    }
    const result = await fetchJson('http://localhost:4000/api/trips', {
      method: 'POST',
      body: JSON.stringify({ title: planTitle, destination: planDestination, travelDate: new Date().toISOString().slice(0, 10) }),
    });
    if (result.trip) {
      setTrips((current) => [result.trip, ...current]);
      setPlanTitle('');
      setPlanDestination('');
      setIsPlanning(false);
      setMessage('Trip created successfully.');
      return;
    }
    setMessage(result.error || 'Unable to create a trip.');
  };

  return (
    <div className="ww-screen">
      <section className="ww-card ww-hero-card">
        <div className="ww-card-header">
          <div className="ww-logo">🛡️</div>
          <span>WanderWise!</span>
          <button className="ww-menu-button">☰</button>
        </div>
        <div className="ww-card-body">
          <h2>Your Travel Stories</h2>
          <p>{trips.length === 0 ? 'No trips yet. Start planning your next adventure!' : 'Your saved plans are below.'}</p>
          <button className="ww-cta-button ww-solid" onClick={() => setIsPlanning((open) => !open)}>
            + Start Planning
          </button>
        </div>
        {isPlanning && (
          <div className="ww-plan-form">
            <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} placeholder="Trip title" />
            <input value={planDestination} onChange={(e) => setPlanDestination(e.target.value)} placeholder="Destination" />
            <button className="ww-cta-button ww-solid" onClick={createTrip}>Create Trip</button>
            {message && <div className="ww-message">{message}</div>}
          </div>
        )}
      </section>

      {trips.length > 0 && (
        <section className="ww-card ww-trips-card">
          <h2>Your Trips</h2>
          {trips.map((trip) => (
            <div key={trip.id} className="ww-trip-item">
              <div>
                <strong>{trip.title}</strong>
                <p>{trip.destination}</p>
              </div>
              <span>{trip.travelDate || 'No date set'}</span>
            </div>
          ))}
        </section>
      )}

      <section className="ww-card ww-search-card">
        <h2>Discover your great places to stay!</h2>
        <input className="ww-search-input" placeholder="Search Places" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="ww-date-row">
          <input type="date" className="ww-date-input" />
          <input type="date" className="ww-date-input" />
        </div>
        <div className="ww-guest-row">
          <button className="ww-icon-button">-</button>
          <div className="ww-guest-count">0</div>
          <button className="ww-icon-button">+</button>
          <button className="ww-cta-button ww-solid">Search</button>
        </div>
      </section>

      <section className="ww-card ww-destination-card">
        <h2>Top Destinations</h2>
        {destinations.map((dest) => (
          <div key={dest.id} className="ww-destination-preview">
            <img src={dest.imageUrl} alt={dest.name} />
            <div className="ww-destination-info">
              <h3>{dest.name}</h3>
              <button className="ww-cta-button ww-solid">See Itineraries</button>
            </div>
          </div>
        ))}
      </section>

      <section className="ww-card ww-booking-card">
        <h2>Book your trip on another booking site!</h2>
        <div className="ww-brand-grid">
          <div className="ww-brand-item">klook</div>
          <div className="ww-brand-item">airbnb</div>
          <div className="ww-brand-item">agoda</div>
        </div>
      </section>
    </div>
  );
}
