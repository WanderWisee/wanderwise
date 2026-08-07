import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomaPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from './pages/DashboardPage';
import TripPlanningPage from './pages/TripPlanningPage';
import TravelTipsPage from './pages/TravelTipsPage';

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
