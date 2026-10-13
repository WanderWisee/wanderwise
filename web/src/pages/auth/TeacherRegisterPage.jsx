import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { notifyAuthChanged } from "../../context/AppDataContext";
import { api } from "../../utils/portal";
import "../../App.css";

// Teacher sign-up: same steps as the student one (form → code sent to the
// personal email → confirm), with the faculty email and employee ID.
// No admin approval — the teacher is logged in and opens the Teacher portal.
const TEACHER_EMAIL = /^[^@\s]+@mseuf\.edu\.ph$/i;

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

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const sendCode = async () => {
    setError("");
    setInfo("");
    const missing = Object.entries(form).some(([, v]) => !String(v).trim());
    if (missing) return setError(t("registerErrFillAll"));
    if (!TEACHER_EMAIL.test(form.schoolEmail.trim())) return setError(t("teacherErrEmail"));
    if (form.password.length < 8) return setError(t("registerErrPasswordLength"));
    if (form.password !== form.confirmPassword) return setError(t("registerErrPasswordMismatch"));

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
    if (!otpCode.trim()) return setError(t("teacherErrCode"));
    setLoading(true);
    const r = await api("/api/register/teacher", {
      method: "POST",
      body: { ...form, otpCode: otpCode.trim() },
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
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
      </header>

      <main className="ww-register-wrapper">
        <div className="ww-register-card">
          <button
            type="button"
            className="ww-back-btn"
            aria-label="Go back"
            onClick={() => (step === "code" ? setStep("form") : navigate("/teacher/login"))}
          >
            ←
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
              <h1 className="ww-register-title">🎓 {t("teacherRegisterTitle")}</h1>
              <p className="ww-portal-muted">{t("teacherRegisterIntro")}</p>

              <label className="ww-field-label">{t("firstName")}</label>
              <input className="ww-field-input" value={form.firstName} onChange={handleChange("firstName")} placeholder={t("enterFirstName")} />

              <label className="ww-field-label">{t("lastName")}</label>
              <input className="ww-field-input" value={form.lastName} onChange={handleChange("lastName")} placeholder={t("enterLastName")} />

              <label className="ww-field-label">{t("employeeId")}</label>
              <input className="ww-field-input" value={form.employeeId} onChange={handleChange("employeeId")} placeholder={t("enterEmployeeId")} maxLength={20} />

              <label className="ww-field-label">{t("facultyEmail")}</label>
              <input className="ww-field-input" value={form.schoolEmail} onChange={handleChange("schoolEmail")} placeholder="juan.delacruz@mseuf.edu.ph" />

              <label className="ww-field-label">{t("recoveryEmailLabel")}</label>
              <input type="email" className="ww-field-input" value={form.recoveryEmail} onChange={handleChange("recoveryEmail")} placeholder={t("enterGmailAccount")} />

              <label className="ww-field-label">{t("dobLabel")}</label>
              <input type="date" className="ww-field-input" value={form.dob} onChange={handleChange("dob")} />

              <label className="ww-field-label">{t("cellphoneNumber")}</label>
              <input className="ww-field-input" value={form.cellphone} onChange={handleChange("cellphone")} placeholder={t("enterCellphoneNumber")} maxLength={15} />

              <label className="ww-field-label">{t("createPasswordLabel")}</label>
              <div className="ww-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  className="ww-field-input"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder={t("enterPassword")}
                />
                <button type="button" className="ww-password-icon" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "👁" : "🙈"}
                </button>
              </div>

              <label className="ww-field-label">{t("confirmPassword")}</label>
              <input
                type={showPassword ? "text" : "password"}
                className="ww-field-input"
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                placeholder={t("confirmPasswordPlaceholder")}
              />

              {error && <div className="ww-portal-error">{error}</div>}
              <button className="ww-register-submit" type="button" onClick={sendCode} disabled={loading}>
                {loading ? t("sendingCode") : t("teacherSendCode")}
              </button>
              <p className="ww-teacher-signup-link">
                {t("haveTeacherAccount")}{" "}
                <a href="/teacher/login" className="ww-bottom-link">{t("logIn")}</a>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
