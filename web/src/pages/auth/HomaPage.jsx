import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="wanderwise-home">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img
            src="/assets/logo.jpg"
            alt="WanderWise logo"
            className="ww-logo"
          />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav>
          <a href="#about" className="ww-nav-link">{t("aboutUs")}</a>
        </nav>
      </header>

      <main className="ww-hero">
        <h1 className="ww-hero-title">{t("homeHeroTitle")}</h1>
        <p className="ww-hero-subtitle">
          {t("homeHeroSubtitleLine1")}
          <br />
          {t("homeHeroSubtitleLine2")}
        </p>

        <hr className="ww-divider" />

        <div className="ww-actions">
          <button className="ww-login-btn" onClick={() => navigate("/login")}>{t("logIn")}</button>
          <button className="ww-signup-btn" onClick={() => navigate("/register")}>{t("signUp")}</button>
        </div>
      </main>
    </div>
  );
}