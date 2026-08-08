import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/auth/HomaPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TripPlanningPage from './pages/trip-planning/TripPlanningPage';
import TravelTipsPage from './pages/travel-tips/TravelTipsPage';
import HotelsPage from './pages/hotels/HotelsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trip-planning" element={<TripPlanningPage />} />
        <Route path="/travel-tips" element={<TravelTipsPage />} />
        <Route path="/hotels" element={<HotelsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
