import React from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";
import Icon from "../../components/Icon";

// Privacy Notice (Philippine Data Privacy Act of 2012, RA 10173).
// Shown before sign-up; students and teachers must agree to it.
export const PRIVACY_SECTIONS = [
  ["Who we are",
    "WanderWise is a capstone project of Manuel S. Enverga University Foundation (MSEUF) tourism students. It helps students and teachers plan educational trips and field activities."],
  ["What we collect",
    "Name, school email, personal (recovery) email, date of birth, mobile number, student number or employee ID, profile photo and bio (optional), your trips, budgets and expenses, travel stories and comments, and — only on Tour Day check-in — your location and a photo."],
  ["Why we collect it",
    "To create and secure your account (email code, password reset), to let you plan and share trips with your crew, to send trip reminders and announcements, and to let your teacher monitor class trips and attendance."],
  ["Who can see it",
    "Your crew sees the trips you share with them. Teachers see only the students who joined their class with the class code: their trips, budgets, attendance and check-in photos/locations. Teachers do not see your mobile number. Other students only see your public profile (name, photo, bio, stories). The admin can manage accounts and hide inappropriate posts."],
  ["How we protect it",
    "Passwords and email codes are stored encrypted (hashed), all connections use HTTPS, accounts lock after repeated wrong passwords, and only signed-in users can open private data."],
  ["How long we keep it",
    "We keep your data while your account exists. When you delete your account, your profile, trips, stories and check-ins are permanently removed."],
  ["Your rights",
    "Under RA 10173 you can access and correct your data (Settings → Account), withdraw consent and delete your account at any time (Settings → Delete my account), and ask us questions or file a concern."],
  ["Contact",
    "WanderWise Team — wanderwise.mseuf@gmail.com"],
];

export default function PrivacyPage() {
  const navigate = useNavigate();
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"));
  return (
    <div className="wanderwise-register">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
          <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
        </div>
      </header>
      <main className="ww-register-wrapper">
        <div className="ww-register-card ww-privacy-card">
          <button type="button" className="ww-back-btn" aria-label="Go back" onClick={back}>
            <Icon name="arrow-left" />
          </button>
          <h1 className="ww-register-title">Privacy Notice</h1>
          <p className="ww-field-hint">Last updated: October 2026</p>
          {PRIVACY_SECTIONS.map(([title, body]) => (
            <section key={title} className="ww-privacy-section">
              <h2>{title}</h2>
              <p>{body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
