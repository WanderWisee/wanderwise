import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";
import Icon from "../../components/Icon";
import {
  dobLimits,
  keepDigits,
  keepEmail,
  keepNameChars,
  liveErrors,
  registrationErrors,
} from "../../utils/validation";

// Student sign-up. Every field is checked here first (letters only for
// names, 11-digit 09 mobile number, calendar for the birthday, strong
// password) and the backend checks the same rules again.
const FILTERS = {
  firstName: keepNameChars,
  lastName: keepNameChars,
  schoolEmail: keepEmail,
  recoveryEmail: keepEmail,
  cellphone: (v) => keepDigits(v, 11),
};

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
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [dobBad, setDobBad] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const limits = dobLimits();

  // Every change is checked right away (not only when Register is
  // pressed), so a wrong birthday or number shows its message at once.
  const handleChange = (field) => (e) => {
    const filter = FILTERS[field];
    const value = filter ? filter(e.target.value) : e.target.value;
    const nextForm = { ...form, [field]: value };
    const nextTouched = { ...touched, [field]: true };
    if (field === "password" && form.confirmPassword) nextTouched.confirmPassword = true;
    setForm(nextForm);
    setTouched(nextTouched);
    const found = liveErrors(nextForm, nextTouched);
    // A half-typed date (e.g. 02/30/____) reaches us as "", so ask the
    // browser whether what's in the box is a real date.
    const badDate = field === "dob" ? !!e.target.validity?.badInput : dobBad;
    if (field === "dob") setDobBad(badDate);
    if (badDate) found.dob = "valDobInvalid";
    setErrors(found);
    setError("");
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const fieldClass = (field) => `ww-field-input${errors[field] ? " has-error" : ""}`;
  const fieldError = (field) =>
    errors[field] ? (
      <div className="ww-field-error" role="alert">
        {t(errors[field])}
      </div>
    ) : null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    const found = registrationErrors(form);
    if (dobBad) found.dob = "valDobInvalid";
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setError(t("valFixFields"));
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
      navigate("/register/verify-otp", {
        state: {
          ...form,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          schoolEmail: form.schoolEmail.trim(),
          recoveryEmail: form.recoveryEmail.trim(),
        },
      });
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
          <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
          <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
        </div>
      </header>

      <main className="ww-register-wrapper">
        <form className="ww-register-card" onSubmit={handleSubmit} noValidate>
          <button
            type="button"
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => navigate("/")}
          >
            <Icon name="arrow-left" />
          </button>

          <h1 className="ww-register-title">{t("registerTitle")}</h1>

          <label className="ww-field-label" htmlFor="reg-first">{t("firstName")}</label>
          <input
            id="reg-first"
            type="text"
            autoComplete="given-name"
            maxLength={50}
            className={fieldClass("firstName")}
            placeholder={t("enterFirstName")}
            value={form.firstName}
            onChange={handleChange("firstName")}
          />
          {fieldError("firstName")}

          <label className="ww-field-label" htmlFor="reg-last">{t("lastName")}</label>
          <input
            id="reg-last"
            type="text"
            autoComplete="family-name"
            maxLength={50}
            className={fieldClass("lastName")}
            placeholder={t("enterLastName")}
            value={form.lastName}
            onChange={handleChange("lastName")}
          />
          {fieldError("lastName")}

          <label className="ww-field-label" htmlFor="reg-school">{t("schoolEmail")}</label>
          <input
            id="reg-school"
            type="email"
            autoComplete="username"
            className={fieldClass("schoolEmail")}
            placeholder={t("enterStudentEmail")}
            value={form.schoolEmail}
            onChange={handleChange("schoolEmail")}
          />
          {fieldError("schoolEmail")}

          <label className="ww-field-label" htmlFor="reg-recovery">{t("recoveryEmailLabel")}</label>
          <input
            id="reg-recovery"
            type="email"
            autoComplete="email"
            className={fieldClass("recoveryEmail")}
            placeholder={t("enterGmailAccount")}
            value={form.recoveryEmail}
            onChange={handleChange("recoveryEmail")}
          />
          {fieldError("recoveryEmail")}

          <label className="ww-field-label" htmlFor="reg-dob">{t("dobLabel")}</label>
          <input
            id="reg-dob"
            type="date"
            autoComplete="bday"
            min={limits.min}
            max={limits.max}
            className={`${fieldClass("dob")} ww-date-field`}
            value={form.dob}
            onChange={handleChange("dob")}
          />
          {fieldError("dob")}

          <label className="ww-field-label" htmlFor="reg-phone">{t("cellphoneNumber")}</label>
          <input
            id="reg-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={11}
            className={fieldClass("cellphone")}
            placeholder={t("valPhoneHint")}
            value={form.cellphone}
            onChange={handleChange("cellphone")}
          />
          {fieldError("cellphone")}

          <label className="ww-field-label" htmlFor="reg-password">{t("createPasswordLabel")}</label>
          <div className="ww-password-field">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              maxLength={100}
              className={fieldClass("password")}
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
              <Icon name={showPassword ? "eye" : "eye-off"} />
            </button>
          </div>
          {fieldError("password") || <div className="ww-field-hint">{t("valPasswordHint")}</div>}

          <label className="ww-field-label" htmlFor="reg-confirm">{t("confirmPassword")}</label>
          <div className="ww-password-field">
            <input
              id="reg-confirm"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              maxLength={100}
              className={fieldClass("confirmPassword")}
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
              <Icon name={showConfirmPassword ? "eye" : "eye-off"} />
            </button>
          </div>
          {fieldError("confirmPassword")}

          {error && <div className="ww-portal-error" role="alert">{error}</div>}
          <button className="ww-register-submit" type="submit" disabled={loading || hasErrors}>
            {loading ? t("sendingCode") : t("register")}
          </button>
        </form>
      </main>
    </div>
  );
}
