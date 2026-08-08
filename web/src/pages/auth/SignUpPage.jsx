import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function RegisterPage() {
  const [form, setForm] = useState({
    studentNumber: "",
    dob: "",
    cellphone: "",
    password: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError("");
    // Basic client-side validation
    if (!form.studentNumber || !form.dob || !form.cellphone || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (resp.ok) {
        navigate('/');
      } else {
        const data = await resp.json().catch(() => null);
        setError(data?.message || 'Registration failed.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wanderwise-register">
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

      <main className="ww-register-wrapper">
        <div className="ww-register-card">
          <button
            type="button"
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => navigate('/')}
          >
            ←
          </button>

          <h1 className="ww-register-title">Register Your Account</h1>

          <label className="ww-field-label">Student Number</label>
          <input
            type="text"
            className="ww-field-input"
            value={form.studentNumber}
            onChange={handleChange("studentNumber")}
          />

          <label className="ww-field-label">Date of Birth (MM/DD/YYYY)</label>
          <input
            type="text"
            className="ww-field-input"
            value={form.dob}
            onChange={handleChange("dob")}
          />

          <label className="ww-field-label">Cellphone Number</label>
          <input
            type="text"
            className="ww-field-input"
            value={form.cellphone}
            onChange={handleChange("cellphone")}
          />

          <label className="ww-field-label">
            Create a Password (at least 8 characters)
          </label>
          <div className="ww-password-field">
            <input
              type={showPassword ? "text" : "password"}
              className="ww-field-input"
              value={form.password}
              onChange={handleChange("password")}
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

          <label className="ww-field-label">Confirm Password</label>
          <div className="ww-password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="ww-field-input"
              value={form.confirmPassword}
              onChange={handleChange("confirmPassword")}
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

          {error && <div style={{ color: '#8b0000', marginBottom: 12 }}>{error}</div>}
          <button
            className="ww-register-submit"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>
      </main>
    </div>
  );
}