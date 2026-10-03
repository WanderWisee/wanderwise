import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { notifyAuthChanged } from "../../context/AppDataContext";
import "../../App.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // If the person got here from a shared trip's "Log In to join" button,
  // SharedTripViewPage saved the invite's shareToken before redirecting.
  // Once logged in, finish that join automatically instead of sending
  // them to the plain Dashboard and making them re-find the link.
  const continuePendingInvite = async () => {
    const pendingToken = localStorage.getItem("wanderwise_pending_invite_token");
    if (!pendingToken) {
      navigate("/dashboard");
      return;
    }
    localStorage.removeItem("wanderwise_pending_invite_token");
    try {
      const token = localStorage.getItem("wanderwise_token");
      const resp = await fetch(`/api/trips/join/${pendingToken}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch(() => null);
      if (data?.tripId) {
        navigate(`/trip-plan?tripId=${data.tripId}`);
        return;
      }
    } catch (err) {
      console.warn("Failed to auto-join pending invite:", err);
    }
    navigate("/dashboard");
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError(t("loginErrEmpty"));
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(data?.error || t("loginErrFailed"));
        return;
      }
      if (data?.token) {
        localStorage.setItem("wanderwise_token", data.token);
        // Load THIS account's profile and journals right away, instead of
        // showing the previous account's until the page is refreshed.
        notifyAuthChanged();
      }
      await continuePendingInvite();
    } catch (err) {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wanderwise-login">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img
            src="/assets/logo.jpg"
            alt="WanderWise logo"
            className="ww-logo"
          />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
      </header>

      <main className="ww-login-wrapper">
        <div className="ww-login-card">
          <button
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => navigate('/')}
          >
            ←
          </button>

          <h1 className="ww-login-title">{t("loginTitle")}</h1>

          <label className="ww-field-label">{t("studentEmail")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder={t("enterStudentEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="ww-field-label">{t("password")}</label>
          <div className="ww-password-field">
            <input
              type={showPassword ? "text" : "password"}
              className="ww-field-input"
              placeholder={t("enterPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="ww-password-icon"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "👁" : "🙈"}
            </button>
          </div>

          {error && <div style={{ color: '#8b0000', marginBottom: 12 }}>{error}</div>}
          <button className="ww-login-submit" onClick={handleLogin} disabled={loading}>
            {loading ? t("loggingIn") : t("logIn")}
          </button>

          <div className="ww-links-row">
            <a href="/forgot-password" className="ww-bottom-link">
              {t("forgotPassword")}
            </a>
            <a href="/register" className="ww-bottom-link">
              {t("registerAccount")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}