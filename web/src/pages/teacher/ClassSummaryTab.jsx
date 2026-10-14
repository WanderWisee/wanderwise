import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { api, fullName, initials, toLocalDate } from "../../utils/portal";
import { Stat } from "./TeacherHomePage";
import Icon from "../../components/Icon";

// Summary tab of a class (teacher): how the whole class is doing at a
// glance, who needs a nudge, attendance per tour day, and CSV exports.
export default function ClassSummaryTab({ classId, className }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [openDay, setOpenDay] = useState(null);

  useEffect(() => {
    let alive = true;
    api(`/api/teacher/classes/${classId}/summary`).then((r) => {
      if (!alive) return;
      if (r.ok) setData(r.data);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [classId]);

  const byId = useMemo(() => {
    const map = {};
    (data?.students || []).forEach((s) => (map[s.userId] = s));
    return map;
  }, [data]);

  if (failed) return <section className="ww-portal-card"><p className="ww-portal-error">{t("portalLoadFailed")}</p></section>;
  if (!data) return <section className="ww-portal-card"><p className="ww-expense-empty">{t("loadingEllipsis")}</p></section>;

  const students = data.students;
  const total = students.length;
  const withTrip = students.filter((s) => s.tripsCount > 0).length;
  const checkedIn = students.filter((s) => s.presentDays > 0).length;
  const withJournal = students.filter((s) => s.journalsCount > 0).length;

  // Students to nudge: no trip, no journal, or missed a tour day.
  const attention = students
    .map((s) => {
      const flags = [];
      if (s.tripsCount === 0) flags.push({ tone: "warn", text: t("flagNoTrip") });
      if (s.missedDays > 0) flags.push({ tone: "danger", text: `${s.missedDays} ${t("flagMissed")}` });
      if (s.journalsCount === 0) flags.push({ tone: "muted", text: t("flagNoJournal") });
      return { s, flags };
    })
    .filter((x) => x.flags.length > 0)
    .sort((a, b) => b.flags.length - a.flags.length);

  const dayLabel = (iso) => formatDate(new Date(`${iso}T00:00:00`), { month: "short", day: "numeric", year: "numeric" });
  const openStudent = (id) => navigate(`/teacher/class/${classId}/student/${id}`);

  return (
    <>
      <div className="ww-portal-stats">
        <Stat icon="user" value={total} label={t("statStudents")} />
        <Stat icon="map" value={`${withTrip}/${total}`} label={t("summaryWithTrip")} tone={withTrip < total ? "warn" : ""} />
        <Stat icon="check-circle" value={`${checkedIn}/${total}`} label={t("summaryCheckedIn")} />
        <Stat icon="book-open" value={`${withJournal}/${total}`} label={t("summaryWithJournal")} tone={withJournal < total ? "warn" : ""} />
      </div>

      {/* Exports */}
      <section className="ww-portal-card">
        <div className="ww-portal-card-head">
          <h2><Icon name="download" /> {t("exportTitle")}</h2>
          <div className="ww-portal-actions ww-portal-export-actions">
            <button type="button" className="ww-booking-cancel" disabled={total === 0}
              onClick={() => exportRoster(data, className)}>
              {t("exportRoster")}
            </button>
            <button type="button" className="ww-search-btn" disabled={data.attendance.length === 0}
              onClick={() => exportAttendance(data, className)}>
              {t("exportAttendance")}
            </button>
          </div>
        </div>
        <p className="ww-portal-hint">{t("exportHint")}</p>
      </section>

      {/* Needs attention */}
      <section className="ww-portal-card">
        <div className="ww-portal-card-head"><h2><Icon name="bell" /> {t("summaryNeedsAttention")}</h2></div>
        {total === 0 ? (
          <p className="ww-expense-empty">{t("noStudentsYet")}</p>
        ) : attention.length === 0 ? (
          <p className="ww-portal-ok">{t("summaryAllGood")}</p>
        ) : (
          <div className="ww-portal-list">
            {attention.map(({ s, flags }) => (
              <div key={s.userId} className="ww-portal-row clickable" onClick={() => openStudent(s.userId)}>
                <div className="ww-portal-row-main">
                  <span className="ww-portal-person">
                    <MiniAvatar person={s} />
                    <span>
                      <strong>{fullName(s)}</strong>
                      <small>{s.studentNumber}</small>
                    </span>
                  </span>
                </div>
                <div className="ww-portal-row-actions">
                  {flags.map((f) => (
                    <span key={f.text} className={`ww-portal-badge ${f.tone}`}>{f.text}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Attendance per tour day */}
      <section className="ww-portal-card">
        <div className="ww-portal-card-head"><h2><Icon name="compass" /> {t("summaryTourDays")}</h2></div>
        {data.tourDays.length === 0 ? (
          <p className="ww-expense-empty">{t("summaryNoTourDays")}</p>
        ) : (
          <div className="ww-portal-table-wrap">
            <table className="ww-portal-table">
              <thead>
                <tr>
                  <th>{t("colDate")}</th>
                  <th>{t("colTrip")}</th>
                  <th>{t("colMeetingPlace")}</th>
                  <th>{t("colPresent")}</th>
                </tr>
              </thead>
              <tbody>
                {data.tourDays.map((d) => {
                  const key = `${d.tripId}:${d.date}`;
                  const isOpen = openDay === key;
                  const pct = d.expected ? Math.round((d.present / d.expected) * 100) : 0;
                  return (
                    <React.Fragment key={key}>
                      <tr className="clickable" onClick={() => setOpenDay(isOpen ? null : key)}>
                        <td className="nowrap">
                          {dayLabel(d.date)}
                          {d.upcoming && <span className="ww-portal-badge muted">{t("upcomingTag")}</span>}
                        </td>
                        <td>
                          {d.tripTitle || d.destination || "—"}
                          {d.isClassTrip && <span className="ww-portal-badge"><Icon name="bus" /> {t("fieldTripTag")}</span>}
                        </td>
                        <td>{d.meetingPlace || "—"}</td>
                        <td>
                          <div className="ww-portal-day-present">
                            <span className="ww-portal-bar"><span style={{ width: `${pct}%` }} /></span>
                            <strong>{d.present}/{d.expected}</strong>
                            <span className="ww-portal-day-caret">{isOpen ? "▴" : "▾"}</span>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="ww-portal-day-detail">
                          <td colSpan={4}>
                            {d.absentIds.length === 0 ? (
                              <span className="ww-portal-ok"><Icon name="check" /> {t("everyoneCheckedIn")}</span>
                            ) : (
                              <>
                                <span className="ww-portal-muted">{t("notCheckedIn")}:</span>
                                {d.absentIds.map((id) => (
                                  <button key={id} type="button" className="ww-portal-badge danger ww-portal-name-chip"
                                    onClick={() => openStudent(id)}>
                                    {fullName(byId[id])}
                                  </button>
                                ))}
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function MiniAvatar({ person }) {
  return person?.avatarUrl ? (
    <img className="ww-portal-avatar" src={person.avatarUrl} alt="" style={{ width: 36, height: 36 }} />
  ) : (
    <span className="ww-portal-avatar" style={{ width: 36, height: 36 }}>{initials(person)}</span>
  );
}

// ---------------- CSV export ----------------

function stamp(value) {
  const d = toLocalDate(value);
  if (!d) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fileBase(className) {
  return (className || "class").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "class";
}

function downloadCsv(filename, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  // The BOM makes Excel read ñ and other accents correctly.
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportRoster(data, className) {
  const rows = [[
    "Last name", "First name", "Student number", "Email", "Trips",
    "Tour days so far", "Checked in", "Missed", "Journals", "Last check-in", "Last journal",
  ]];
  data.students.forEach((s) => rows.push([
    s.lastName, s.firstName, s.studentNumber, s.email, s.tripsCount,
    s.tourDaysSoFar, s.presentDays, s.missedDays, s.journalsCount,
    stamp(s.lastCheckInAt), stamp(s.lastJournalAt),
  ]));
  downloadCsv(`${fileBase(className)}_roster.csv`, rows);
}

function exportAttendance(data, className) {
  const rows = [[
    "Date", "Trip", "Last name", "First name", "Student number",
    "Status", "Check-in time", "Distance from meeting point (m)", "Marked by trip owner",
  ]];
  data.attendance.forEach((a) => rows.push([
    a.date, a.tripTitle, a.lastName, a.firstName, a.studentNumber,
    a.present ? "Present" : a.upcoming ? "Upcoming" : "Absent",
    stamp(a.checkedInAt),
    a.distanceMeters ?? "",
    a.present ? (a.markedManually ? "Yes" : "No") : "",
  ]));
  downloadCsv(`${fileBase(className)}_attendance.csv`, rows);
}