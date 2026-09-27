import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

export default function InviteCrewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const {
    destination = "",
    startDate = "",
    endDate = "",
    people = 0,
    tripState = null,
    returnPath = "/trip-plan",
    tripId = null,
  } = location.state || {};

  const authHeaders = () => {
    const token = localStorage.getItem("wanderwise_token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  // --- Share/invite link (backed by the trip's ShareToken) ---
  const [shareToken, setShareToken] = useState(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tripId) {
      setLoadingLink(false);
      return;
    }
    fetch(`/api/trips/${tripId}/share-link`, {
      method: "POST",
      headers: authHeaders(),
    })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => setShareToken(data?.shareToken || null))
      .catch(() => setShareToken(null))
      .finally(() => setLoadingLink(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const shareLink = shareToken ? `${window.location.origin}/trip-plan/join/${shareToken}` : "";

  const handleCopy = () => {
    if (!shareLink) return;
    navigator.clipboard?.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Search an existing student by name (same endpoint as Profile's
  // student search) and add them straight to this trip's crew. ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState(null);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`, {
          headers: authHeaders(),
        });
        const data = resp.ok ? await resp.json() : [];
        setSearchResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Crew list (owner + everyone who has joined) ---
  const [crew, setCrew] = useState([]);
  const [loadingCrew, setLoadingCrew] = useState(true);

  const loadCrew = () => {
    if (!tripId) {
      setLoadingCrew(false);
      return;
    }
    setLoadingCrew(true);
    fetch(`/api/trips/${tripId}/crew`, { headers: authHeaders() })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => setCrew(Array.isArray(data) ? data : []))
      .catch(() => setCrew([]))
      .finally(() => setLoadingCrew(false));
  };

  useEffect(() => {
    loadCrew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const handleAddStudent = async (studentUserId) => {
    if (!tripId) return;
    setAddingUserId(studentUserId);
    try {
      const resp = await fetch(`/api/trips/${tripId}/crew`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId: studentUserId }),
      });
      if (resp.ok) {
        setSearchQuery("");
        setSearchResults([]);
        setShowDropdown(false);
        loadCrew();
      }
    } catch (err) {
      console.warn("Failed to add crew member:", err);
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveCrew = async (memberId) => {
    if (!tripId) return;
    if (!window.confirm(t("confirmRemoveCrewMember"))) return;
    try {
      await fetch(`/api/trips/${tripId}/crew/${memberId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      loadCrew();
    } catch (err) {
      console.warn("Failed to remove crew member:", err);
    }
  };

  const handleBack = () => {
    navigate(returnPath, {
      state: { destination, startDate, endDate, people, restoredTripState: tripState },
    });
  };

  return (
    <div className="ww-invite-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">{t("navHome")}</a>
          <a href="/travel-tips">{t("navGuides")}</a>
          <a href="/hotels">{t("navHotels")}</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-invite-main">
        <h1 className="ww-invite-title" onClick={handleBack} style={{ cursor: "pointer" }}>
          ← {t("inviteYourCrew")}
        </h1>

        <div className="ww-invite-link-row">
          <span>🔗 {loadingLink ? t("loadingEllipsis") : shareLink || t("linkUnavailable")}</span>
          <button className="ww-copy-btn" onClick={handleCopy} disabled={!shareLink}>
            {copied ? t("linkCopied") : t("copy")}
          </button>
        </div>

        <div className="ww-invite-search-wrap" ref={searchBoxRef} style={{ position: "relative" }}>
          <input
            className="ww-invite-user-input"
            placeholder={`👤 ${t("searchForAStudent")}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          />
          {showDropdown && (
            <div className="ww-navbar-search-dropdown">
              {searching ? (
                <p className="ww-navbar-search-empty">{t("searching")}</p>
              ) : searchResults.length === 0 ? (
                <p className="ww-navbar-search-empty">{t("noStudentsFound")}</p>
              ) : (
                searchResults.map((r) => (
                  <div
                    key={r.id}
                    className="ww-navbar-search-result"
                    onClick={() => addingUserId === null && handleAddStudent(r.id)}
                    style={{
                      cursor: addingUserId === r.id ? "default" : "pointer",
                      opacity: addingUserId === r.id ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="ww-navbar-search-result-avatar"
                      style={r.avatarUrl ? { backgroundImage: `url(${r.avatarUrl})` } : undefined}
                    />
                    <span>{r.firstName} {r.lastName}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <h2 className="ww-builder-section-title" style={{ marginTop: 24 }}>
          {t("crewOnThisTrip")}
        </h2>
        {loadingCrew ? (
          <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
        ) : crew.length === 0 ? (
          <p className="ww-expense-empty">{t("noCrewYet")}</p>
        ) : (
          <div className="ww-crew-list">
            {crew.map((c) => (
              <div
                className="ww-crew-row"
                key={`${c.isOwner ? "owner" : "member"}-${c.userId}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}
              >
                <div
                  className="ww-navbar-search-result-avatar"
                  style={c.avatarUrl ? { backgroundImage: `url(${c.avatarUrl})` } : undefined}
                />
                <span>
                  {c.firstName} {c.lastName} {c.isOwner ? `(${t("tripOwner")})` : ""}
                </span>
                {!c.isOwner && (
                  <span
                    className="ww-cost-remove"
                    onClick={() => handleRemoveCrew(c.id)}
                    style={{ cursor: "pointer", marginLeft: "auto" }}
                    title={t("removeCrewMemberTitle")}
                  >
                    ✕
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}