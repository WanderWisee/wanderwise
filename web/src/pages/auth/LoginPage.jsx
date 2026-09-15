import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
  // TEMPORARY: skip backend call for visual testing.
  // Revert this once backend is ready — see the commented version below.
  localStorage.setItem('wanderwise_token', 'dev-token');
  navigate('/dashboard');
};

  // const handleLogin = async () => {
  //   setError("");
  //   setLoading(true);
  //   try {
  //     const resp = await fetch('/api/login', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ studentNumber: username, password }),
  //     });
  //     const data = await resp.json().catch(() => null);
  //     if (!resp.ok) {
  //       setError(data?.error || 'Login failed.');
  //       return;
  //     }
  //     if (data?.token) {
  //       localStorage.setItem('wanderwise_token', data.token);
  //     }
  //     navigate('/dashboard');
  //   } catch (err) {
  //     setError('Network error. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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

          <h1 className="ww-login-title">Let's get you in</h1>

          <label className="ww-field-label">Student Email</label>
          <input
            type="text"
            className="ww-field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="ww-field-label">Password</label>
          <div className="ww-password-field">
            <input
              type={showPassword ? "text" : "password"}
              className="ww-field-input"
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
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <div className="ww-links-row">
            <a href="/forgot-password" className="ww-bottom-link">
              Forgot Password
            </a>
            <a href="/register" className="ww-bottom-link">
              Register Account
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}