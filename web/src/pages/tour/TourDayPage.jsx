import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useDialog } from "../../context/DialogContext";
import "../../App.css";
import Icon from "../../components/Icon";

// ===== Tour Day (during the trip) =====
// One page per itinerary day with:
//  1. Meeting point + check-in: a circle (geofence) on the map; students
//     check in with a photo, and it only works inside the circle.
//  2. Attendance: everyone on the trip, ticked by a check-in or by hand.
//  3. Announcements: posted by the organizer, everyone gets notified.
//  4. Activities: what the group does that day.
// The owner and crew with edit access manage it; everyone can check in.

const PH_CENTER = [12.8797, 121.774];

const meetingPinIcon = L.divIcon({
  className: "",
  html: `
    <svg width="30" height="42" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 25 13 25s13-15.3 13-25C26 5.8 20.2 0 13 0z"
            fill="#3a2416" stroke="#2b1c12" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="5" fill="#a9e4dc"/>
    </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -38],
});

const authHeaders = () => {
  const token = localStorage.getItem("wanderwise_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

// The server sends UTC times without the "Z".
function toLocalDate(value) {
  if (!value) return null;
  const s = String(value);
  return new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
}

function isoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildDays(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const days = [];
  const cur = new Date(start);
  while (cur <= end && days.length < 60) {
    days.push(isoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Straight-line distance in meters (same formula the server uses).
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Shrinks a photo before upload (max 1024px, JPEG) so check-ins stay
// small in the database and upload fast on mobile data.
function compressImage(file, maxSize = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Keeps the map centered on the meeting point when it changes.
function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

// While the organizer edits the meeting point, a map click pins it.
function ClickToPin({ enabled, onPick }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick(e.latlng);
    },
  });
  return null;
}

export default function TourDayPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const { formatDate, formatTime } = usePreferences();
  const { confirm, alert } = useDialog();

  const tripId = Number(searchParams.get("tripId")) || null;

  // ---- Trip (dates + itinerary places for the meeting point picker) ----
  const [trip, setTrip] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("wanderwise_token")) {
      navigate("/login");
      return;
    }
    if (!tripId) {
      setLoadingTrip(false);
      return;
    }
    fetch(`/api/trips/${tripId}`, { headers: authHeaders() })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => setTrip(data))
      .catch(() => setTrip(null))
      .finally(() => setLoadingTrip(false));
  }, [tripId, navigate]);

  const days = useMemo(() => buildDays(trip?.startDate, trip?.endDate), [trip]);

  // Day from the link (?day=0), else today if the trip is happening, else Day 1.
  const dayParam = searchParams.get("day");
  const dayIndex = useMemo(() => {
    if (days.length === 0) return 0;
    if (dayParam !== null && !isNaN(Number(dayParam))) {
      return Math.min(Math.max(Number(dayParam), 0), days.length - 1);
    }
    const todayIdx = days.indexOf(isoDate(new Date()));
    return todayIdx >= 0 ? todayIdx : 0;
  }, [days, dayParam]);
  const date = days[dayIndex] || null;

  const selectDay = (idx) => {
    setSearchParams({ tripId: String(tripId), day: String(idx) }, { replace: true });
  };

  // Places with a known location, the day's own stops first.
  const placeOptions = useMemo(() => {
    if (!trip) return [];
    const all = (trip.sections || []).flatMap((s) => s.places || []);
    const seen = new Set();
    const list = [];
    const add = (p) => {
      if (p.latitude == null || p.longitude == null) return;
      const key = p.name.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ name: p.name, lat: p.latitude, lng: p.longitude, today: p.itineraryDate === date });
    };
    all.filter((p) => p.itineraryDate === date).forEach(add);
    all.forEach(add);
    return list;
  }, [trip, date]);

  // ---- Tour data for the chosen day ----
  const [tour, setTour] = useState(null);
  const [loadingTour, setLoadingTour] = useState(false);

  const loadTour = useCallback(
    (quiet = false) => {
      if (!tripId || !date) return;
      if (!quiet) setLoadingTour(true);
      fetch(`/api/trips/${tripId}/tour?date=${date}`, { headers: authHeaders() })
        .then((resp) => (resp.ok ? resp.json() : null))
        .then((data) => {
          if (data) setTour(data);
        })
        .catch(() => {})
        .finally(() => setLoadingTour(false));
    },
    [tripId, date]
  );

  useEffect(() => {
    setTour(null);
    loadTour();
    // Refresh every 30 s so the organizer sees new check-ins.
    const timer = setInterval(() => loadTour(true), 30000);
    return () => clearInterval(timer);
  }, [loadTour]);

  const canManage = !!tour?.canManage;
  const meeting = tour?.meetingPoint && tour.meetingPoint.latitude != null ? tour.meetingPoint : null;
  const roster = tour?.roster || [];
  const me = roster.find((r) => r.isMe);
  const presentCount = roster.filter((r) => r.present).length;

  // ---- 1. Meeting point (managers) ----
  const [editingMeeting, setEditingMeeting] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState(null); // { name, lat, lng, radius }
  const [savingMeeting, setSavingMeeting] = useState(false);

  const startEditMeeting = () => {
    setMeetingDraft(
      meeting
        ? { name: meeting.name || "", lat: meeting.latitude, lng: meeting.longitude, radius: meeting.radiusMeters }
        : placeOptions[0]
          ? { name: placeOptions[0].name, lat: placeOptions[0].lat, lng: placeOptions[0].lng, radius: 200 }
          : { name: "", lat: null, lng: null, radius: 200 }
    );
    setEditingMeeting(true);
  };

  const saveMeeting = async () => {
    if (!meetingDraft || meetingDraft.lat == null) return;
    setSavingMeeting(true);
    try {
      const resp = await fetch(`/api/trips/${tripId}/tour/day`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          date,
          meetingPlaceName: meetingDraft.name || t("meetingPointCustom"),
          latitude: meetingDraft.lat,
          longitude: meetingDraft.lng,
          radiusMeters: Number(meetingDraft.radius) || 200,
        }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      setEditingMeeting(false);
      loadTour(true);
    } catch {
      alert(t("tourSaveFailed"));
    } finally {
      setSavingMeeting(false);
    }
  };

  // ---- 2. Check-in (everyone) ----
  const [myPos, setMyPos] = useState(null); // { lat, lng, accuracy }
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const fileInputRef = useRef(null);

  const myDistance =
    myPos && meeting ? Math.round(distanceMeters(myPos.lat, myPos.lng, meeting.latitude, meeting.longitude)) : null;
  const insideFence = myDistance != null && meeting && myDistance <= meeting.radiusMeters;

  const locateMe = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(t("locationUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
      },
      () => {
        setLocationError(t("locationDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handlePhotoChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!file || !myPos) return;
    setCheckingIn(true);
    try {
      const photo = await compressImage(file);
      const resp = await fetch(`/api/trips/${tripId}/tour/checkin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date, latitude: myPos.lat, longitude: myPos.lng, photo }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        alert(data?.error === "outside_geofence" ? t("checkInOutside") : t("checkInFailed"));
        return;
      }
      loadTour(true);
    } catch {
      alert(t("checkInFailed"));
    } finally {
      setCheckingIn(false);
    }
  };

  // ---- 3. Attendance (managers tick by hand) ----
  const [savingAttendanceFor, setSavingAttendanceFor] = useState(null);
  const toggleAttendance = async (person) => {
    if (!canManage || savingAttendanceFor) return;
    setSavingAttendanceFor(person.userId);
    // Show the change right away, then save.
    setTour((prev) => ({
      ...prev,
      roster: prev.roster.map((r) => (r.userId === person.userId ? { ...r, present: !person.present } : r)),
    }));
    try {
      const resp = await fetch(`/api/trips/${tripId}/tour/attendance`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ date, userId: person.userId, present: !person.present }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      loadTour(true);
    } catch {
      alert(t("tourSaveFailed"));
      loadTour(true);
    } finally {
      setSavingAttendanceFor(null);
    }
  };

  const [photoPreview, setPhotoPreview] = useState(null); // { name, photo, time }

  // ---- 4. Announcements ----
  const [announcementText, setAnnouncementText] = useState("");
  const [posting, setPosting] = useState(false);

  const postAnnouncement = async () => {
    const message = announcementText.trim();
    if (!message || posting) return;
    setPosting(true);
    try {
      const resp = await fetch(`/api/trips/${tripId}/tour/announcements`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      setAnnouncementText("");
      loadTour(true);
    } catch {
      alert(t("tourSaveFailed"));
    } finally {
      setPosting(false);
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!(await confirm(t("confirmDeleteAnnouncement"), { danger: true, confirmLabel: t("dialogDelete") }))) return;
    await fetch(`/api/trips/${tripId}/tour/announcements/${id}`, { method: "DELETE", headers: authHeaders() }).catch(() => {});
    loadTour(true);
  };

  // ---- 5. Activities ----
  const emptyActivity = { title: "", time: "", placeName: "", notes: "" };
  const [activityDraft, setActivityDraft] = useState(emptyActivity);
  const [addingActivity, setAddingActivity] = useState(false);

  const addActivity = async () => {
    if (!activityDraft.title.trim() || addingActivity) return;
    setAddingActivity(true);
    try {
      const resp = await fetch(`/api/trips/${tripId}/tour/activities`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date, ...activityDraft }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      setActivityDraft(emptyActivity);
      loadTour(true);
    } catch {
      alert(t("tourSaveFailed"));
    } finally {
      setAddingActivity(false);
    }
  };

  const deleteActivity = async (id) => {
    if (!(await confirm(t("confirmDeleteActivity"), { danger: true, confirmLabel: t("dialogDelete") }))) return;
    await fetch(`/api/trips/${tripId}/tour/activities/${id}`, { method: "DELETE", headers: authHeaders() }).catch(() => {});
    loadTour(true);
  };

  // ---- Navigation ----
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(tripId ? `/trip-plan?tripId=${tripId}` : "/dashboard");
  };

  const fmtWhen = (value) => {
    const d = toLocalDate(value);
    if (!d) return "";
    return `${formatDate(d, { month: "short", day: "numeric" })}, ${formatTime(d)}`;
  };

  const fullName = (p) => [p.firstName, p.lastName].filter(Boolean).join(" ");

  // Where the map looks: the meeting point (or the draft while editing).
  const mapCenter = useMemo(() => {
    if (editingMeeting && meetingDraft?.lat != null) return [meetingDraft.lat, meetingDraft.lng];
    if (meeting) return [meeting.latitude, meeting.longitude];
    if (placeOptions[0]) return [placeOptions[0].lat, placeOptions[0].lng];
    return null;
  }, [editingMeeting, meetingDraft, meeting, placeOptions]);

  const fence = editingMeeting && meetingDraft?.lat != null
    ? { lat: meetingDraft.lat, lng: meetingDraft.lng, radius: Number(meetingDraft.radius) || 200, name: meetingDraft.name }
    : meeting
      ? { lat: meeting.latitude, lng: meeting.longitude, radius: meeting.radiusMeters, name: meeting.name }
      : null;

  return (
    <div className="ww-tour-page">
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
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}><Icon name="search" /></span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}><Icon name="bell" /></span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}><Icon name="user" /></span>
        </div>
      </header>

      <main className="ww-tour-main">
        <p className="ww-stories-back" onClick={handleBack}>
          <Icon name="arrow-left" /> {t("backToTrip")}
        </p>

        <h1 className="ww-tour-title">
          <Icon name="compass" /> {t("tourDayTitle")}
          {trip?.destination && <span className="ww-tour-subtitle"> · {trip.destination}</span>}
        </h1>

        {loadingTrip ? (
          <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
        ) : !trip ? (
          <p className="ww-expense-empty">{t("tourTripNotFound")}</p>
        ) : days.length === 0 ? (
          <p className="ww-expense-empty">{t("tourNoDates")}</p>
        ) : (
          <>
            {/* Day picker */}
            <div className="ww-tour-days">
              {days.map((d, i) => (
                <button
                  type="button"
                  key={d}
                  className={`ww-tour-day ${i === dayIndex ? "active" : ""}`}
                  onClick={() => selectDay(i)}
                >
                  <span className="ww-tour-day-num">
                    {t("tourDayN")} {i + 1}
                  </span>
                  <span className="ww-tour-day-date">
                    {formatDate(d + "T00:00:00", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </button>
              ))}
            </div>

            {loadingTour && !tour ? (
              <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
            ) : !tour ? (
              <p className="ww-expense-empty">{t("tourLoadFailed")}</p>
            ) : (
              <div className="ww-tour-grid">
                {/* ===== Meeting point + check-in ===== */}
                <section className="ww-tour-card ww-tour-card-wide">
                  <div className="ww-tour-card-head">
                    <h2><Icon name="map-pin" /> {t("meetingPointTitle")}</h2>
                    {canManage && !editingMeeting && (
                      <button type="button" className="ww-tour-link" onClick={startEditMeeting}>
                        <Icon name="pencil" /> {meeting ? t("editMeetingPoint") : t("setMeetingPoint")}
                      </button>
                    )}
                  </div>

                  {meeting && !editingMeeting && (
                    <p className="ww-tour-meeting-info">
                      <strong>{meeting.name || t("meetingPointCustom")}</strong> · {t("needWithin")}{" "}
                      {meeting.radiusMeters} m
                    </p>
                  )}

                  {!meeting && !editingMeeting && (
                    <p className="ww-expense-empty">
                      {canManage ? t("meetingPointNotSetManager") : t("meetingPointNotSet")}
                    </p>
                  )}

                  {editingMeeting && meetingDraft && (
                    <div className="ww-tour-form">
                      <label>
                        {t("meetingPointPick")}
                        <select
                          value={placeOptions.findIndex((p) => p.lat === meetingDraft.lat && p.lng === meetingDraft.lng)}
                          onChange={(e) => {
                            const p = placeOptions[Number(e.target.value)];
                            if (p) setMeetingDraft((d) => ({ ...d, name: p.name, lat: p.lat, lng: p.lng }));
                          }}
                        >
                          <option value={-1}>— {t("meetingPointCustom")} —</option>
                          {placeOptions.map((p, i) => (
                            <option key={p.name} value={i}>
                              {p.today ? "★ " : ""}{p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t("meetingPointRadius")}
                        <input
                          type="number"
                          min={20}
                          max={5000}
                          step={10}
                          value={meetingDraft.radius}
                          onChange={(e) => setMeetingDraft((d) => ({ ...d, radius: e.target.value }))}
                        />
                      </label>
                      <p className="ww-tour-hint"><Icon name="lightbulb" /> {t("meetingPointMapHint")}</p>
                      <div className="ww-tour-form-actions">
                        <button type="button" className="ww-booking-cancel" onClick={() => setEditingMeeting(false)}>
                          {t("cancel")}
                        </button>
                        <button
                          type="button"
                          className="ww-search-btn"
                          onClick={saveMeeting}
                          disabled={savingMeeting || meetingDraft.lat == null}
                        >
                          {savingMeeting ? t("savingEllipsis") : t("saveMeetingPoint")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="ww-tour-map">
                    <MapContainer
                      center={mapCenter || PH_CENTER}
                      zoom={mapCenter ? 16 : 6}
                      style={{ width: "100%", height: "340px" }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Recenter center={mapCenter} zoom={16} />
                      <ClickToPin
                        enabled={editingMeeting}
                        onPick={(ll) =>
                          setMeetingDraft((d) => ({ ...d, name: t("meetingPointCustom"), lat: ll.lat, lng: ll.lng }))
                        }
                      />

                      {fence && (
                        <>
                          <Circle
                            center={[fence.lat, fence.lng]}
                            radius={fence.radius}
                            pathOptions={{ color: "#2f6f5f", fillColor: "#a9e4dc", fillOpacity: 0.25, weight: 2 }}
                          />
                          <Marker position={[fence.lat, fence.lng]} icon={meetingPinIcon}>
                            <Popup>
                              <Icon name="map-pin" /> {fence.name || t("meetingPointCustom")} · {fence.radius} m
                            </Popup>
                          </Marker>
                        </>
                      )}

                      {/* Where each person checked in (photos/locations are
                          only sent to the organizer, and to you for your own). */}
                      {roster
                        .filter((r) => r.latitude != null && r.longitude != null)
                        .map((r) => (
                          <CircleMarker
                            key={r.userId}
                            center={[r.latitude, r.longitude]}
                            radius={8}
                            pathOptions={{ color: "#ffffff", weight: 2, fillColor: r.isMe ? "#2f7ae0" : "#e8973a", fillOpacity: 1 }}
                          >
                            <Popup>
                              <strong>{fullName(r)}</strong>
                              <br />
                              <Icon name="check" /> {fmtWhen(r.checkedInAt)} · {r.distanceMeters} m
                              {r.photo && (
                                <img src={r.photo} alt={fullName(r)} className="ww-tour-popup-photo" />
                              )}
                            </Popup>
                          </CircleMarker>
                        ))}

                      {myPos && (
                        <CircleMarker
                          center={[myPos.lat, myPos.lng]}
                          radius={7}
                          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2f7ae0", fillOpacity: 1 }}
                        >
                          <Popup>{t("youAreHere")}</Popup>
                        </CircleMarker>
                      )}
                    </MapContainer>
                  </div>

                  {/* My check-in */}
                  {meeting && !editingMeeting && tour.canCheckIn !== false && (
                    <div className="ww-tour-checkin">
                      {me?.present && (
                        <p className="ww-tour-checked">
                          <Icon name="check-circle" /> {me.checkedInAt
                            ? `${t("youreCheckedIn")} · ${fmtWhen(me.checkedInAt)}`
                            : t("markedByOrganizer")}
                        </p>
                      )}

                      {!myPos ? (
                        <button type="button" className="ww-search-btn" onClick={locateMe} disabled={locating}>
                          <Icon name="map-pin" /> {locating ? t("checkingLocation") : me?.present ? t("checkInAgain") : t("checkInBtn")}
                        </button>
                      ) : (
                        <div className={`ww-tour-fence-status ${insideFence ? "inside" : "outside"}`}>
                          <p>
                            <Icon name={insideFence ? "check-circle" : "ban"} /> {insideFence ? t("youAreInside") : t("youAreOutside")} ·{" "}
                            {myDistance} {t("metersAway")}
                            {!insideFence && ` (${t("needWithin")} ${meeting.radiusMeters} m)`}
                          </p>
                          <div className="ww-tour-form-actions">
                            <button type="button" className="ww-booking-cancel" onClick={locateMe} disabled={locating}>
                              <Icon name="refresh" /> {locating ? t("checkingLocation") : t("refreshLocation")}
                            </button>
                            {insideFence && (
                              <button
                                type="button"
                                className="ww-search-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={checkingIn}
                              >
                                <Icon name="camera" /> {checkingIn ? t("uploadingCheckIn") : t("choosePhotoBtn")}
                              </button>
                            )}
                          </div>
                          {insideFence && <p className="ww-tour-hint">{t("takePhotoToCheckIn")}</p>}
                        </div>
                      )}
                      {locationError && <p className="ww-booking-error"><Icon name="alert-triangle" /> {locationError}</p>}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: "none" }}
                        onChange={handlePhotoChosen}
                      />
                    </div>
                  )}
                </section>

                {/* ===== Attendance ===== */}
                <section className="ww-tour-card">
                  <div className="ww-tour-card-head">
                    <h2><Icon name="check-circle" /> {t("attendanceTitle")}</h2>
                    <span className="ww-tour-count">
                      {presentCount} / {roster.length} {t("presentCount")}
                    </span>
                  </div>
                  <div className="ww-tour-roster">
                    {roster.map((r) => (
                      <div className={`ww-tour-person ${r.present ? "present" : ""}`} key={r.userId}>
                        <input
                          type="checkbox"
                          checked={r.present}
                          disabled={!canManage || savingAttendanceFor === r.userId}
                          onChange={() => toggleAttendance(r)}
                          aria-label={fullName(r)}
                        />
                        <div
                          className="ww-navbar-search-result-avatar"
                          style={r.avatarUrl ? { backgroundImage: `url(${r.avatarUrl})` } : undefined}
                        />
                        <div className="ww-tour-person-info">
                          <span className="ww-tour-person-name">
                            {fullName(r)}
                            {r.isOwner && <span className="ww-tour-tag">{t("tripOwner")}</span>}
                            {r.isMe && <span className="ww-tour-tag">{t("historyYouTag")}</span>}
                          </span>
                          <span className="ww-tour-person-status">
                            {r.present
                              ? r.checkedInAt
                                ? <><Icon name="check" /> {t("checkedInAt")} {fmtWhen(r.checkedInAt)}{r.distanceMeters != null ? ` · ${r.distanceMeters} m` : ""}</>
                                : t("markedByOrganizer")
                              : t("notYetCheckedIn")}
                          </span>
                        </div>
                        {r.photo && (
                          <button
                            type="button"
                            className="ww-tour-photo-thumb"
                            style={{ backgroundImage: `url(${r.photo})` }}
                            title={t("viewPhoto")}
                            onClick={() => setPhotoPreview({ name: fullName(r), photo: r.photo, time: fmtWhen(r.checkedInAt) })}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* ===== Announcements ===== */}
                <section className="ww-tour-card">
                  <div className="ww-tour-card-head">
                    <h2><Icon name="megaphone" /> {t("announcementsTitle")}</h2>
                  </div>
                  {canManage && (
                    <div className="ww-tour-form">
                      <textarea
                        className="ww-journal-tips-input"
                        placeholder={t("announcementPlaceholder")}
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        maxLength={1000}
                      />
                      <div className="ww-tour-form-actions">
                        <button
                          type="button"
                          className="ww-search-btn"
                          onClick={postAnnouncement}
                          disabled={posting || !announcementText.trim()}
                        >
                          <Icon name="megaphone" /> {posting ? t("savingEllipsis") : t("postAnnouncement")}
                        </button>
                      </div>
                    </div>
                  )}
                  {tour.announcements.length === 0 ? (
                    <p className="ww-expense-empty">{t("noAnnouncements")}</p>
                  ) : (
                    <ul className="ww-tour-announcements">
                      {tour.announcements.map((a) => (
                        <li key={a.id}>
                          <div className="ww-tour-announcement-head">
                            <strong>{a.authorName}</strong>
                            <span>{fmtWhen(a.createdAt)}</span>
                            {canManage && (
                              <span
                                className="ww-cost-remove"
                                onClick={() => deleteAnnouncement(a.id)}
                                title={t("dialogDelete")}
                              >
                                <Icon name="x" />
                              </span>
                            )}
                          </div>
                          <p>{a.message}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* ===== Activities ===== */}
                <section className="ww-tour-card ww-tour-card-wide">
                  <div className="ww-tour-card-head">
                    <h2><Icon name="target" /> {t("activitiesTitle")}</h2>
                  </div>
                  {tour.activities.length === 0 ? (
                    <p className="ww-expense-empty">{t("noActivities")}</p>
                  ) : (
                    <ol className="ww-tour-activities">
                      {tour.activities.map((a) => (
                        <li key={a.id}>
                          <span className="ww-tour-activity-time">{a.time ? formatTime(a.time) : "—"}</span>
                          <div className="ww-tour-activity-body">
                            <strong>{a.title}</strong>
                            {a.placeName && <span className="ww-tour-activity-place"><Icon name="map-pin" /> {a.placeName}</span>}
                            {a.notes && <p>{a.notes}</p>}
                          </div>
                          {canManage && (
                            <span
                              className="ww-cost-remove"
                              onClick={() => deleteActivity(a.id)}
                              title={t("dialogDelete")}
                            >
                              <Icon name="x" />
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}

                  {canManage && (
                    <div className="ww-tour-form ww-tour-activity-form">
                      <input
                        className="ww-invite-user-input"
                        style={{ paddingLeft: 14, backgroundImage: "none", marginBottom: 0 }}
                        placeholder={t("activityTitlePlaceholder")}
                        value={activityDraft.title}
                        onChange={(e) => setActivityDraft((d) => ({ ...d, title: e.target.value }))}
                        maxLength={150}
                      />
                      <input
                        type="time"
                        value={activityDraft.time}
                        onChange={(e) => setActivityDraft((d) => ({ ...d, time: e.target.value }))}
                      />
                      <input
                        className="ww-invite-user-input"
                        style={{ paddingLeft: 14, backgroundImage: "none", marginBottom: 0 }}
                        placeholder={t("activityPlacePlaceholder")}
                        list="ww-tour-places"
                        value={activityDraft.placeName}
                        onChange={(e) => setActivityDraft((d) => ({ ...d, placeName: e.target.value }))}
                        maxLength={150}
                      />
                      <datalist id="ww-tour-places">
                        {placeOptions.map((p) => (
                          <option key={p.name} value={p.name} />
                        ))}
                      </datalist>
                      <input
                        className="ww-invite-user-input"
                        style={{ paddingLeft: 14, backgroundImage: "none", marginBottom: 0 }}
                        placeholder={t("activityNotesPlaceholder")}
                        value={activityDraft.notes}
                        onChange={(e) => setActivityDraft((d) => ({ ...d, notes: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="ww-search-btn"
                        onClick={addActivity}
                        disabled={addingActivity || !activityDraft.title.trim()}
                      >
                        + {t("addActivity")}
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>

      {photoPreview && (
        <div className="ww-modal-overlay" onClick={() => setPhotoPreview(null)}>
          <div className="ww-modal-card ww-tour-photo-modal" onClick={(e) => e.stopPropagation()}>
            <p className="ww-tour-photo-caption">
              <strong>{photoPreview.name}</strong> · {photoPreview.time}
            </p>
            <img src={photoPreview.photo} alt={photoPreview.name} />
            <div className="ww-modal-actions">
              <button type="button" className="ww-modal-cancel-btn" onClick={() => setPhotoPreview(null)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
