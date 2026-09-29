import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import "../../App.css";

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
  // Date and time follow Settings → Formatting.
  const { formatDate, formatTime, formatDateRange } = usePreferences();

  // The backend sends UTC without the "Z", so add it before converting to
  // local time. Today → "2:30 PM Today"; older → "Sep 20" / "20 Sep".
  const formatLastViewed = (dateString) => {
    const utcDateString = dateString.endsWith("Z") ? dateString : dateString + "Z";
    const date = new Date(utcDateString);
    const sameDay = date.toDateString() === new Date().toDateString();
    if (sameDay) return `${formatTime(date)} ${t("today")}`;
    return formatDate(date, { month: "short", day: "numeric" });
  };

  // The trip's own travel dates, e.g. "January 1 – 3, 2026".
  const formatTravelDate = (startDate, endDate) => (startDate ? formatDateRange(startDate, endDate) : "");

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