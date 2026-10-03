import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useDialog } from "../../context/DialogContext";
import "../../App.css";

// Google Maps can't carry check-in/check-out dates in the URL, so this
// just opens a live map search for "hotels in <destination>" — real
// results straight from Google, not stored/fake data.
function buildGoogleMapsHotelUrl(destination) {
  const query = `hotels in ${destination}`;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

// NOTE: verify these URL patterns against a real manual search on
// agoda.com / klook.com — their query params can change over time.
function buildAgodaSearchUrl(query, startDate, endDate) {
  const params = new URLSearchParams({
    text: query,
    checkIn: startDate || "",
    checkOut: endDate || "",
  });
  return `https://www.agoda.com/search?${params.toString()}`;
}

function buildKlookSearchUrl(query) {
  const params = new URLSearchParams({ query });
  return `https://www.klook.com/search/result/?${params.toString()}`;
}

const BOOKING_SITES = ["Agoda", "Klook", "Booking.com", "Airbnb", "Traveloka"];

function openInNewTab(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function HotelsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { confirm, alert } = useDialog();
  const { formatDate } = usePreferences();
  // "Apr 17" (MM/DD setting) or "17 Apr" (DD/MM setting).
  const formatShortDate = (iso) => formatDate(iso, { month: "short", day: "numeric" });

  // Two ways to arrive here:
  // 1. From the navbar / Dashboard → plain research: look at hotels on
  //    Google Maps in a new tab. Nothing is saved.
  // 2. From a trip's "Book a Hotel" button → same research tools, but
  //    pre-filled with that trip's destination and dates, PLUS a form to
  //    record the booking so it lands on that trip's itinerary.
  const trip = location.state?.tripId
    ? {
        id: location.state.tripId,
        destination: location.state.destination || "",
        startDate: location.state.startDate || "",
        endDate: location.state.endDate || "",
      }
    : null;

  const [search, setSearch] = useState(location.state?.search || trip?.destination || "");
  const [buddies, setBuddies] = useState(location.state?.buddies || 0);
  const [startDate, setStartDate] = useState(location.state?.startDate || "");
  const [endDate, setEndDate] = useState(location.state?.endDate || "");

  const destinations = [
    { name: "San Juan, La Union", img: "/assets/la-union.webp" },
    { name: "Boracay, Aklan", img: "/assets/boracay.jpg" },
    { name: "El Nido, Palawan", img: "/assets/el-nido.jpg" },
    { name: "Baguio City", img: "/assets/baguio.jpg" },
    { name: "Siargao Island", img: "/assets/siargao.png" },
    { name: "Cebu City", img: "/assets/cebu.webp" },
    { name: "Coron, Palawan", img: "/assets/coron.webp" },
    { name: "Vigan, Ilocos Sur", img: "/assets/vigan.jpg" },
    { name: "Tagaytay, Cavite", img: "/assets/tagaytay.jpg" },
  ];

  const openGoogleMaps = (destinationName) => {
    if (!startDate || !endDate) {
      alert(t("hotelsSelectDatesFirst"));
      return;
    }
    openInNewTab(buildGoogleMapsHotelUrl(destinationName));
  };

  const handleSelectDestination = (dest) => openGoogleMaps(dest.name);

  const handleSearch = () => {
    if (!search.trim()) {
      alert(t("hotelsTellUsWhereToGo"));
      return;
    }
    openGoogleMaps(search.trim());
  };

  // If we arrived here with a search already filled in (e.g. from the
  // Dashboard's search bar) and dates were also provided, run the
  // search automatically instead of making the person click again.
  // Not done in trip mode — there the student picks which site to open.
  useEffect(() => {
    if (!trip && location.state?.search && location.state?.startDate && location.state?.endDate) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Bookings =====
  const token = (() => {
    try {
      return localStorage.getItem("wanderwise_token");
    } catch {
      return null;
    }
  })();

  // Trip mode: this trip's bookings. Otherwise: every booking across all
  // of the student's trips (owned or joined as crew).
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!token) return;
    const url = trip ? `/api/trips/${trip.id}/bookings` : "/api/bookings/mine";
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  const emptyForm = {
    placeName: "",
    bookingSite: "Agoda",
    confirmationNumber: "",
    checkIn: trip?.startDate || "",
    checkOut: trip?.endDate || "",
  };
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSaveBooking = async () => {
    const placeName = form.placeName.trim();
    if (!placeName || !form.checkIn) {
      setFormError(t("bookingErrRequired"));
      return;
    }
    if (form.checkOut && form.checkOut < form.checkIn) {
      setFormError(t("bookingErrDates"));
      return;
    }
    if (!trip || !token) return;

    setSaving(true);
    try {
      const resp = await fetch(`/api/trips/${trip.id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          placeName,
          bookingSite: form.bookingSite || null,
          confirmationNumber: form.confirmationNumber.trim() || null,
          checkIn: form.checkIn,
          checkOut: form.checkOut || null,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const saved = await resp.json();
      setBookings((prev) => [...prev, saved]);
      setForm(emptyForm);
      setFormError("");
      setJustSaved(true);
    } catch (err) {
      console.warn("Failed to save booking:", err);
      setFormError(t("networkError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBooking = async (booking) => {
    if (!(await confirm(t("confirmDeleteBooking"), { danger: true, confirmLabel: t("dialogDelete") }))) return;
    const tripIdForBooking = trip ? trip.id : booking.tripId;
    try {
      const resp = await fetch(`/api/trips/${tripIdForBooking}/bookings/${booking.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok || resp.status === 404) {
        setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      }
    } catch (err) {
      console.warn("Failed to delete booking:", err);
    }
  };

  const bookingLine = (b) => (
    <>
      🏨 <strong>{b.placeName}</strong>
      {b.bookingSite && <> · {b.bookingSite}</>}
      {b.confirmationNumber && <> · #{b.confirmationNumber}</>}
      {" · "}
      {formatShortDate(b.checkIn)}
      {b.checkOut && <> → {formatShortDate(b.checkOut)}</>}
    </>
  );

  return (
    <div className="ww-hotels-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <Link to="/dashboard">{t("navHome")}</Link>
          <Link to="/travel-tips">{t("navGuides")}</Link>
          <Link to="/hotels">{t("navHotels")}</Link>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      {trip && (
        <div className="ww-hotels-trip-banner">
          <span>
            {t("hotelsForTrip")} <strong>{t("tripToPrefix")} {trip.destination}</strong>
            {trip.startDate && trip.endDate && (
              <> · {formatShortDate(trip.startDate)} – {formatShortDate(trip.endDate)}</>
            )}
          </span>
          <button
            type="button"
            className="ww-booking-cancel"
            onClick={() => navigate(`/trip-plan?tripId=${trip.id}`)}
          >
            ← {t("backToTrip")}
          </button>
        </div>
      )}

      <main className="ww-hotels-hero">
        <h1 className="ww-hotels-title">{t("hotelsHeroTitle")}</h1>
        <p className="ww-hotels-subtitle">{t("hotelsHeroSubtitle")}</p>

        {trip ? (
          // Trip mode: destination and dates are already known, so go
          // straight to the three places to look and book.
          <div className="ww-hotels-trip-actions">
            <button className="ww-search-btn" onClick={() => openInNewTab(buildGoogleMapsHotelUrl(trip.destination))}>
              🗺️ {t("viewHotelsOnGoogleMaps")}
            </button>
            <button
              className="ww-external-search-btn"
              onClick={() => openInNewTab(buildAgodaSearchUrl(trip.destination, trip.startDate, trip.endDate))}
            >
              🔗 {t("searchOnAgoda")}
            </button>
            <button className="ww-external-search-btn" onClick={() => openInNewTab(buildKlookSearchUrl(trip.destination))}>
              🔗 {t("searchOnKlook")}
            </button>
          </div>
        ) : (
          <div className="ww-hotels-search-bar">
            <div className="ww-hotels-search-input">
              <span>🔍</span>
              <input
                type="text"
                placeholder={t("hotelsSearchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="ww-dates-row">
              <div className="ww-date-field">
                <label className="ww-planning-label">{t("startDate")}</label>
                <input
                  type="date"
                  className="ww-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="ww-date-field">
                <label className="ww-planning-label">{t("endDate")}</label>
                <input
                  type="date"
                  className="ww-date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="ww-buddies-counter">
              <span>{t("travelBuddies")}</span>
              <div className="ww-counter-controls">
                <button onClick={() => setBuddies(Math.max(0, buddies - 1))}>-</button>
                <span>{buddies}</span>
                <button onClick={() => setBuddies(buddies + 1)}>+</button>
              </div>
            </div>
            <button className="ww-search-btn" onClick={handleSearch}>
              {t("search")}
            </button>
          </div>
        )}
      </main>

      {/* ===== Booking Synchronization ===== */}
      {trip ? (
        <section className="ww-hotels-bookings">
          <div className="ww-bookings-panel">
            <p className="ww-bookings-title">{t("recordYourBooking")}</p>
            <p className="ww-bookings-empty">{t("recordBookingHint")}</p>

            {bookings.map((b) => (
              <div className="ww-booking-item" key={b.id}>
                <span>{bookingLine(b)}</span>
                <span
                  className="ww-cost-remove"
                  onClick={() => handleDeleteBooking(b)}
                  title={t("deleteBookingTitle")}
                  style={{ cursor: "pointer" }}
                >
                  ✕
                </span>
              </div>
            ))}

            <div className="ww-booking-form">
              <label>
                {t("bookingPlaceName")}
                <input
                  type="text"
                  value={form.placeName}
                  placeholder={t("bookingPlaceNamePlaceholder")}
                  onChange={(e) => {
                    setJustSaved(false);
                    setForm((f) => ({ ...f, placeName: e.target.value }));
                  }}
                />
              </label>
              <label>
                {t("bookingSite")}
                <select
                  value={form.bookingSite}
                  onChange={(e) => setForm((f) => ({ ...f, bookingSite: e.target.value }))}
                >
                  {BOOKING_SITES.map((site) => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                  <option value="">{t("costCatOther")}</option>
                </select>
              </label>
              <label>
                {t("bookingConfirmationNumber")}
                <input
                  type="text"
                  value={form.confirmationNumber}
                  onChange={(e) => setForm((f) => ({ ...f, confirmationNumber: e.target.value }))}
                />
              </label>
              <label>
                {t("bookingCheckIn")}
                <input
                  type="date"
                  value={form.checkIn}
                  min={trip.startDate || undefined}
                  max={trip.endDate || undefined}
                  onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                />
              </label>
              <label>
                {t("bookingCheckOut")}
                <input
                  type="date"
                  value={form.checkOut}
                  min={form.checkIn || trip.startDate || undefined}
                  max={trip.endDate || undefined}
                  onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                />
              </label>
              {formError && <p className="ww-booking-error">⚠️ {formError}</p>}
              {justSaved && <p className="ww-optimize-result">✓ {t("bookingSaved")}</p>}
              <div className="ww-booking-actions">
                <button type="button" className="ww-optimize-btn" onClick={handleSaveBooking} disabled={saving}>
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        token && (
          <section className="ww-hotels-bookings">
            <div className="ww-bookings-panel">
              <p className="ww-bookings-title">{t("yourBookings")}</p>
              {bookings.length === 0 ? (
                <p className="ww-bookings-empty">{t("noBookingsAnywhere")}</p>
              ) : (
                bookings.map((b) => (
                  <div
                    className="ww-booking-item ww-booking-item-link"
                    key={b.id}
                    onClick={() => navigate(`/trip-plan?tripId=${b.tripId}`)}
                  >
                    <span>
                      {bookingLine(b)}
                      <span className="ww-booking-trip-name">
                        {" · "}
                        {b.tripDestination
                          ? `${t("tripToPrefix")} ${b.tripDestination}`
                          : b.tripTitle || t("untitledTrip")}
                      </span>
                    </span>
                    <span className="ww-booking-open">{t("view")} →</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )
      )}

      <section className="ww-hotels-destinations">
        <h2 className="ww-hotels-section-title">{t("hotelsDestinationsTitle")}</h2>

        <div className="ww-hotels-grid">
          {destinations.map((dest) => (
            <div
              className="ww-hotel-card"
              key={dest.name}
              onClick={() => handleSelectDestination(dest)}
              style={{ cursor: "pointer" }}
            >
              <img src={dest.img} alt={dest.name} />
              <div className="ww-hotel-caption">
                <h3>{dest.name}</h3>
                <p>{t("hotelsCaption")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}