import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

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
      }
      navigate("/dashboard");
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