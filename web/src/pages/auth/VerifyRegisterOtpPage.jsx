import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../App.css";

export default function VerifyRegisterOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
            <h1 className="ww-register-title">Session expired</h1>
            <p className="ww-field-label" style={{ fontWeight: 400 }}>
              Please start registration again.
            </p>
            <button className="ww-register-submit" onClick={() => navigate("/register")}>
              Back to Register
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleVerify = async () => {
    setError("");
    if (!otp.trim()) {
      setError("Please enter the verification code.");
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
        setError(data?.error || "Verification failed.");
        return;
      }
      if (data?.token) {
        localStorage.setItem("wanderwise_token", data.token);
      }
      navigate("/dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
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
        setError(data?.error || "Failed to resend code.");
        return;
      }
      setError("A new code was sent to your personal email.");
    } catch (err) {
      setError("Network error. Please try again.");
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

          <h1 className="ww-register-title">Verify Your Email</h1>
          <p className="ww-field-label" style={{ marginBottom: 16, fontWeight: 400 }}>
            We sent a 6-digit code to your personal email,{" "}
            <strong>{form.recoveryEmail}</strong>. Enter it below to finish
            creating your account for <strong>{form.schoolEmail}</strong>.
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
            className="ww-register-submit"
            onClick={handleVerify}
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? "Verifying..." : "Verify & Create Account"}
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