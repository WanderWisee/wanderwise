import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../App.css";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const otp = location.state?.otp || "";

  const handleSubmit = async () => {
    setError("");

    if (!email || !otp) {
      setError("Session expired. Please start the Forgot Password flow again.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolEmail: email,
          otpCode: otp,
          newPassword,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(data?.error || "Failed to reset password.");
        return;
      }
      navigate("/login");
    } catch (err) {
      setError("Network error. Please try again.");
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
            onClick={() => navigate("/forgot-password")}
          >
            ←
          </button>

          <h1 className="ww-reset-title">Reset Password</h1>

          {email && (
            <p className="ww-field-label" style={{ marginBottom: 16, fontWeight: 400 }}>
              Resetting password for <strong>{email}</strong>
            </p>
          )}

          <label className="ww-field-label">New Password</label>
          <div className="ww-password-field">
            <input
              type={showNewPassword ? "text" : "password"}
              className="ww-field-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className="ww-password-icon"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              onClick={() => setShowNewPassword((prev) => !prev)}
            >
              {showNewPassword ? "👁" : "🙈"}
            </button>
          </div>

          <label className="ww-field-label">Re-Enter password</label>
          <div className="ww-password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="ww-field-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="ww-password-icon"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? "👁" : "🙈"}
            </button>
          </div>

          {error && <div style={{ color: "#8b0000", marginTop: 8 }}>{error}</div>}

          <button className="ww-reset-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Log in"}
          </button>
        </div>
      </main>
    </div>
  );
}
