import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/auth/HomaPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import VerifyRegisterOtpPage from './pages/auth/VerifyRegisterOtpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import VerifyResetOtpPage from './pages/auth/VerifyResetOtpPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TripPlanningPage from './pages/trip-planning/TripPlanningPage';
import TravelTipsPage from './pages/travel-tips/TravelTipsPage';
import HotelsPage from './pages/hotels/HotelsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import TravelGuidePage from './pages/guides/TravelGuidePage';
import HotelSearchResultsPage from './pages/hotels/HotelSearchResultsPage';
import TripPlanBuilderPage from './pages/trip-plan-builder/TripPlanBuilderPage';
import InviteCrewPage from './pages/trip-plan-builder/InviteCrewPage';
import BudgetBreakdownPage from './pages/budget/BudgetBreakdownPage';
import AddExpensePage from './pages/budget/AddExpensePage';
import DirectionsPage from './pages/directions/DirectionsPage';
import ProfilePage from './pages/profile/ProfilePage';
import PublicProfilePage from './pages/profile/PublicProfilePage';
import JournalNewPostPage from './pages/journal/JournalNewPostPage';
import SettingsPage from './pages/settings/SettingsPage';
import HistoryPage from './pages/history/HistoryPage';
import { AppDataProvider } from './context/AppDataContext';
import JournalViewPage from './pages/journal/JournalViewPage';

function App() {
  return (
  <AppDataProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route path="/register/verify-otp" element={<VerifyRegisterOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/verify-otp" element={<VerifyResetOtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trip-planning" element={<TripPlanningPage />} />
        <Route path="/travel-tips" element={<TravelTipsPage />} />
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/guides/:destinationName" element={<TravelGuidePage />} />
        <Route path="/hotels/results" element={<HotelSearchResultsPage />} />
        <Route path="/trip-plan" element={<TripPlanBuilderPage />} />
        <Route path="/trip-plan/invite" element={<InviteCrewPage />} />
        <Route path="/budget/breakdown" element={<BudgetBreakdownPage />} />
        <Route path="/budget/add-expense" element={<AddExpensePage />} />
        <Route path="/directions" element={<DirectionsPage />} />
        <Route path="/add-expense" element={<AddExpensePage />} />
        <Route path="/breakdown" element={<BudgetBreakdownPage />} />
        <Route path="/invite-crew" element={<InviteCrewPage />} />
        <Route path="/travel-guide" element={<TravelGuidePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/view/:userId" element={<PublicProfilePage />} />
        <Route path="/journal/new" element={<JournalNewPostPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/journal/view/:id" element={<JournalViewPage />} />
      </Routes>
    </BrowserRouter>
  </AppDataProvider>
  );
}

export default App;