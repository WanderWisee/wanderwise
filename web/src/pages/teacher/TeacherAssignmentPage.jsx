import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { api, fullName, peso, toLocalDate } from "../../utils/portal";
import { Avatar } from "./TeacherClassPage";
import "../../App.css";

// Teacher: one assignment — who handed in which trip, a quick summary of
// that trip (days, places, budget vs. spent) and the score + feedback.
export default function TeacherAssignmentPage() {
  return (
    <div className="ww-portal-page">
      <PortalHeader />
      <RoleGate need="teacher">
        <AssignmentGrading />
      </RoleGate>
    </div>
  );
}

function AssignmentGrading() {
  const { classId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDate, formatTime, formatDateRange } = usePreferences();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [filter, setFilter] = useState("all"); // all | todo | graded | missing

  const load = useCallback(async () => {
    const r = await api(`/api/classes/${classId}/assignments/${assignmentId}/submissions`);
    if (r.ok) setData(r.data);
    else setNotFound(true);
  }, [classId, assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () => navigate(`/teacher/class/${classId}?tab=assignments`);

  if (notFound) {
    return (
      <main className="ww-portal-main">
        <p className="ww-stories-back" onClick={back}>← {t("backToClass")}</p>
        <p className="ww-expense-empty">{t("assignmentNotFound")}</p>
      </main>
    );
  }
  if (!data) return <main className="ww-portal-main"><p className="ww-expense-empty">{t("loadingEllipsis")}</p></main>;

  const a = data.assignment;
  const due = toLocalDate(a.dueAt);
  const rows = data.rows.filter((r) => {
    if (filter === "todo") return r.submission && r.submission.score == null;
    if (filter === "graded") return r.submission && r.submission.score != null;
    if (filter === "missing") return !r.submission;
    return true;
  });
  const counts = {
    all: data.rows.length,
    todo: data.rows.filter((r) => r.submission && r.submission.score == null).length,
    graded: data.rows.filter((r) => r.submission && r.submission.score != null).length,
    missing: data.rows.filter((r) => !r.submission).length,
  };

  return (
    <main className="ww-portal-main">
      <p className="ww-stories-back" onClick={back}>← {a.className}</p>

      <section className="ww-portal-card">
        <p className="ww-portal-eyebrow">📝 {t("tab_assignments")}</p>
        <h1 className="ww-portal-title">{a.title}</h1>
        <p className="ww-portal-row-meta">
          {due && <span className="ww-portal-badge">⏰ {t("dueLabel")}: {formatDate(due)} {formatTime(due)}</span>}
          {a.destination && <span>📍 {a.destination}</span>}
          {a.budgetLimit != null && <span>💰 ≤ {peso(a.budgetLimit)}</span>}
          <span>🏅 {a.points} {t("pointsShort")}</span>
        </p>
        {a.instructions && <p className="ww-portal-instructions">{a.instructions}</p>}
      </section>

      <div className="ww-portal-tabs">
        {["all", "todo", "graded", "missing"].map((k) => (
          <button key={k} type="button" className={`ww-portal-tab ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>
            {t(`filter_${k}`)} <span className="ww-portal-tab-count">{counts[k]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="ww-expense-empty">{t("nothingHere")}</p>
      ) : (
        <div className="ww-portal-list">
          {rows.map((r) => (
            <SubmissionCard key={r.student.userId} row={r} assignment={a} classId={classId}
              onSaved={load} formatDate={formatDate} formatTime={formatTime} formatDateRange={formatDateRange} />
          ))}
        </div>
      )}
    </main>
  );
}

function SubmissionCard({ row, assignment, classId, onSaved, formatDate, formatTime, formatDateRange }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const s = row.submission;
  const [score, setScore] = useState(s?.score ?? "");
  const [feedback, setFeedback] = useState(s?.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    const value = score === "" ? null : Number(score);
    if (value != null && (value < 0 || value > assignment.points)) {
      return setError(`${t("scoreRange")} 0–${assignment.points}`);
    }
    setSaving(true);
    const r = await api(`/api/teacher/submissions/${s.id}/grade`, { method: "PUT", body: { score: value, feedback } });
    setSaving(false);
    if (!r.ok) return setError(t("portalSaveFailed"));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  };

  const trip = s?.trip;
  const overBudget = trip && assignment.budgetLimit != null && Number(trip.spent) > Number(assignment.budgetLimit);
  const submittedAt = toLocalDate(s?.submittedAt);

  return (
    <div className="ww-portal-row ww-portal-submission">
      <div className="ww-portal-row-main">
        <span className="ww-portal-person">
          <Avatar person={row.student} />
          <span>
            <strong className="ww-link-text" onClick={() => navigate(`/teacher/class/${classId}/student/${row.student.userId}`)}>
              {fullName(row.student)}
            </strong>
            <small>{row.student.studentNumber}</small>
          </span>
          {!s ? (
            <span className="ww-portal-badge muted">{t("notSubmitted")}</span>
          ) : s.score != null ? (
            <span className="ww-portal-badge ok">{t("gradedLabel")} · {s.score}/{assignment.points}</span>
          ) : (
            <span className="ww-portal-badge warn">{t("toGrade")}</span>
          )}
          {s?.late && <span className="ww-portal-badge danger">{t("lateLabel")}</span>}
        </span>

        {s && (
          <>
            <p className="ww-portal-muted small">
              {t("submittedOn")} {submittedAt ? `${formatDate(submittedAt, { month: "short", day: "numeric" })} ${formatTime(submittedAt)}` : ""}
            </p>
            {trip && (
              <div className="ww-portal-trip-summary" onClick={() => navigate(`/trip-plan?tripId=${trip.id}`)}>
                <strong>🗺️ {trip.title || trip.destination}</strong>
                <span>
                  📍 {trip.destination}
                  {trip.startDate && ` · 📅 ${formatDateRange(trip.startDate + "T00:00:00", (trip.endDate || trip.startDate) + "T00:00:00")}`}
                  {trip.days != null && ` · ${trip.days} ${t("daysShort")}`}
                </span>
                <span>
                  📌 {trip.placesCount} {t("placesShort")} · 💰 {peso(trip.spent)} / {peso(trip.budgetTotal)}
                  {overBudget && <em className="ww-portal-over"> · {t("overAssignmentBudget")}</em>}
                </span>
                <span className="ww-link-text">{t("openItinerary")} →</span>
              </div>
            )}
            {s.note && <p className="ww-portal-note">“{s.note}”</p>}
          </>
        )}
      </div>

      {s && (
        <div className="ww-portal-grade">
          <label>
            {t("scoreLabel")}
            <span className="ww-portal-score">
              <input type="number" min="0" max={assignment.points} step="0.5" className="ww-field-input"
                value={score} onChange={(e) => setScore(e.target.value)} />
              <span>/ {assignment.points}</span>
            </span>
          </label>
          <label>
            {t("feedbackLabel")}
            <textarea className="ww-journal-tips-input" value={feedback} onChange={(e) => setFeedback(e.target.value)}
              placeholder={t("feedbackPlaceholder")} />
          </label>
          {error && <p className="ww-portal-error">{error}</p>}
          <button type="button" className="ww-search-btn" onClick={save} disabled={saving}>
            {saved ? `✓ ${t("savedLabel")}` : saving ? t("savingEllipsis") : t("saveGrade")}
          </button>
        </div>
      )}
    </div>
  );
}
