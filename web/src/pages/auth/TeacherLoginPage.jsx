import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { notifyAuthChanged } from "../../context/AppDataContext";
import "../../App.css";
import Icon from "../../components/Icon";

// Teacher login (/teacher/login) — separate from the student login.
// Only teacher accounts get in here; students are sent back to /login.
export default function TeacherLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError(t("loginErrEmpty"));
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, portal: "teacher" }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(
          data?.code === "use_student_login" ? t("useStudentLogin")
          : data?.code === "use_admin_login" ? t("useAdminLogin")
          : data?.error || t("loginErrFailed")
        );
        return;
      }
      if (data?.token) {
        localStorage.setItem("wanderwise_token", data.token);
        notifyAuthChanged();
      }
      navigate("/teacher");
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wanderwise-login">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
      </header>

      <main className="ww-login-wrapper">
        <form className="ww-login-card" onSubmit={handleLogin}>
          <button type="button" className="ww-back-btn" aria-label="Go back" onClick={() => navigate("/")}>
            <Icon name="arrow-left" />
          </button>

          
          <h1 className="ww-login-title">{t("teacherLoginTitle")}</h1>

          <label className="ww-field-label">{t("facultyEmail")}</label>
          <input
            type="text"
            className="ww-field-input"
            placeholder="Enter Faculty Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />

          <label className="ww-field-label">{t("password")}</label>
          <div className="ww-password-field">
            <input
              type={showPassword ? "text" : "password"}
              className="ww-field-input"
              placeholder={t("enterPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

          {error && <div className="ww-portal-error" style={{ marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="ww-login-submit" disabled={loading}>
            {loading ? t("loggingIn") : t("logIn")}
          </button>

          <div className="ww-links-row">
            <a href="/forgot-password?for=teacher" className="ww-bottom-link">
              {t("forgotPassword")}
            </a>
            <a href="/register/teacher" className="ww-bottom-link">
              {t("registerAsTeacher")}
            </a>
          </div>
          <p className="ww-teacher-signup-link">
            {t("areYouStudent")}{" "}
            <a href="/login" className="ww-bottom-link">{t("studentLoginHere")}</a>
          </p>
        </form>
      </main>
    </div>
  );
}
