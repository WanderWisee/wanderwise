import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

function formatLastViewed(dateString, t) {
  // The backend sends UTC time but without the "Z" suffix, so JS parses it
  // as local time by default — this forces it to be read as UTC first,
  // then converts properly to the browser's local timezone for display.
  const utcDateString = dateString.endsWith("Z") ? dateString : dateString + "Z";
  const date = new Date(utcDateString);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${time} ${t("today")}`;
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// The trip's actual travel dates (when the trip is/was happening), not
// when someone last opened the page. Sent as plain "yyyy-MM-dd" strings
// with no time-of-day component, so no UTC/local conversion is needed
// here — unlike lastViewed, which is a full timestamp.
//
// Always spells out the full month name and year (e.g. "January 1, 2026"
// or "January 1 - 3, 2026") instead of a short "Sep 20 - 22" — trips can
// span different months or even different years, so the year needs to
// always be visible, not just implied as "this year".
function formatTravelDate(startDate, endDate, t) {
  if (!startDate) return "";
  const start = new Date(startDate + "T00:00:00");
  if (!endDate || endDate === startDate) {
    return start.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  }
  const end = new Date(endDate + "T00:00:00");
  const sameMonthAndYear =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonthAndYear) {
    // "January 1 - 3, 2026" — month spelled out once, just the day repeated.
    const monthDay = start.toLocaleDateString([], { month: "long", day: "numeric" });
    return `${monthDay} - ${end.getDate()}, ${start.getFullYear()}`;
  }

  // Different month and/or year — spell out both fully, e.g.
  // "January 30 - February 2, 2026".
  const startText = start.toLocaleDateString([], { month: "long", day: "numeric" });
  const endText = end.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  return `${startText} - ${endText}`;
}

// Everyone ELSE who's viewed this trip (the backend already excludes
// your own entry — you're shown as the Author on the main row instead)
// — tagged "Owner" for the trip's real owner (so their last-viewed time
// is visible even from a crew member's account, not just folded
// silently into the Author name with no timestamp of its own), or
// "Invited" for any other crew member.
function viewerTag(v, t) {
  if (v.isOwner) return t("historyOwnerTag");
  return t("historyInvitedTag");
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => setHistoryItems(Array.isArray(data) ? data : []))
      .catch(() => setHistoryItems([]))
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = (item) => {
    if (item.type === "Trip") {
      navigate(`/trip-plan?tripId=${item.id}`);
    } else {
      navigate(`/journal/view/${item.id}`);
    }
  };

  return (
    <div className="ww-history-page">
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

      <main className="ww-history-main">
        <h1 className="ww-history-title">{t("historyTitle")}</h1>

        <div className="ww-history-table">
          <div className="ww-history-header-row">
            <span className="ww-history-col-title">{t("historyColTitle")}</span>
            <span className="ww-history-col-type">{t("historyColType")}</span>
            <span className="ww-history-col-traveldate">{t("historyColTravelDate")}</span>
            <span className="ww-history-col-viewed">{t("historyColViewed")}</span>
            <span className="ww-history-col-author">{t("historyColAuthor")}</span>
          </div>

          {loading ? (
            <p className="ww-history-empty">{t("loadingEllipsis")}</p>
          ) : historyItems.length === 0 ? (
            <p className="ww-history-empty">
              {t("historyEmpty")}
            </p>
          ) : (
            historyItems.map((item) => {
              // Backend already excludes your own entry from viewedBy, so
              // anything left here is someone ELSE who's viewed the trip
              // (owner and/or other crew) — worth showing whenever there
              // is at least one.
              const allViewers =
                item.type === "Trip" && Array.isArray(item.viewedBy) ? item.viewedBy : [];

              return (
                // Groups the main row with its crew sub-rows so there's
                // only ONE divider line for the whole group, at the very
                // bottom — not one line after the main row and another
                // after each sub-row.
                <div className="ww-history-group" key={`${item.type}-${item.id}`}>
                  <div className="ww-history-row" onClick={() => handleOpen(item)}>
                    <span className="ww-history-col-title">{item.title}</span>
                    <span className="ww-history-col-type">
                      {item.type === "Trip" ? t("historyTypeTrip") : t("historyTypeJournal")}
                    </span>
                    <span className="ww-history-col-traveldate">
                      {item.type === "Trip" ? formatTravelDate(item.startDate, item.endDate, t) || "—" : "—"}
                    </span>
                    <span className="ww-history-col-viewed">{formatLastViewed(item.lastViewed, t)}</span>
                    <span className="ww-history-col-author">👤 {item.author}</span>
                  </div>

                  {/* One sub-row per person who's viewed this trip —
                      owner included — lined up under the same Last
                      Viewed / Author columns as the main row above,
                      Title/Type/Travel Date left blank since those only
                      apply to the trip itself. */}
                  {allViewers.map((v) => (
                    <div
                      className="ww-history-subrow"
                      key={`${item.id}-${v.name}-${v.viewedAt}`}
                    >
                      <span className="ww-history-col-title" />
                      <span className="ww-history-col-type" />
                      <span className="ww-history-col-traveldate" />
                      <span className="ww-history-col-viewed">{formatLastViewed(v.viewedAt, t)}</span>
                      <span className="ww-history-col-author">
                        👀 {v.name || t("historyAnonymousViewer")} ({viewerTag(v, t)})
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}