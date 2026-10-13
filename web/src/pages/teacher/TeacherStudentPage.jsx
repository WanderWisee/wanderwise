import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { api, fullName, peso, toLocalDate } from "../../utils/portal";
import { Avatar } from "./TeacherClassPage";
import { Stat } from "./TeacherHomePage";
import "../../App.css";

// Teacher: everything about one student in this class — grades, trips,
// attendance (check-in photo + where they were) and journal posts.
export default function TeacherStudentPage() {
  return (
    <div className="ww-portal-page">
      <PortalHeader />
      <RoleGate need="teacher">
        <StudentDetail />
      </RoleGate>
    </div>
  );
}

function FitAll({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 16);
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

function StudentDetail() {
  const { classId, studentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDate, formatTime, formatDateRange } = usePreferences();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api(`/api/teacher/classes/${classId}/students/${studentId}`).then((r) => {
      if (cancelled) return;
      if (r.ok) setData(r.data);
      else setNotFound(true);
    });
    return () => {
      cancelled = true;
    };
  }, [classId, studentId]);

  const checkInPoints = useMemo(
    () => (data?.attendance || []).filter((a) => a.latitude != null && a.longitude != null),
    [data]
  );
  const mapPoints = useMemo(() => checkInPoints.map((a) => [a.latitude, a.longitude]), [checkInPoints]);

  const back = () => navigate(`/teacher/class/${classId}`);

  if (notFound) {
    return (
      <main className="ww-portal-main">
        <p className="ww-stories-back" onClick={back}>← {t("backToClass")}</p>
        <p className="ww-expense-empty">{t("studentNotFound")}</p>
      </main>
    );
  }
  if (!data) return <main className="ww-portal-main"><p className="ww-expense-empty">{t("loadingEllipsis")}</p></main>;

  const s = data.student;
  const present = data.attendance.filter((a) => a.present).length;
  const gradedScores = data.grades.filter((g) => g.score != null);
  const average = gradedScores.length
    ? Math.round((100 * gradedScores.reduce((n, g) => n + g.score / g.points, 0)) / gradedScores.length)
    : null;
  const when = (v) => {
    const d = toLocalDate(v);
    return d ? `${formatDate(d, { month: "short", day: "numeric" })} ${formatTime(d)}` : "";
  };

  return (
    <main className="ww-portal-main">
      <p className="ww-stories-back" onClick={back}>← {data.className}</p>

      <section className="ww-portal-card ww-portal-profile">
        <Avatar person={s} size={72} />
        <div>
          <h1 className="ww-portal-title">{fullName(s)}</h1>
          <p className="ww-portal-muted">
            <code>{s.studentNumber}</code> · {s.email}
            {s.cellphone && ` · 📱 ${s.cellphone}`}
          </p>
          {s.bio && <p className="ww-portal-muted small">“{s.bio}”</p>}
          <p className="ww-portal-muted small">{t("joinedClassOn")} {formatDate(toLocalDate(s.joinedAt))}</p>
        </div>
        <button type="button" className="ww-booking-cancel" onClick={() => navigate(`/profile/view/${s.userId}`)}>
          👤 {t("viewPublicProfile")}
        </button>
      </section>

      <div className="ww-portal-stats">
        <Stat icon="🗺️" value={data.trips.length} label={t("colTrips")} />
        <Stat icon="✅" value={present} label={t("colCheckIns")} />
        <Stat icon="📖" value={data.journals.length} label={t("colJournals")} />
        <Stat icon="🏅" value={average == null ? "—" : `${average}%`} label={t("averageGrade")} />
      </div>

      {/* Grades */}
      <section className="ww-portal-card">
        <div className="ww-portal-card-head"><h2>🏅 {t("gradesTitle")}</h2></div>
        {data.grades.length === 0 ? (
          <p className="ww-expense-empty">{t("noAssignmentsYet")}</p>
        ) : (
          <div className="ww-portal-table-wrap">
            <table className="ww-portal-table">
              <thead>
                <tr>
                  <th>{t("tab_assignments")}</th>
                  <th>{t("colStatus")}</th>
                  <th className="num">{t("scoreLabel")}</th>
                  <th>{t("feedbackLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {data.grades.map((g) => (
                  <tr key={g.assignmentId} className="clickable"
                    onClick={() => navigate(`/teacher/class/${classId}/assignment/${g.assignmentId}`)}>
                    <td><strong>{g.title}</strong></td>
                    <td>
                      {!g.submissionId ? (
                        <span className="ww-portal-badge muted">{t("notSubmitted")}</span>
                      ) : g.score != null ? (
                        <span className="ww-portal-badge ok">{t("gradedLabel")}</span>
                      ) : (
                        <span className="ww-portal-badge warn">{t("toGrade")}</span>
                      )}
                      {g.late && <span className="ww-portal-badge danger">{t("lateLabel")}</span>}
                    </td>
                    <td className="num">{g.score != null ? `${g.score}/${g.points}` : "—"}</td>
                    <td className="ww-portal-clip">{g.feedback || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Trips */}
      <section className="ww-portal-card">
        <div className="ww-portal-card-head"><h2>🗺️ {t("tripsTitle")}</h2></div>
        {data.trips.length === 0 ? (
          <p className="ww-expense-empty">{t("noTripsStudent")}</p>
        ) : (
          <div className="ww-portal-list">
            {data.trips.map((trip) => (
              <div key={trip.id} className="ww-portal-row">
                <div className="ww-portal-row-main">
                  <strong>
                    {trip.title || trip.destination}
                    {trip.isClassTrip && <span className="ww-portal-badge">🚌 {t("fieldTripTag")}</span>}
                    {trip.role === "crew" && !trip.isClassTrip && <span className="ww-portal-badge muted">{t("crewTag")}</span>}
                  </strong>
                  <span className="ww-portal-row-meta">
                    <span>📍 {trip.destination || "—"}</span>
                    {trip.startDate && <span>📅 {formatDateRange(trip.startDate + "T00:00:00", (trip.endDate || trip.startDate) + "T00:00:00")}</span>}
                    <span>📌 {trip.placesCount} {t("placesShort")}</span>
                    <span>💰 {peso(trip.spent)} / {peso(trip.budgetTotal)}</span>
                  </span>
                </div>
                <div className="ww-portal-row-actions">
                  <button type="button" className="ww-booking-cancel" onClick={() => navigate(`/trip-plan?tripId=${trip.id}`)}>
                    {t("openItinerary")}
                  </button>
                  {trip.startDate && (
                    <button type="button" className="ww-link-btn" onClick={() => navigate(`/trip-plan/tour?tripId=${trip.id}`)}>
                      🧭 {t("attendanceTitle")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Attendance */}
      <section className="ww-portal-card">
        <div className="ww-portal-card-head"><h2>✅ {t("attendanceTitle")}</h2></div>
        {data.attendance.length === 0 ? (
          <p className="ww-expense-empty">{t("noAttendanceYet")}</p>
        ) : (
          <>
            {checkInPoints.length > 0 && (
              <div className="ww-tour-map ww-portal-map">
                <MapContainer center={mapPoints[0]} zoom={14} style={{ height: 280, width: "100%" }} scrollWheelZoom={false}>
                  <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <FitAll points={mapPoints} />
                  {checkInPoints.map((a, i) => (
                    <CircleMarker key={i} center={[a.latitude, a.longitude]} radius={9}
                      pathOptions={{ color: "#2f6f5f", fillColor: "#a9e4dc", fillOpacity: 0.9, weight: 2 }}>
                      <Popup>
                        <strong>{a.tripDestination || a.tripTitle}</strong>
                        <br />
                        {formatDate(a.date + "T00:00:00", { month: "short", day: "numeric" })} · {when(a.checkedInAt)}
                        {a.photo && <img className="ww-tour-popup-photo" src={a.photo} alt="" />}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            )}
            <div className="ww-portal-table-wrap">
              <table className="ww-portal-table">
                <thead>
                  <tr>
                    <th>{t("colDate")}</th>
                    <th>{t("colTrip")}</th>
                    <th>{t("colStatus")}</th>
                    <th>{t("colCheckIn")}</th>
                    <th>{t("colPhoto")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attendance.map((a, i) => (
                    <tr key={i}>
                      <td>{formatDate(a.date + "T00:00:00", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td>{a.tripDestination || a.tripTitle}</td>
                      <td>
                        {a.present
                          ? <span className="ww-portal-badge ok">{t("presentLabel")}</span>
                          : <span className="ww-portal-badge muted">{t("absentLabel")}</span>}
                      </td>
                      <td>
                        {a.markedManually ? (
                          <small>{t("markedByOrganizer")}</small>
                        ) : a.checkedInAt ? (
                          <small>
                            {when(a.checkedInAt)}
                            {a.distanceMeters != null && ` · ${a.distanceMeters} m`}
                            {a.latitude != null && (
                              <>
                                {" · "}
                                <a href={`https://www.openstreetmap.org/?mlat=${a.latitude}&mlon=${a.longitude}#map=18/${a.latitude}/${a.longitude}`}
                                  target="_blank" rel="noreferrer">{t("viewOnMap")}</a>
                              </>
                            )}
                          </small>
                        ) : "—"}
                      </td>
                      <td>
                        {a.photo ? (
                          <button type="button" className="ww-tour-photo-thumb" style={{ backgroundImage: `url(${a.photo})` }}
                            onClick={() => setPhoto({ src: a.photo, caption: `${a.tripDestination || ""} · ${when(a.checkedInAt)}` })}
                            aria-label={t("colPhoto")} />
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Journals */}
      <section className="ww-portal-card">
        <div className="ww-portal-card-head"><h2>📖 {t("journalsTitle")}</h2></div>
        {data.journals.length === 0 ? (
          <p className="ww-expense-empty">{t("noJournalsStudent")}</p>
        ) : (
          <div className="ww-portal-list">
            {data.journals.map((j) => (
              <div key={j.id} className={`ww-portal-row ${j.isHidden ? "" : "clickable"}`}
                onClick={() => !j.isHidden && navigate(`/journal/view/${j.id}`)}>
                <div className="ww-portal-row-main">
                  <strong>{j.title || t("untitledLabel")}</strong>
                  <span className="ww-portal-row-meta">
                    <span>📅 {formatDate(toLocalDate(j.createdAt))}</span>
                    <span>📌 {j.placesCount} {t("placesShort")}</span>
                    {j.isHidden && <span className="ww-portal-badge danger">{t("hiddenByAdmin")}</span>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {photo && (
        <div className="ww-modal-overlay" onClick={() => setPhoto(null)}>
          <div className="ww-modal-card ww-tour-photo-modal" onClick={(e) => e.stopPropagation()}>
            <p className="ww-tour-photo-caption"><strong>{fullName(s)}</strong> · {photo.caption}</p>
            <img src={photo.src} alt="" />
            <div className="ww-modal-actions">
              <button type="button" className="ww-modal-cancel-btn" onClick={() => setPhoto(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
