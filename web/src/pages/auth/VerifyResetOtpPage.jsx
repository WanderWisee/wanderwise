import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";
import Icon from "../../components/Icon";

export default function VerifyResetOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const email = location.state?.email || "";
    // "teacher" when this started from the Teacher log in page.
  const portal = location.state?.portal || "student";
  const forgotPath = portal === "teacher" ? "/forgot-password?for=teacher" : "/forgot-password";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  if (!email) {
    return (
      <div className="wanderwise-reset">
        <header className="ww-navbar">
          <div className="ww-brand">
            <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
            <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
          </div>
        </header>
        <main className="ww-reset-wrapper">
          <div className="ww-reset-card">
            <h1 className="ww-reset-title">{t("sessionExpiredTitle")}</h1>
            <p className="ww-field-label" style={{ fontWeight: 400 }}>
              {t("resetAgainPrompt")}
            </p>
            <button className="ww-reset-submit" onClick={() => navigate(forgotPath)}>
              {t("back")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleContinue = () => {
    setError("");
    if (!otp.trim()) {
      setError(t("otpErrEmpty"));
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError(t("valOtp"));
      return;
    }
    // The actual OTP check happens together with the new password on the
    // next page, so we just carry it forward here.
    navigate("/reset-password", { state: { email, otp: otp.trim(), portal } });
  };

  const handleResend = async () => {
    setError("");
    try {
      const resp = await fetch("/api/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolEmail: email }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(data?.error || t("otpErrResendFailed"));
        return;
      }
      setError(t("otpResendRecoverySuccess"));
    } catch (err) {
      setError(t("networkError"));
    }
  };

  return (
    <div className="wanderwise-reset">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
          <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
        </div>
      </header>

      <main className="ww-reset-wrapper">
        <div className="ww-reset-card">
          <button
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => navigate("/forgot-password")}
          >
            <Icon name="arrow-left" />
          </button>

          <h1 className="ww-reset-title">{t("enterVerificationCodeTitle")}</h1>
          <p className="ww-field-label" style={{ marginBottom: 16, fontWeight: 400 }}>
            {t("verifyResetSubtitle")} <strong>{email}</strong>.
          </p>

          <label className="ww-field-label">{t("verificationCode")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="123456"
            value={otp}
            inputMode="numeric"
            autoComplete="one-time-code"
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
          />

          {error && <div style={{ color: "#8b0000", marginTop: 8 }}>{error}</div>}

          <button
            className="ww-reset-submit"
            onClick={handleContinue}
            style={{ marginTop: 16 }}
          >
            {t("continueBtn")}
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