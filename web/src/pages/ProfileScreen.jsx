import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ trips: 0 });
  const navigate = useNavigate();
  const token = localStorage.getItem('wanderwise_token');

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:4000/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((body) => {
        setUser(body.user);
        setStats(body.stats || { trips: 0 });
      });
  }, [token]);

  const logout = () => {
    localStorage.removeItem('wanderwise_token');
    navigate('/auth');
  };

  if (!user) {
    return <div className="ww-screen ww-loading">Loading profile...</div>;
  }

  return (
    <div className="ww-screen ww-profile-screen">
      <div className="ww-card ww-profile-header">
        <div className="ww-card-header">
          <div className="ww-logo">🛡️</div>
          <span>WanderWise!</span>
          <button className="ww-menu-button">☰</button>
        </div>
        <div className="ww-profile-bio">
          <div className="ww-avatar" />
          <h2>{user.username}</h2>
          <p>{user.bio}</p>
          <p>{user.location}</p>
        </div>
        <div className="ww-profile-stats">
          <div>
            <strong>{stats.trips}</strong>
            <span>Trips</span>
          </div>
          <div>
            <strong>0</strong>
            <span>Following</span>
          </div>
          <div>
            <strong>0</strong>
            <span>Likes</span>
          </div>
        </div>
        <div className="ww-profile-actions">
          <button className="ww-cta-button">Edit</button>
          <button className="ww-cta-button ww-solid" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
