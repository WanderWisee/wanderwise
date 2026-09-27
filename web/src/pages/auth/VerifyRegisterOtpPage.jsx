import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function VerifyRegisterOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const form = location.state || null;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Someone landed here directly without going through Register first.
  if (!form || !form.schoolEmail) {
    return (
      <div className="wanderwise-register">
        <header className="ww-navbar">
          <div className="ww-brand">
            <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
            <span className="ww-brand-name">WanderWise!</span>
          </div>
        </header>
        <main className="ww-register-wrapper">
          <div className="ww-register-card">
            <h1 className="ww-register-title">{t("sessionExpiredTitle")}</h1>
            <p className="ww-field-label" style={{ fontWeight: 400 }}>
              {t("registerAgainPrompt")}
            </p>
            <button className="ww-register-submit" onClick={() => navigate("/register")}>
              {t("backToRegister")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Same "finish the pending invite" logic as LoginPage — if this account
  // was created from a shared trip's "Sign Up to join" button, complete
  // that join right after the account is actually created.
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

  const handleVerify = async () => {
    setError("");
    if (!otp.trim()) {
      setError(t("otpErrEmpty"));
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          schoolEmail: form.schoolEmail,
          recoveryEmail: form.recoveryEmail,
          dob: form.dob,
          cellphone: form.cellphone,
          password: form.password,
          otpCode: otp.trim(),
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(data?.error || t("otpErrVerifyFailed"));
        return;
      }
      if (data?.token) {
        localStorage.setItem("wanderwise_token", data.token);
      }
      await continuePendingInvite();
    } catch (err) {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const resp = await fetch("/api/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolEmail: form.schoolEmail,
          recoveryEmail: form.recoveryEmail,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(data?.error || t("otpErrResendFailed"));
        return;
      }
      setError(t("otpResendSuccess"));
    } catch (err) {
      setError(t("networkError"));
    }
  };

  return (
    <div className="wanderwise-register">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
      </header>

      <main className="ww-register-wrapper">
        <div className="ww-register-card">
          <button
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => navigate("/register")}
          >
            ←
          </button>

          <h1 className="ww-register-title">{t("verifyEmailTitle")}</h1>
          <p className="ww-field-label" style={{ marginBottom: 16, fontWeight: 400 }}>
            {t("verifyRegisterSubtitleBefore")}{" "}
            <strong>{form.recoveryEmail}</strong>{t("verifyRegisterSubtitleMiddle")}{" "}
            <strong>{form.schoolEmail}</strong>.
          </p>

          <label className="ww-field-label">{t("verificationCode")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />

          {error && <div style={{ color: "#8b0000", marginTop: 8 }}>{error}</div>}

          <button
            className="ww-register-submit"
            onClick={handleVerify}
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? t("verifying") : t("verifyAndCreate")}
          </button>

          <button
            type="button"
            className="ww-bottom-link"
            onClick={handleResend}
            style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer" }}
          >
            {t("resendCode")}
          </button>
        </div>
      </main>
    </div>
  );
}