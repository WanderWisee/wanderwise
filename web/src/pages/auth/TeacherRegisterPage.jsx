import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { notifyAuthChanged } from "../../context/AppDataContext";
import { api } from "../../utils/portal";
import "../../App.css";
import Icon from "../../components/Icon";
import {
  dobLimits,
  keepDigits,
  keepEmail,
  keepEmployeeId,
  keepNameChars,
  liveErrors,
  registrationErrors,
} from "../../utils/validation";

// Teacher sign-up: same steps as the student one (form → code sent to the
// faculty email → confirm), with the faculty email and employee ID.
// No admin approval — the teacher is logged in and opens the Teacher portal.
const FILTERS = {
  firstName: keepNameChars,
  lastName: keepNameChars,
  employeeId: keepEmployeeId,
  schoolEmail: keepEmail,
  recoveryEmail: keepEmail,
  cellphone: (v) => keepDigits(v, 11),
};

export default function TeacherRegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [step, setStep] = useState("form"); // form → code
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    schoolEmail: "",
    recoveryEmail: "",
    dob: "",
    cellphone: "",
    password: "",
    confirmPassword: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState({});
  const [dobBad, setDobBad] = useState(false);
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
    const found = liveErrors(nextForm, nextTouched, { teacher: true });
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

  const sendCode = async () => {
    setError("");
    setInfo("");
    const found = registrationErrors(form, { teacher: true });
    if (dobBad) found.dob = "valDobInvalid";
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    setErrors(found);
    if (Object.keys(found).length > 0) return setError(t("valFixFields"));
    if (!agreed) return setError(t("consentRequired"));

    setLoading(true);
    const r = await api("/api/register/teacher/send-otp", {
      method: "POST",
      body: {
        schoolEmail: form.schoolEmail.trim(),
        recoveryEmail: form.recoveryEmail.trim(),
        employeeId: form.employeeId.trim(),
      },
    });
    setLoading(false);
    if (!r.ok) return setError(r.data?.error || (r.status === 0 ? t("networkError") : t("registerErrSendOtp")));
    setStep("code");
    setInfo(t("teacherCodeSent"));
  };

  const finish = async () => {
    setError("");
    if (!/^\d{6}$/.test(otpCode)) return setError(t("valOtp"));
    setLoading(true);
    const r = await api("/api/register/teacher", {
      method: "POST",
      body: {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        schoolEmail: form.schoolEmail.trim(),
        recoveryEmail: form.recoveryEmail.trim(),
        otpCode: otpCode.trim(),
        acceptedPrivacy: agreed,
      },
    });
    setLoading(false);
    if (!r.ok) return setError(r.data?.error || t("networkError"));
    if (r.data?.token) {
      localStorage.setItem("wanderwise_token", r.data.token);
      notifyAuthChanged();
    }
    navigate("/teacher");
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
        <div className="ww-register-card">
          <button
            type="button"
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => (step === "code" ? setStep("form") : navigate("/login"))}
          >
            <Icon name="arrow-left" />
          </button>

          {step === "code" ? (
            <>
              <h1 className="ww-register-title">{t("verifyEmailTitle")}</h1>
              {info && <p className="ww-portal-muted">{info}</p>}
              <label className="ww-field-label">{t("verificationCode")}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="ww-field-input"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              />
              {error && <div className="ww-portal-error">{error}</div>}
              <button className="ww-register-submit" type="button" onClick={finish} disabled={loading}>
                {loading ? t("savingEllipsis") : t("teacherCreateAccount")}
              </button>
              <p className="ww-teacher-signup-link">
                <button type="button" className="ww-link-btn" onClick={sendCode} disabled={loading}>
                  {t("teacherResendCode")}
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="ww-register-title"> {t("teacherRegisterTitle")}</h1>
              <p className="ww-portal-muted">{t("teacherRegisterIntro")}</p>

              <label className="ww-field-label">{t("firstName")}</label>
              <input className={fieldClass("firstName")} autoComplete="given-name" maxLength={50} value={form.firstName} onChange={handleChange("firstName")} placeholder={t("enterFirstName")} />
              {fieldError("firstName")}

              <label className="ww-field-label">{t("lastName")}</label>
              <input className={fieldClass("lastName")} autoComplete="family-name" maxLength={50} value={form.lastName} onChange={handleChange("lastName")} placeholder={t("enterLastName")} />
              {fieldError("lastName")}

              <label className="ww-field-label">{t("employeeId")}</label>
              <input className={fieldClass("employeeId")} value={form.employeeId} onChange={handleChange("employeeId")} placeholder={t("enterEmployeeId")} maxLength={20} />
              {fieldError("employeeId")}

              <label className="ww-field-label">{t("facultyEmail")}</label>
              <input type="email" autoComplete="username" className={fieldClass("schoolEmail")} value={form.schoolEmail} onChange={handleChange("schoolEmail")} placeholder="juan.delacruz@mseuf.edu.ph" />
              {fieldError("schoolEmail")}

              <label className="ww-field-label">{t("recoveryEmailLabel")}</label>
              <input type="email" autoComplete="email" className={fieldClass("recoveryEmail")} value={form.recoveryEmail} onChange={handleChange("recoveryEmail")} placeholder={t("enterGmailAccount")} />
              {fieldError("recoveryEmail")}

              <label className="ww-field-label">{t("dobLabel")}</label>
              <input type="date" autoComplete="bday" min={limits.min} max={limits.max} className={`${fieldClass("dob")} ww-date-field`} value={form.dob} onChange={handleChange("dob")} />
              {fieldError("dob")}

              <label className="ww-field-label">{t("cellphoneNumber")}</label>
              <input type="tel" inputMode="numeric" autoComplete="tel" className={fieldClass("cellphone")} value={form.cellphone} onChange={handleChange("cellphone")} placeholder={t("valPhoneHint")} maxLength={11} />
              {fieldError("cellphone")}

              <label className="ww-field-label">{t("createPasswordLabel")}</label>
              <div className="ww-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  maxLength={100}
                  className={fieldClass("password")}
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder={t("enterPassword")}
                />
                <button type="button" className="ww-password-icon" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>
                  <Icon name={showPassword ? "eye" : "eye-off"} />
                </button>
              </div>
              {fieldError("password") || <div className="ww-field-hint">{t("valPasswordHint")}</div>}

              <label className="ww-field-label">{t("confirmPassword")}</label>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                maxLength={100}
                className={fieldClass("confirmPassword")}
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                placeholder={t("confirmPasswordPlaceholder")}
              />
              {fieldError("confirmPassword")}

              <label className="ww-consent">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); setError(""); }}
                />
                <span>
                  {t("consentAgree")}{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">{t("privacyNotice")}</a>
                </span>
              </label>

              {error && <div className="ww-portal-error">{error}</div>}
              <button className="ww-register-submit" type="button" onClick={sendCode} disabled={loading || hasErrors}>
                {loading ? t("sendingCode") : t("teacherSendCode")}
              </button>
              <p className="ww-teacher-signup-link">
                {t("haveTeacherAccount")}{" "}
                <a href="/login" className="ww-bottom-link">{t("logIn")}</a>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
