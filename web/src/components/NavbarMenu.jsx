import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "../App.css";

export default function NavbarMenu() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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

  const handleLogout = () => {
    setOpen(false);
    localStorage.removeItem("wanderwise_token");
    navigate("/login");
  };

  return (
    <div className="ww-menu-wrapper" ref={wrapperRef}>
      <span className="ww-menu-dropdown" onClick={() => setOpen((v) => !v)}>
        {t("menu")}
      </span>

      {open && (
        <div className="ww-menu-panel">
          <p className="ww-menu-item" onClick={() => goTo("/settings")}>
            {t("settingsTitle")}
          </p>
          <p className="ww-menu-item" onClick={() => goTo("/history")}>
            {t("history")}
          </p>
          <p
            className="ww-menu-item"
            onClick={() => goTo("/settings", { section: "preferences" })}
          >
            {t("language")}
          </p>
          <p className="ww-menu-item" onClick={handleLogout}>
            {t("logout")}
          </p>
        </div>
      )}
    </div>
  );
}