import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import NavbarMenu from "./NavbarMenu";
import { useLanguage } from "../context/LanguageContext";
import { useAppData } from "../context/AppDataContext";
import "../App.css";
import Icon from "./Icon";

function hasToken() {
  try {
    return !!localStorage.getItem("wanderwise_token");
  } catch {
    return false;
  }
}

// Top bar for the Teacher portal, student Classes pages and Admin panel —
// same look as the rest of the app, with links that fit the role.
// Teachers only get their Classes and Guides (no Home/Hotels/History/Profile).
export default function PortalHeader() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profileRole } = useAppData();
  const isTeacher = profileRole === "teacher";
  const isStaff = isTeacher || profileRole === "admin";
  const home = isTeacher ? "/teacher" : profileRole === "admin" ? "/admin" : "/dashboard";

  // Students (My Classes pages): the same top bar as every other student
  // page — Home, Guides, Hotels, Menu and 🔍 🔔 👤 — so the navigation
  // doesn't change when they open their classes (My Classes is in Menu).
  if (!isStaff) {
    return (
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">{t("navHome")}</a>
          <a href="/travel-tips">{t("navGuides")}</a>
          <a href="/hotels">{t("navHotels")}</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}><Icon name="search" /></span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}><Icon name="bell" /></span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}><Icon name="user" /></span>
        </div>
      </header>
    );
  }

  return (
    <header className="ww-navbar ww-portal-nav">
      <div className="ww-brand" onClick={() => navigate(home)} style={{ cursor: "pointer" }}>
        <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
        <span className="ww-brand-name">WanderWise!</span>
      </div>
      <nav className="ww-nav-links">
        {profileRole === "admin" && <a href="/admin">{t("adminPanel")}</a>}
        {isTeacher && <a href="/teacher">{t("navClasses")}</a>}
        {/* Admins only view the system — no Guides. */}
        {profileRole !== "admin" && <a href="/travel-tips">{t("navGuides")}</a>}
        <NavbarMenu />
      </nav>
            <div className="ww-nav-icons">
        {/* Admins get no notifications — the Activity log covers it. */}
        {profileRole !== "admin" && (
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}><Icon name="bell" /></span>
        )}
      </div>
    </header>
  );
}

// Shown instead of a page when the logged-in account has the wrong role.
export function RoleGate({ need, children }) {
  const { t } = useLanguage();
  const { profileRole } = useAppData();
  const navigate = useNavigate();
  const loginPath = "/login";

  if (!hasToken()) {
    return (
      <div className="ww-portal-gate">
        <p>{t("portalLoginFirst")}</p>
        <button type="button" className="ww-search-btn" onClick={() => navigate(loginPath)}>
          {t("logIn")}
        </button>
      </div>
    );
  }
  if (profileRole === null) {
    return <p className="ww-expense-empty ww-portal-gate">{t("loadingEllipsis")}</p>;
  }
  const allowed = Array.isArray(need) ? need.includes(profileRole) : profileRole === need;
  if (!allowed) {
    const home = profileRole === "teacher" ? "/teacher" : profileRole === "admin" ? "/admin" : "/dashboard";
    return (
      <div className="ww-portal-gate">
        <p><Icon name="lock" /> {t("portalNoAccess")}</p>
        <button type="button" className="ww-booking-cancel" onClick={() => navigate(home)}>
          {t("portalGoHome")}
        </button>
      </div>
    );
  }
  return children;
}

// Wraps the student-only pages (Home, Trip Planning, Hotels, History,
// Profile, Budget…). A teacher who lands on one is sent to the Teacher
// portal instead — teachers don't plan trips of their own.
export function StudentOnly({ children, allowTeacher = false }) {
  const { profileRole } = useAppData();
  if (!hasToken()) return children; // the page handles "not logged in" itself
  if (profileRole === null) return null; // still checking who this is
  if (profileRole === "teacher" && !allowTeacher) return <Navigate to="/teacher" replace />;
  if (profileRole === "admin") return <Navigate to="/admin" replace />;
  return children;
}

// Pages that students, teachers (and the admin) share — Guides, a
// student's trip / Tour Day, journals, Notifications, Settings. For a
// teacher or admin, the page's own (student) top bar is swapped for the
// portal top bar, so the navigation and design stay the same everywhere.
export function StaffShell({ children }) {
  const { profileRole } = useAppData();
  if (profileRole !== "teacher" && profileRole !== "admin") return children;
  return (
    <div className="ww-staff-shell">
      <PortalHeader />
      {children}
    </div>
  );
}