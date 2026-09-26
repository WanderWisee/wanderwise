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
            historyItems.map((item) => (
              <div
                className="ww-history-row"
                key={`${item.type}-${item.id}`}
                onClick={() => handleOpen(item)}
              >
                <span className="ww-history-col-title">{item.title}</span>
                <span className="ww-history-col-type">
                  {item.type === "Trip" ? t("historyTypeTrip") : t("historyTypeJournal")}
                </span>
                <span className="ww-history-col-viewed">{formatLastViewed(item.lastViewed, t)}</span>
                <span className="ww-history-col-author">👤 {item.author}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}