import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useAppData } from "../../context/AppDataContext";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useDialog } from "../../context/DialogContext";
import "../../App.css";
import Icon from "../../components/Icon";
import { passwordProblem } from "../../utils/validation";

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { alert, confirm } = useDialog();
  // Formatting + notification choices, saved to the account and used by
  // every page (dates, times, distances, and which notifications arrive).
  const { prefs, updatePrefs, formatDate, formatTime, formatDistance } = usePreferences();
  const [savedHint, setSavedHint] = useState("");

  const savePref = async (changes) => {
    const ok = await updatePrefs(changes);
    setSavedHint(ok ? t("settingSaved") : t("networkError"));
    setTimeout(() => setSavedHint(""), 2000);
  };
  const {
    profileName,
    profileEmail,
    profileAvatar,
    setProfileAvatar,
    profileBio,
    setProfileBio,
    profileLocation,
    setProfileLocation,
    profileRole,
  } = useAppData();
  // The admin only gets Preferences (language) — no student profile and no
  // notification settings.
  const isAdmin = profileRole === "admin";
  // Teachers: profile picture (name/email shown, not edited), language and
  // date/time format. No bio/location, distance or notification switches.
  const isTeacher = profileRole === "teacher";
  const avatarInputRef = useRef(null);

  const handleAvatarClick = () => avatarInputRef.current?.click();

  // Shrink the picture to max 512px JPEG before uploading, so a big phone
  // photo doesn't get rejected for size.
  const shrinkAvatar = (file, maxSide = 512) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => reject(new Error(""));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again
    if (!file) return;

    const token = localStorage.getItem("wanderwise_token");
    if (!token) return;

    const previous = profileAvatar;
    try {
      const base64 = await shrinkAvatar(file); // "data:image/jpeg;base64,...."
      setProfileAvatar(base64); // shows up immediately in the UI
      const resp = await fetch("/api/me/avatar", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarBase64: base64 }),
      });
      if (!resp.ok) {
        const d = await resp.json().catch(() => null);
        throw new Error(d?.error || d?.message || "");
      }
      alert(t("avatarUpdated"));
    } catch (err) {
      // Not saved — put the old picture back and say why.
      setProfileAvatar(previous);
      alert(err.message || t("avatarUpdateFailed"));
    }
  };

  const [chosenSection, setActiveSection] = useState(
    location.state?.section || "account"
  );
  const activeSection = isAdmin
    ? "preferences"
    : isTeacher && chosenSection === "notifications"
      ? "account"
      : chosenSection;
  const [name, setName] = useState(profileName);
  const [email, setEmail] = useState(profileEmail);
  const [bio, setBio] = useState(profileBio);
  const [profileLocationInput, setProfileLocationInput] = useState(profileLocation);
  const [savingAccount, setSavingAccount] = useState(false);

  // The profile loads from the server a moment after the page opens (and
  // changes when someone else logs in) — copy it into the boxes when it
  // arrives, instead of only once when the page first opened.
  useEffect(() => setName(profileName), [profileName]);
  useEffect(() => setEmail(profileEmail), [profileEmail]);
  useEffect(() => setBio(profileBio), [profileBio]);
  useEffect(() => setProfileLocationInput(profileLocation), [profileLocation]);

  // Only the notifications WanderWise actually sends. Each maps to one
  // saved setting.
  const notificationOptions = [
    { key: "notifTripReminders", hintKey: "notifTripRemindersHint" },
    { key: "notifTripInvites", hintKey: "notifTripInvitesHint" },
    { key: "notifComments", hintKey: "notifCommentsHint" },
    { key: "notifTripUpdates", hintKey: "notifTripUpdatesHint" },
  ];

  // ---- Delete my account (Data Privacy Act) ----
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert(t("deleteAccountNeedPassword"));
      return;
    }
    const ok = await confirm(t("deleteAccountConfirm"), { danger: true, confirmLabel: t("deleteAccountBtn") });
    if (!ok) return;
    setDeleting(true);
    try {
      const resp = await fetch("/api/me/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("wanderwise_token")}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (resp.ok) {
        localStorage.removeItem("wanderwise_token");
        await alert(t("deleteAccountDone"));
        window.location.href = "/";
        return;
      }
      const d = await resp.json().catch(() => null);
      alert(d?.error || t("deleteAccountFailed"));
    } catch {
      alert(t("networkError"));
    } finally {
      setDeleting(false);
    }
  };

  // ---- Change password (students, teachers and the admin) ----
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) return setPwError(t("valRequired"));
    const problem = passwordProblem(pwForm.next);
    if (problem) return setPwError(t(problem));
    if (pwForm.next !== pwForm.confirm) return setPwError(t("passwordsDontMatch"));
    if (pwForm.next === pwForm.current) return setPwError(t("passwordSameAsOld"));
    setChangingPw(true);
    try {
      const resp = await fetch("/api/me/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("wanderwise_token")}`,
        },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok) {
        // The old login stops working everywhere; keep this browser logged in.
        if (d?.token) localStorage.setItem("wanderwise_token", d.token);
        setPwForm({ current: "", next: "", confirm: "" });
        alert(t("passwordChangedMsg"));
      } else if (d?.code === "wrong_password") {
        setPwError(t("currentPasswordWrong"));
      } else {
        setPwError(d?.error || t("passwordChangeFailed"));
      }
    } catch {
      setPwError(t("networkError"));
    } finally {
      setChangingPw(false);
    }
  };

  const handleSaveAccount = async () => {
    // Bio/Location ARE wired to the backend — this is what shows up on
    // your public profile when another student searches for you.
    setProfileBio(bio);
    setProfileLocation(profileLocationInput);

    setSavingAccount(true);
    const token = localStorage.getItem("wanderwise_token");
    if (token) {
      try {
        const resp = await fetch("/api/me/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bio, location: profileLocationInput }),
        });
        if (resp.ok) {
          alert(t("profileSavedMsg"));
        } else {
          const d = await resp.json().catch(() => null);
          alert(d?.error || t("profileSaveFailed"));
        }
      } catch (err) {
        alert(t("networkError"));
      }
    }
    setSavingAccount(false);
  };

  return (
    <div className="ww-settings-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
          <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
        </div>
        <nav className="ww-nav-links">
          <Link to="/dashboard">{t("home")}</Link>
          <Link to="/travel-tips">{t("guides")}</Link>
          <Link to="/hotels">{t("hotels")}</Link>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}><Icon name="search" /></span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}><Icon name="bell" /></span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
            <Icon name="user" />
          </span>
        </div>
      </header>

      <div className="ww-settings-body">
        <aside className="ww-settings-sidebar">
          <div className="ww-settings-heading-row">
            <h1>{t("settingsTitle")}</h1>
            {activeSection !== "account" && !isAdmin && (
              <span
                className="ww-settings-back-arrow"
                onClick={() => setActiveSection("account")}
                style={{ cursor: "pointer" }}
              >
                <Icon name="arrow-left" />
              </span>
            )}
          </div>

          {!isAdmin && (
            <p
              className={`ww-settings-nav-item ${activeSection === "account" ? "active" : ""}`}
              onClick={() => setActiveSection("account")}
            >
              {t("settingsAccount")}
            </p>
          )}
          <p
            className={`ww-settings-nav-item ${activeSection === "preferences" ? "active" : ""}`}
            onClick={() => setActiveSection("preferences")}
          >
            {t("settingsPreferences")}
          </p>
          {!isAdmin && !isTeacher && (
            <p
              className={`ww-settings-nav-item ${activeSection === "notifications" ? "active" : ""}`}
              onClick={() => setActiveSection("notifications")}
            >
              {t("settingsNotifications")}
            </p>
          )}
        </aside>

        <main className="ww-settings-main">
          {activeSection === "account" && (
            <div className="ww-settings-account">
              <div className="ww-settings-avatar-wrapper">
                <div
                  className="ww-settings-avatar"
                  style={
                    profileAvatar
                      ? { backgroundImage: `url(${profileAvatar})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                />
                <span
                  className="ww-settings-avatar-edit"
                  onClick={handleAvatarClick}
                  style={{ cursor: "pointer" }}
                >
                  <Icon name="pencil" />
                </span>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </div>

              <label className="ww-settings-field">
                <span>{t("accountName")}</span>
                <input value={name} readOnly />
              </label>

              <label className="ww-settings-field">
                <span>{t("accountEmail")}</span>
                <input value={email} readOnly />
              </label>

              {/* Bio + location are for the student's public profile. */}
              {!isTeacher && (
              <>
              <label className="ww-settings-field">
                <span>{t("accountBio")}</span>
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("bioPlaceholder")}
                  maxLength={300}
                />
              </label>

              <label className="ww-settings-field">
                <span>{t("accountLocation")}</span>
                <input
                  value={profileLocationInput}
                  onChange={(e) => setProfileLocationInput(e.target.value)}
                  placeholder={t("locationPlaceholder")}
                  maxLength={150}
                />
              </label>

              <button className="ww-settings-save-btn" onClick={handleSaveAccount} disabled={savingAccount}>
                {savingAccount ? t("saving") : t("save")}
              </button>

              <div className="ww-danger-zone">
                <h3>{t("deleteAccountTitle")}</h3>
                <p>{t("deleteAccountHint")}</p>
                <input
                  type="password"
                  className="ww-field-input"
                  autoComplete="current-password"
                  placeholder={t("deleteAccountPassword")}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
                <button type="button" className="ww-danger-btn" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? t("saving") : t("deleteAccountBtn")}
                </button>
              </div>
              </>
              )}

              <form className="ww-password-zone" onSubmit={handleChangePassword}>
                <h3><Icon name="lock" /> {t("changePasswordTitle")}</h3>
                <p>{t("changePasswordHint")}</p>
                <input
                  type="password"
                  className="ww-field-input"
                  autoComplete="current-password"
                  placeholder={t("currentPassword")}
                  maxLength={100}
                  value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                />
                <input
                  type="password"
                  className="ww-field-input"
                  autoComplete="new-password"
                  placeholder={t("newPassword")}
                  maxLength={100}
                  value={pwForm.next}
                  onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                />
                <input
                  type="password"
                  className="ww-field-input"
                  autoComplete="new-password"
                  placeholder={t("confirmNewPassword")}
                  maxLength={100}
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                />
                {pwError && <p className="ww-password-error" role="alert">{pwError}</p>}
                <button type="submit" className="ww-settings-save-btn" disabled={changingPw}>
                  {changingPw ? t("saving") : t("changePasswordBtn")}
                </button>
              </form>
            </div>
          )}

          {activeSection === "preferences" && (
            <div className="ww-settings-preferences">
              <h2><Icon name="globe" /> {t("changeLanguage")}</h2>
              <div className="ww-settings-select-box">
                <span className="ww-settings-select-label">{t("changeLanguage")}</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="fil">Filipino</option>
                </select>
              </div>

              {/* Date/time/distance formats are for students and teachers —
                  the admin only picks a language. */}
              {!isAdmin && (
                <>
                  <h2>{t("formatting")}</h2>

                  <p className="ww-settings-field-label">{t("dateFormat")}</p>
                  <select
                    className="ww-settings-plain-select"
                    value={prefs.dateFormat}
                    onChange={(e) => savePref({ dateFormat: e.target.value })}
                  >
                    <option value="mdy">MM/DD/YYYY</option>
                    <option value="dmy">DD/MM/YYYY</option>
                  </select>

                  <p className="ww-settings-field-label">{t("timeFormat")}</p>
                  <select
                    className="ww-settings-plain-select"
                    value={prefs.timeFormat}
                    onChange={(e) => savePref({ timeFormat: e.target.value })}
                  >
                    <option value="12h">{t("hour12")}</option>
                    <option value="24h">{t("hour24")}</option>
                  </select>

                  {!isTeacher && (
                    <>
                      <p className="ww-settings-field-label">{t("distanceFormat")}</p>
                      <select
                        className="ww-settings-plain-select"
                        value={prefs.distanceFormat}
                        onChange={(e) => savePref({ distanceFormat: e.target.value })}
                      >
                        <option value="km">{t("kilometers")}</option>
                        <option value="mi">{t("miles")}</option>
                      </select>
                    </>
                  )}

                  {/* Live preview so the student sees the effect right away. */}
                  <p className="ww-settings-preview">
                    {t("formatPreview")}: {formatDate("2026-04-17")} · {formatTime("14:30")}
                    {!isTeacher && ` · ${formatDistance(2300)}`}
                  </p>
                </>
              )}
              {savedHint && <p className="ww-settings-saved">{savedHint}</p>}
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="ww-settings-notifications">
              <h2>{t("pushNotification")}</h2>
              {notificationOptions.map(({ key, hintKey }) => (
                <label className="ww-settings-notification-row" key={key}>
                  {/* A setting the account hasn't saved yet counts as ON. */}
                  <input
                    type="checkbox"
                    checked={prefs[key] !== false}
                    onChange={() => savePref({ [key]: prefs[key] === false })}
                  />
                  <span>
                    {t(key)}
                    <small className="ww-settings-notif-hint">{t(hintKey)}</small>
                  </span>
                </label>
              ))}
              {/* Security alerts can't be turned off. */}
              <p className="ww-settings-notif-always" style={{ fontSize: 13, opacity: 0.75, marginTop: 14 }}><Icon name="lock" /> {t("notifSecurityAlwaysOn")}</p>
              {savedHint && <p className="ww-settings-saved">{savedHint}</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}