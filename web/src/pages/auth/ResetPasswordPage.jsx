import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    // TODO: call backend to update password
    navigate("/login");
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

          <h1 className="ww-reset-title">Reset Password</h1>

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

          <button className="ww-reset-submit" onClick={handleLogin}>
            Log in
          </button>
        </div>
      </main>
    </div>
  );
}