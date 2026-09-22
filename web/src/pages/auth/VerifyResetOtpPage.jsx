import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../App.css";

export default function VerifyResetOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  if (!email) {
    return (
      <div className="wanderwise-reset">
        <header className="ww-navbar">
          <div className="ww-brand">
            <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
            <span className="ww-brand-name">WanderWise!</span>
          </div>
        </header>
        <main className="ww-reset-wrapper">
          <div className="ww-reset-card">
            <h1 className="ww-reset-title">Session expired</h1>
            <p className="ww-field-label" style={{ fontWeight: 400 }}>
              Please start the Forgot Password flow again.
            </p>
            <button className="ww-reset-submit" onClick={() => navigate("/forgot-password")}>
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleContinue = () => {
    setError("");
    if (!otp.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    // The actual OTP check happens together with the new password on the
    // next page, so we just carry it forward here.
    navigate("/reset-password", { state: { email, otp: otp.trim() } });
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
        setError(data?.error || "Failed to resend code.");
        return;
      }
      setError("A new code was sent to your recovery email.");
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="wanderwise-reset">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
      </header>

      <main className="ww-reset-wrapper">
        <div className="ww-reset-card">
          <button
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => navigate("/forgot-password")}
          >
            ←
          </button>

          <h1 className="ww-reset-title">Enter Verification Code</h1>
          <p className="ww-field-label" style={{ marginBottom: 16, fontWeight: 400 }}>
            We sent a 6-digit code to the recovery Gmail on file for{" "}
            <strong>{email}</strong>.
          </p>

          <label className="ww-field-label">Verification Code</label>
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
            className="ww-reset-submit"
            onClick={handleContinue}
            style={{ marginTop: 16 }}
          >
            Continue
          </button>

          <button
            type="button"
            className="ww-bottom-link"
            onClick={handleResend}
            style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer" }}
          >
            Resend code
          </button>
        </div>
      </main>
    </div>
  );
}
