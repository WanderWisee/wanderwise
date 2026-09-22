import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    // TODO: call backend to verify the email exists / send reset code
    navigate("/reset-password", { state: { email: email.trim() } });
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

          <h1 className="ww-reset-title">Forgot Password</h1>
          <p className="ww-field-label" style={{ marginBottom: 16, fontWeight: 400 }}>
            Enter your Gmail account and we'll help you reset your password.
          </p>

          <label className="ww-field-label">Email Address</label>
          <input
            type="email"
            className="ww-field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <div style={{ color: "#8b0000", marginTop: 8 }}>{error}</div>}

          <button
            className="ww-reset-submit"
            onClick={handleContinue}
            style={{ marginTop: 16 }}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}