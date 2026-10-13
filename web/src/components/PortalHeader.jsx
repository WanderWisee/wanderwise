import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import NavbarMenu from "./NavbarMenu";
import { useLanguage } from "../context/LanguageContext";
import { useAppData } from "../context/AppDataContext";
import "../App.css";

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

  return (
    <header className="ww-navbar ww-portal-nav">
      <div className="ww-brand" onClick={() => navigate(home)} style={{ cursor: "pointer" }}>
        <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
        <span className="ww-brand-name">WanderWise!</span>
      </div>
      <nav className="ww-nav-links">
        {profileRole === "admin" && <a href="/admin">{t("adminPanel")}</a>}
        {isTeacher && <a href="/teacher">{t("navClasses")}</a>}
        {profileRole === "student" && <a href="/classes">{t("navClasses")}</a>}
        {!isStaff && <a href="/dashboard">{t("navHome")}</a>}
        {/* Admins only view the system — no Guides. */}
        {profileRole !== "admin" && <a href="/travel-tips">{t("navGuides")}</a>}
        <NavbarMenu />
      </nav>
            <div className="ww-nav-icons">
        {/* Admins get no notifications — the Activity log covers it. */}
        {profileRole !== "admin" && (
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
        )}
        {!isStaff && (
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
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
  const loginPath = need === "teacher" ? "/teacher/login" : need === "admin" ? "/admin/login" : "/login";

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
        <p>🔒 {t("portalNoAccess")}</p>
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
