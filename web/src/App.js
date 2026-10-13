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
import DestinationStoriesPage from './pages/guides/DestinationStoriesPage';
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
import { LanguageProvider } from './context/LanguageContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { DialogProvider } from './context/DialogContext';
import NotificationWatcher from './components/NotificationWatcher';
import JournalViewPage from './pages/journal/JournalViewPage';
import JoinTripPage from "./pages/trip-plan-builder/JoinTripPage";
import SharedTripViewPage from "./pages/trip-plan-builder/SharedTripViewPage";
import TourDayPage from "./pages/tour/TourDayPage";
import TeacherRegisterPage from "./pages/auth/TeacherRegisterPage";
import TeacherLoginPage from "./pages/auth/TeacherLoginPage";
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import { StudentOnly } from "./components/PortalHeader";
import TeacherHomePage from "./pages/teacher/TeacherHomePage";
import TeacherClassPage from "./pages/teacher/TeacherClassPage";
import TeacherAssignmentPage from "./pages/teacher/TeacherAssignmentPage";
import TeacherStudentPage from "./pages/teacher/TeacherStudentPage";
import MyClassesPage from "./pages/classes/MyClassesPage";
import ClassViewPage from "./pages/classes/ClassViewPage";
import AdminPage from "./pages/admin/AdminPage";

function App() {
  return (
  <LanguageProvider>
    <PreferencesProvider>
    <DialogProvider>
    <AppDataProvider>
      {/* Checks for new notifications and trip reminders every minute on
          every page, and shows a browser pop-up when allowed. */}
      <NotificationWatcher />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignUpPage />} />
          <Route path="/register/verify-otp" element={<VerifyRegisterOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/verify-otp" element={<VerifyResetOtpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<StudentOnly><DashboardPage /></StudentOnly>} />
          <Route path="/trip-planning" element={<StudentOnly><TripPlanningPage /></StudentOnly>} />
          <Route path="/travel-tips" element={<StudentOnly allowTeacher><TravelTipsPage /></StudentOnly>} />
          <Route path="/travel-tips/stories" element={<StudentOnly allowTeacher><DestinationStoriesPage /></StudentOnly>} />
          <Route path="/hotels" element={<StudentOnly><HotelsPage /></StudentOnly>} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/guides/:destinationName" element={<StudentOnly allowTeacher><TravelGuidePage /></StudentOnly>} />
          <Route path="/hotels/results" element={<StudentOnly><HotelSearchResultsPage /></StudentOnly>} />
          <Route path="/trip-plan" element={<TripPlanBuilderPage />} />
          <Route path="/trip-plan/invite" element={<StudentOnly><InviteCrewPage /></StudentOnly>} />
          <Route path="/budget/breakdown" element={<StudentOnly><BudgetBreakdownPage /></StudentOnly>} />
          <Route path="/budget/add-expense" element={<StudentOnly><AddExpensePage /></StudentOnly>} />
          <Route path="/directions" element={<StudentOnly><DirectionsPage /></StudentOnly>} />
          <Route path="/add-expense" element={<StudentOnly><AddExpensePage /></StudentOnly>} />
          <Route path="/breakdown" element={<StudentOnly><BudgetBreakdownPage /></StudentOnly>} />
          <Route path="/invite-crew" element={<StudentOnly><InviteCrewPage /></StudentOnly>} />
          <Route path="/travel-guide" element={<StudentOnly allowTeacher><TravelGuidePage /></StudentOnly>} />
          <Route path="/profile" element={<StudentOnly><ProfilePage /></StudentOnly>} />
          <Route path="/profile/view/:userId" element={<PublicProfilePage />} />
          <Route path="/journal/new" element={<StudentOnly><JournalNewPostPage /></StudentOnly>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/history" element={<StudentOnly><HistoryPage /></StudentOnly>} />
          <Route path="/journal/view/:id" element={<JournalViewPage />} />
          <Route path="/trip-plan/join/:shareToken" element={<StudentOnly><JoinTripPage /></StudentOnly>} />
          <Route path="/trip-plan/shared/:shareToken" element={<SharedTripViewPage />} />
          <Route path="/trip-plan/tour" element={<TourDayPage />} />
          {/* Teacher portal, student classes, admin panel.
              <StudentOnly> pages send a teacher to /teacher instead. */}
          <Route path="/teacher/login" element={<TeacherLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/register/teacher" element={<TeacherRegisterPage />} />
          <Route path="/teacher" element={<TeacherHomePage />} />
          <Route path="/teacher/class/:classId" element={<TeacherClassPage />} />
          <Route path="/teacher/class/:classId/assignment/:assignmentId" element={<TeacherAssignmentPage />} />
          <Route path="/teacher/class/:classId/student/:studentId" element={<TeacherStudentPage />} />
          <Route path="/classes" element={<StudentOnly><MyClassesPage /></StudentOnly>} />
          <Route path="/classes/:classId" element={<StudentOnly><ClassViewPage /></StudentOnly>} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
    </DialogProvider>
    </PreferencesProvider>
  </LanguageProvider>
  );
}

export default App;