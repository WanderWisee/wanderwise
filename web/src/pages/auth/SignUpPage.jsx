import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
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
  const { t } = useLanguage();
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
      setError(t("registerErrFillAll"));
      return;
    }
    if (!/^[^@\s]+@student\.mseuf\.edu\.ph$/i.test(form.schoolEmail.trim())) {
      setError(t("registerErrSchoolEmail"));
      return;
    }
    if (form.password.length < 8) {
      setError(t("registerErrPasswordLength"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t("registerErrPasswordMismatch"));
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
        setError(data?.error || t("registerErrSendOtp"));
        return;
      }
      // Carry the whole form forward — the account is only created after
      // the OTP is confirmed on the next page.
      navigate("/register/verify-otp", { state: { ...form } });
    } catch (err) {
      setError(t("networkError"));
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

          <h1 className="ww-register-title">{t("registerTitle")}</h1>

          <label className="ww-field-label">{t("firstName")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder={t("enterFirstName")}
            value={form.firstName}
            onChange={handleChange("firstName")}
          />

          <label className="ww-field-label">{t("lastName")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder={t("enterLastName")}
            value={form.lastName}
            onChange={handleChange("lastName")}
          />

          <label className="ww-field-label">{t("schoolEmail")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder={t("enterStudentEmail")}
            value={form.schoolEmail}
            onChange={handleChange("schoolEmail")}
          />

          <label className="ww-field-label">
            {t("recoveryEmailLabel")}
          </label>
          <input
            type="email"
            className="ww-field-input"
            placeholder={t("enterGmailAccount")}
            value={form.recoveryEmail}
            onChange={handleChange("recoveryEmail")}
          />

          <label className="ww-field-label">{t("dobLabel")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder={t("enterDob")}
            value={form.dob}
            onChange={handleChange("dob")}
          />

          <label className="ww-field-label">{t("cellphoneNumber")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder={t("enterCellphoneNumber")}
            value={form.cellphone}
            onChange={handleChange("cellphone")}
          />

          <label className="ww-field-label">
            {t("createPasswordLabel")}
          </label>
          <div className="ww-password-field">
            <input
              type={showPassword ? "text" : "password"}
              className="ww-field-input"
              placeholder={t("enterPassword")}
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

          <label className="ww-field-label">{t("confirmPassword")}</label>
          <div className="ww-password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="ww-field-input"
              placeholder={t("confirmPasswordPlaceholder")}
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
            {loading ? t("sendingCode") : t("register")}
          </button>
        </div>
      </main>
    </div>
  );
}