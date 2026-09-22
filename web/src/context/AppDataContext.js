import React, { createContext, useContext, useState, useEffect } from "react";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [journalEntries, setJournalEntries] = useState([]);

  const addJournalEntry = (entry) => {
    setJournalEntries((prev) => [entry, ...prev]);
  };

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatar, setProfileAvatar] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token) return;

    fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => {
        if (!resp.ok) throw new Error("Failed to load profile");
        return resp.json();
      })
      .then((data) => {
        const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
        setProfileName(fullName || data.email || "");
        setProfileEmail(data.email || "");
        setProfileAvatar(data.avatarUrl || null);
      })
      .catch(() => {
        // Token missing/expired — leave fields blank.
      });
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        journalEntries,
        addJournalEntry,
        profileName,
        setProfileName,
        profileEmail,
        setProfileEmail,
        profileAvatar,
        setProfileAvatar,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return ctx;
}