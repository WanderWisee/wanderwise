import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { notifyAuthChanged, useAppData } from "../context/AppDataContext";
import { useDialog } from "../context/DialogContext";
import "../App.css";

export default function NavbarMenu() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profileRole } = useAppData();
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close the dropdown when clicking anywhere outside of it.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goTo = (path, state) => {
    setOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  const handleLogout = async () => {
    setOpen(false);
    // Ask first, so a mis-click doesn't log the person out.
    const ok = await confirm(t("logoutConfirmMessage"), { confirmLabel: t("logout") });
    if (!ok) return;
    localStorage.removeItem("wanderwise_token");
    // Clears the previous account's profile/journals right away.
    notifyAuthChanged();
    // Everyone uses the same log in page.
    navigate("/login");
  };

  return (
    <div className="ww-menu-wrapper" ref={wrapperRef}>
      <span className="ww-menu-dropdown" onClick={() => setOpen((v) => !v)}>
        {t("menu")}
      </span>

      {open && (
        <div className="ww-menu-panel">
          {/* Role shortcuts: Admin panel / Teacher portal / student Classes */}
          {profileRole === "admin" && (
            <p className="ww-menu-item ww-menu-item-strong" onClick={() => goTo("/admin")}>
               {t("adminPanel")}
            </p>
          )}
          {profileRole === "teacher" && (
            <p className="ww-menu-item ww-menu-item-strong" onClick={() => goTo("/teacher")}>
               {t("teacherPortal")}
            </p>
          )}
          {profileRole === "student" && (
            <p className="ww-menu-item" onClick={() => goTo("/classes")}>
               {t("myClasses")}
            </p>
          )}
          <p className="ww-menu-item" onClick={() => goTo("/settings")}>
            {t("settingsTitle")}
          </p>
          {/* Trip history is for students only. */}
          {profileRole !== "teacher" && profileRole !== "admin" && (
            <p className="ww-menu-item" onClick={() => goTo("/history")}>
              {t("history")}
            </p>
          )}
          {/* Students only — for teachers and the admin the language is
              right in Settings, so no need for both. */}
          {profileRole === "student" && (
            <p
              className="ww-menu-item"
              onClick={() => goTo("/settings", { section: "preferences" })}
            >
              {t("language")}
            </p>
          )}
          <p className="ww-menu-item" onClick={handleLogout}>
            {t("logout")}
          </p>
        </div>
      )}
    </div>
  );
}