import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../i18n/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem("wanderwise_language") || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("wanderwise_language", language);
    } catch {
      // Storage might be unavailable — language just won't persist.
    }
  }, [language]);

  const setLanguage = (lang) => {
    if (lang === "en" || lang === "fil") setLanguageState(lang);
  };

  // Looks up `key` in the current language's dictionary. Falls back to
  // English, then to the raw key itself, so a missing translation never
  // breaks the page — it just shows the untranslated key as a reminder
  // to add it.
  const t = (key) => {
    return translations[language]?.[key] ?? translations.en?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}