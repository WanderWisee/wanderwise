import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";
import Icon from "../../components/Icon";

// Welcome page. One long page: hero, features, who it's for, how it works
// and About Us (same text as the mobile app's About screen). The top links
// only scroll to those sections.
const FEATURES = [
  ["calendar", "lpFeatItinerary", "lpFeatItineraryText"],
  ["map", "lpFeatMap", "lpFeatMapText"],
  ["wallet", "lpFeatBudget", "lpFeatBudgetText"],
  ["users", "lpFeatCrew", "lpFeatCrewText"],
  ["map-pin", "lpFeatTour", "lpFeatTourText"],
  ["book-open", "lpFeatJournal", "lpFeatJournalText"],
];

const AUDIENCE = [
  ["backpack", "lpForStudents", "lpForStudentsText"],
  ["graduation-cap", "lpForTeachers", "lpForTeachersText"],
  ["shield", "lpForAdmin", "lpForAdminText"],
];

const STEPS = [
  ["lpStep1", "lpStep1Text"],
  ["lpStep2", "lpStep2Text"],
  ["lpStep3", "lpStep3Text"],
  ["lpStep4", "lpStep4Text"],
];

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="wanderwise-home ww-landing">
      <header className="ww-navbar ww-lp-nav">
        <a className="ww-brand" href="#top">
          <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
          <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
        </a>
        <nav className="ww-lp-links" aria-label={t("lpSections")}>
          <a href="#features">{t("lpNavFeatures")}</a>
          <a href="#who">{t("lpNavWho")}</a>
          <a href="#how">{t("lpNavHow")}</a>
          <a href="#about">{t("aboutUs")}</a>
        </nav>
        <div className="ww-lp-nav-actions">
          <button type="button" className="ww-lp-text-btn" onClick={() => navigate("/login")}>
            {t("logIn")}
          </button>
          <button type="button" className="ww-signup-btn ww-lp-nav-cta" onClick={() => navigate("/register")}>
            {t("signUp")}
          </button>
        </div>
      </header>

      <main id="top">
        {/* ---- Hero ---- */}
        <section className="ww-lp-hero">
          <div className="ww-lp-hero-copy">
            <p className="ww-lp-eyebrow">{t("lpEyebrow")}</p>
            <h1 className="ww-lp-title">{t("lpTitle")}</h1>
            <p className="ww-lp-lead">{t("lpLead")}</p>
            <div className="ww-lp-ctas">
              <button type="button" className="ww-signup-btn" onClick={() => navigate("/register")}>
                {t("signUp")}
              </button>
              <button type="button" className="ww-login-btn" onClick={() => navigate("/login")}>
                {t("logIn")}
              </button>
            </div>
            <p className="ww-lp-note">
              {t("lpTeacherNote")}{" "}
              <a href="/register/teacher">{t("registerAsTeacher")}</a>
            </p>
          </div>

          <figure className="ww-lp-preview">
            <AppPreview />
            <figcaption>{t("lpPreviewCaption")}</figcaption>
          </figure>
        </section>

        {/* ---- Features ---- */}
        <section id="features" className="ww-lp-section">
          <p className="ww-lp-eyebrow">{t("lpNavFeatures")}</p>
          <h2 className="ww-lp-h2">{t("lpFeaturesTitle")}</h2>
          <p className="ww-lp-sub">{t("lpFeaturesSub")}</p>
          <div className="ww-lp-grid">
            {FEATURES.map(([icon, title, text]) => (
              <article key={title} className="ww-lp-card">
                <span className="ww-lp-icon" aria-hidden="true"><Icon name={icon} /></span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---- Who it's for ---- */}
        <section id="who" className="ww-lp-section">
          <p className="ww-lp-eyebrow">{t("lpNavWho")}</p>
          <h2 className="ww-lp-h2">{t("lpWhoTitle")}</h2>
          <div className="ww-lp-grid ww-lp-grid-3">
            {AUDIENCE.map(([icon, title, text]) => (
              <article key={title} className="ww-lp-card ww-lp-card-who">
                <span className="ww-lp-icon" aria-hidden="true"><Icon name={icon} /></span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section id="how" className="ww-lp-section">
          <p className="ww-lp-eyebrow">{t("lpNavHow")}</p>
          <h2 className="ww-lp-h2">{t("lpHowTitle")}</h2>
          <ol className="ww-lp-steps">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <span className="ww-lp-step-no">{i + 1}</span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- About Us (same content as the mobile app) ---- */}
        <section id="about" className="ww-lp-section ww-lp-about">
          <div className="ww-lp-about-head">
            <span className="ww-lp-about-badge" aria-hidden="true"><Icon name="compass" /></span>
            <p className="ww-lp-eyebrow">{t("aboutUs")}</p>
            <h2 className="ww-lp-h2">WanderWise</h2>
            <p className="ww-lp-sub">Your travel companion for smarter trips</p>
          </div>
          <div className="ww-lp-about-grid">
            <div className="ww-lp-about-item">
              <h3>What is WanderWise?</h3>
              <p>
                WanderWise is a synchronized web and mobile travel itinerary management system built for
                Tourism Management students and faculty. It helps you plan academic tours and field
                activities with day-by-day scheduling, map-based route visualization, and group
                collaboration.
              </p>
            </div>
            <div className="ww-lp-about-item">
              <h3>Our Mission</h3>
              <p>
                We built WanderWise to take the stress out of planning student travel — replacing
                scattered spreadsheets and group chats with one shared space where everyone stays on the
                same page.
              </p>
            </div>
            <div className="ww-lp-about-item">
              <h3>About This Project</h3>
              <p>WanderWise is a capstone project developed for the Tourism Management program, 2026.</p>
            </div>
            <div className="ww-lp-about-item">
              <h3>The Team</h3>
              <ul className="ww-lp-team">
                <li>Reuven Reyes</li>
                <li>Geilonn Romulo</li>
                <li>Niel Deo Villaverde</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---- Last call to action ---- */}
        <section className="ww-lp-band">
          <h2>{t("lpBandTitle")}</h2>
          <p>{t("lpBandText")}</p>
          <div className="ww-lp-ctas">
            <button type="button" className="ww-lp-band-primary" onClick={() => navigate("/register")}>
              {t("signUp")}
            </button>
            <button type="button" className="ww-lp-band-secondary" onClick={() => navigate("/login")}>
              {t("logIn")}
            </button>
          </div>
        </section>
      </main>

      <footer className="ww-lp-footer">
        <span>© 2026 WanderWise</span>
        <span>{t("lpFooter")}</span>
      </footer>
    </div>
  );
}

// A small picture of the app made with plain HTML (sample data), so the
// hero shows what WanderWise looks like without needing a screenshot.
function AppPreview() {
  return (
    <div className="ww-lp-window" aria-hidden="true">
      <div className="ww-lp-window-bar">
        <span /><span /><span />
      </div>
      <div className="ww-lp-app-top">
        <img src="/assets/brand/logo.png" alt="" />
        <strong>Trip to Batangas</strong>
        <em>● Saved</em>
      </div>
      <div className="ww-lp-app-body">
        <div className="ww-lp-map">
          <svg viewBox="0 0 300 150" preserveAspectRatio="none">
            <path d="M30 120 C 80 40, 140 130, 190 70 S 260 40, 275 30" />
          </svg>
          <i style={{ left: "10%", top: "80%" }}>1</i>
          <i style={{ left: "62%", top: "46%" }}>2</i>
          <i style={{ left: "91%", top: "20%" }}>3</i>
        </div>
        <div className="ww-lp-day">
          <p className="ww-lp-day-title">Day 1 · Fri, Nov 6</p>
          <ul>
            <li><b>6:00 AM</b> MSEUF Main Gate <span className="ok"><Icon name="check" /> 18/20 checked in</span></li>
            <li><b>9:30 AM</b> Anilao Port</li>
            <li><b>12:00 PM</b> Lomi House</li>
          </ul>
        </div>
        <div className="ww-lp-budget">
          <span>Budget</span>
          <strong>₱4,500 / ₱5,000</strong>
          <div className="ww-lp-bar"><span style={{ width: "90%" }} /></div>
        </div>
      </div>
    </div>
  );
}
