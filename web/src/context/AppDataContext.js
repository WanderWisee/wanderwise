import React, { createContext, useContext, useState } from "react";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  // Single source of truth for journal entries, shared across every
  // page (Profile, Guides, the journal detail view) — no more relying
  // on navigation state, which gets lost the moment you go anywhere
  // that didn't explicitly pass it along.
  const [journalEntries, setJournalEntries] = useState([]);

  const addJournalEntry = (entry) => {
    setJournalEntries((prev) => [entry, ...prev]);
  };

  // Shared profile name + email — so Settings' fields and the
  // Profile page's display always match, no matter which page you
  // edited them from.
  const [profileName, setProfileName] = useState("Rolando Hamburger");
  const [profileEmail, setProfileEmail] = useState("User150@gmail.com");
  const [profileAvatar, setProfileAvatar] = useState(null);

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