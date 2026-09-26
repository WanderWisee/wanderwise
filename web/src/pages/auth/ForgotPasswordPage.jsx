import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleContinue = async () => {
    setError("");
    if (!email.trim()) {
      setError(t("forgotErrEmpty"));
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolEmail: email.trim() }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(data?.error || t("forgotErrSendFailed"));
        return;
      }
      navigate("/reset-password/verify-otp", { state: { email: email.trim() } });
    } catch (err) {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wanderwise-reset">
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

      <main className="ww-reset-wrapper">
        <div className="ww-reset-card">
          <button
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => navigate("/login")}
          >
            ←
          </button>

          <h1 className="ww-reset-title">{t("forgotPasswordTitle")}</h1>
          <p className="ww-field-label" style={{ marginBottom: 16, fontWeight: 400 }}>
            {t("forgotPasswordSubtitle")}
          </p>

          <label className="ww-field-label">{t("schoolEmail")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder={t("enterStudentEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <div style={{ color: "#8b0000", marginTop: 8 }}>{error}</div>}

          <button
            className="ww-reset-submit"
            onClick={handleContinue}
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? t("sendingCode") : t("continueBtn")}
          </button>
        </div>
      </main>
    </div>
  );
}