import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    schoolEmail: "",
    recoveryEmail: "",
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
    setError("");

    if (
      !form.firstName ||
      !form.lastName ||
      !form.schoolEmail ||
      !form.recoveryEmail ||
      !form.dob ||
      !form.cellphone ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[^@\s]+@student\.mseuf\.edu\.ph$/i.test(form.schoolEmail.trim())) {
      setError("Please use your official @student.mseuf.edu.ph email.");
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
      const resp = await fetch("/api/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolEmail: form.schoolEmail.trim(),
          recoveryEmail: form.recoveryEmail.trim(),
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(data?.error || "Failed to send verification code.");
        return;
      }
      // Carry the whole form forward — the account is only created after
      // the OTP is confirmed on the next page.
      navigate("/register/verify-otp", { state: { ...form } });
    } catch (err) {
      setError("Network error. Please try again.");
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

          <label className="ww-field-label">First Name</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="Enter First Name"
            value={form.firstName}
            onChange={handleChange("firstName")}
          />

          <label className="ww-field-label">Last Name</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="Enter Last Name"
            value={form.lastName}
            onChange={handleChange("lastName")}
          />

          <label className="ww-field-label">School Email</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="Enter Student Email"
            value={form.schoolEmail}
            onChange={handleChange("schoolEmail")}
          />

          <label className="ww-field-label">
            Personal/Recovery Gmail 
          </label>
          <input
            type="email"
            className="ww-field-input"
            placeholder="Enter Gmail Account"
            value={form.recoveryEmail}
            onChange={handleChange("recoveryEmail")}
          />

          <label className="ww-field-label">Date of Birth (MM/DD/YYYY)</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="Enter Date of Birth"
            value={form.dob}
            onChange={handleChange("dob")}
          />

          <label className="ww-field-label">Cellphone Number</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="Enter Cellphone Number"
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
              placeholder="Enter Password"
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
              placeholder="Confirm Password"
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
            {loading ? 'Sending code...' : 'Register'}
          </button>
        </div>
      </main>
    </div>
  );
}