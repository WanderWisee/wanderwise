import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

// The public, read-only version of a trip — reached via an invite/share
// link when the visitor has no WanderWise account (or isn't logged in).
// This is the "Share Itineraries" feature: same link as Add Crew's invite
// link, just a different outcome depending on login state (see
// JoinTripPage, which decides which of the two the visitor gets).
export default function SharedTripViewPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isLoggedIn = !!localStorage.getItem("wanderwise_token");

  useEffect(() => {
    fetch(`/api/trips/shared/${shareToken}`)
      .then((resp) => {
        if (resp.status === 404) {
          setNotFound(true);
          return null;
        }
        return resp.ok ? resp.json() : null;
      })
      .then((data) => setTrip(data))
      .catch(() => setTrip(null))
      .finally(() => setLoading(false));
  }, [shareToken]);

  // Remember which trip they were trying to join, so the login/register
  // flow can auto-continue the join once they're authenticated.
  const handleSignUpToJoin = () => {
    localStorage.setItem("wanderwise_pending_invite_token", shareToken);
    navigate("/register");
  };

  const handleLogInToJoin = () => {
    localStorage.setItem("wanderwise_pending_invite_token", shareToken);
    navigate("/login");
  };

  return (
    <div className="ww-guide-page">
      <header className="ww-navbar ww-navbar-compact">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <Link to="/dashboard">{t("navHome")}</Link>
          <Link to="/travel-tips">{t("navGuides")}</Link>
          <Link to="/hotels">{t("navHotels")}</Link>
          <NavbarMenu />
        </nav>
      </header>

      <main className="ww-guide-main">
        {!isLoggedIn && !loading && !notFound && trip && (
          <div
            className="ww-shared-trip-banner"
            style={{
              background: "#f2f6f5",
              border: "1px solid #dbeceb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p style={{ margin: 0 }}>🎒 {t("signUpToJoinBanner")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ww-profile-new-btn" onClick={handleSignUpToJoin}>
                {t("signUp")}
              </button>
              <button className="ww-modal-cancel-btn" onClick={handleLogInToJoin}>
                {t("logIn")}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
        ) : notFound || !trip ? (
          <p className="ww-expense-empty">{t("tripNotFoundOrLinkInvalid")}</p>
        ) : (
          <>
            <h1 className="ww-builder-trip-title">
              {t("tripToPrefix")} {trip.destination}
            </h1>
            {trip.startDate && trip.endDate && (
              <p className="ww-builder-dates">📅 {trip.startDate} - {trip.endDate}</p>
            )}

            {trip.sections.map((section) => (
              <div key={section.id || section.name}>
                <h2 className="ww-builder-section-title">{section.name}</h2>
                {section.places.length === 0 ? (
                  <p className="ww-expense-empty">{t("noPlacesAddedToStory")}</p>
                ) : (
                  section.places.map((p) => (
                    <div className="ww-place-card" key={p.id}>
                      <p className="ww-place-name">📍 {p.name}</p>
                      {p.notes && <p className="ww-guide-description">{p.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            ))}

            <p className="ww-budget-total" style={{ marginTop: 16 }}>
              {t("budgetLabel")}: ₱{Number(trip.budgetTotal || 0).toLocaleString()}.00
            </p>
          </>
        )}
      </main>
    </div>
  );
}