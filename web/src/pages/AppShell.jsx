import React, { useEffect, useState } from 'react';
import { Link, useNavigate, Route, Routes, Navigate } from 'react-router-dom';
import HomeScreen from './HomeScreen';
import GuidesScreen from './GuidesScreen';
import HotelsScreen from './HotelsScreen';
import ProfileScreen from './ProfileScreen';
import '../App.css';

function requireAuth() {
  return localStorage.getItem('wanderwise_token');
}

export default function AppShell() {
  const navigate = useNavigate();
  const token = requireAuth();

  useEffect(() => {
    if (!token) navigate('/auth');
  }, [navigate, token]);

  return (
    <div className="ww-app-shell">
      <div className="ww-app-content">
        <Routes>
          <Route path="" element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomeScreen />} />
          <Route path="guides" element={<GuidesScreen />} />
          <Route path="hotels" element={<HotelsScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
        </Routes>
      </div>
      <nav className="ww-bottom-nav">
        <Link to="home" className="ww-nav-item">Home</Link>
        <Link to="guides" className="ww-nav-item">Guides</Link>
        <Link to="hotels" className="ww-nav-item">Hotels</Link>
        <Link to="profile" className="ww-nav-item">Profile</Link>
      </nav>
    </div>
  );
}
