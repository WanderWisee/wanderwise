import React, { createContext, useContext, useState, useEffect } from "react";

const AppDataContext = createContext(null);

// The backend stores each journal entry as { id, title, coverImage, places: [...] }
// (places have placeName/imageUrl/pros:[{text}]/cons:[{text}]/hotels:[{name,description}]).
// The rest of the app (JournalViewPage, TravelTipsPage) was built against a
// simpler shape — { id, title, coverImage, entries: [...] } with plain string
// arrays for pros/cons — so we translate the server's shape into that shape
// once, right here, instead of touching every page that reads journalEntries.
function normalizeJournalEntry(serverEntry) {
  return {
    id: serverEntry.id,
    title: serverEntry.title,
    coverImage: serverEntry.coverImage,
    entries: (serverEntry.places || []).map((p) => ({
      id: p.id,
      place: p.placeName,
      img: p.imageUrl,
      rating: p.rating,
      description: p.description,
      pros: (p.pros || []).map((x) => x.text),
      cons: (p.cons || []).map((x) => x.text),
      hotels: (p.hotels || []).map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
      })),
    })),
  };
}

export function AppDataProvider({ children }) {
  const [journalEntries, setJournalEntries] = useState([]);

  // Load the user's existing journal posts from the database on startup,
  // instead of always starting from an empty list. Without this, every
  // posted journal (and its card in Guides) disappeared on refresh because
  // it only ever lived in this React state, never in the database.
  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token) return;

    fetch("/api/journal", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setJournalEntries(list.map(normalizeJournalEntry));
      })
      .catch(() => {
        // Leave journalEntries empty on failure — the rest of the app
        // already handles an empty list gracefully.
      });
  }, []);

  // Saves a new journal entry to the database, then adds the saved (now
  // normalized) entry to local state so it shows up immediately without
  // needing a full re-fetch. `payload` must match the backend's
  // CreateJournalEntryRequest shape: { title, coverImage, places: [...] }.
  const addJournalEntry = async (payload) => {
    const token = localStorage.getItem("wanderwise_token");
    const resp = await fetch("/api/journal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error("Failed to save journal entry");
    }

    const saved = await resp.json();
    const normalized = normalizeJournalEntry(saved);
    setJournalEntries((prev) => [normalized, ...prev]);
    return normalized;
  };

  const [profileUserId, setProfileUserId] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [profileBio, setProfileBio] = useState("");
  const [profileLocation, setProfileLocation] = useState("");

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
        setProfileUserId(data.userId ?? null);
        setProfileName(fullName || data.email || "");
        setProfileEmail(data.email || "");
        setProfileAvatar(data.avatarUrl || null);
        setProfileBio(data.bio || "");
        setProfileLocation(data.location || "");
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
        profileUserId,
        profileName,
        setProfileName,
        profileEmail,
        setProfileEmail,
        profileAvatar,
        setProfileAvatar,
        profileBio,
        setProfileBio,
        profileLocation,
        setProfileLocation,
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