import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useDialog } from "../../context/DialogContext";
import { api, fullName, toLocalDate } from "../../utils/portal";
import { AnnouncementsTab, AssignmentRow, Avatar } from "../teacher/TeacherClassPage";
import "../../App.css";

// Student view of one class: announcements and assignments (hand in a
// trip, see the grade + feedback).
const TABS = ["announcements", "assignments"];

export default function ClassViewPage() {
  return (
    <div className="ww-portal-page">
      <PortalHeader />
      <RoleGate need="student">
        <ClassView />
      </RoleGate>
    </div>
  );
}

function ClassView() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "announcements";
  const [cls, setCls] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api(`/api/classes/${classId}`).then((r) => {
      if (cancelled) return;
      if (r.ok) setCls(r.data);
      else setNotFound(true);
    });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const setTab = (next) => setSearchParams(next === "announcements" ? {} : { tab: next }, { replace: true });

  if (notFound) {
    return (
      <main className="ww-portal-main">
        <p className="ww-stories-back" onClick={() => navigate("/classes")}>← {t("myClasses")}</p>
        <p className="ww-expense-empty">{t("classNotFound")}</p>
      </main>
    );
  }
  if (!cls) return <main className="ww-portal-main"><p className="ww-expense-empty">{t("loadingEllipsis")}</p></main>;

  return (
    <main className="ww-portal-main">
      <p className="ww-stories-back" onClick={() => navigate("/classes")}>← {t("myClasses")}</p>
      <section className="ww-portal-class-head">
        <div>
          <h1 className="ww-portal-title">{cls.name}</h1>
          <p className="ww-portal-muted">{[cls.section, cls.term].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="ww-portal-person">
          <Avatar person={cls.teacher} size={44} />
          <span>
            <small>{t("teacherLabel")}</small>
            <strong>{fullName(cls.teacher)}</strong>
            <small>{cls.teacher?.email}</small>
          </span>
        </div>
      </section>

      <div className="ww-portal-tabs" role="tablist">
        {TABS.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
            className={`ww-portal-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {t(`tab_${key}`)}
          </button>
        ))}
      </div>

      {tab === "announcements" && <AnnouncementsTab classId={classId} canPost={false} />}
      {tab === "assignments" && <StudentAssignments classId={classId} />}
    </main>
  );
}

function StudentAssignments({ classId }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { confirm } = useDialog();
  const { formatDate, formatTime } = usePreferences();
  const [items, setItems] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [pick, setPick] = useState({ tripId: "", note: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await api(`/api/classes/${classId}/assignments`);
    setItems(r.ok ? r.data : []);
  }, [classId]);

  useEffect(() => {
    load();
    api("/api/trips").then((r) => {
      if (r.ok) setMyTrips((r.data || []).filter((x) => x.isOwner !== false));
    });
  }, [load]);

  const open = (a) => {
    setOpenId(openId === a.id ? null : a.id);
    setPick({ tripId: a.mySubmission?.tripId ? String(a.mySubmission.tripId) : "", note: a.mySubmission?.note || "" });
    setError("");
  };

  const submit = async (a) => {
    if (!pick.tripId) return setError(t("pickTripFirst"));
    setSaving(true);
    const r = await api(`/api/classes/${classId}/assignments/${a.id}/submit`, {
      method: "POST",
      body: { tripId: Number(pick.tripId), note: pick.note },
    });
    setSaving(false);
    if (!r.ok) return setError(r.status === 409 ? t("alreadyGraded") : t("portalSaveFailed"));
    setOpenId(null);
    load();
  };

  const unsubmit = async (a) => {
    if (!(await confirm(t("confirmUnsubmit")))) return;
    const r = await api(`/api/classes/${classId}/assignments/${a.id}/submit`, { method: "DELETE" });
    if (r.ok) load();
  };

  if (items === null) return <p className="ww-expense-empty">{t("loadingEllipsis")}</p>;
  if (items.length === 0) {
    return <section className="ww-portal-card"><div className="ww-portal-empty"><span>📝</span><p>{t("noAssignmentsYet")}</p></div></section>;
  }

  return (
    <section className="ww-portal-card">
      <div className="ww-portal-list">
        {items.map((a) => {
          const sub = a.mySubmission;
          const graded = sub?.score != null;
          return (
            <div key={a.id} className="ww-portal-assignment">
              <AssignmentRow a={a} onOpen={() => open(a)}
                actions={
                  !sub ? <span className="ww-portal-badge warn">{t("notSubmitted")}</span>
                    : graded ? <span className="ww-portal-badge ok">🏅 {sub.score}/{a.points}</span>
                    : <span className="ww-portal-badge">{t("handedInLabel")}</span>
                } />
              {openId === a.id && (
                <div className="ww-portal-subcard">
                  {a.instructions && <p className="ww-portal-instructions">{a.instructions}</p>}

                  {sub && (
                    <div className="ww-portal-my-sub">
                      <p>
                        ✅ {t("youHandedIn")}{" "}
                        <span className="ww-link-text" onClick={() => navigate(`/trip-plan?tripId=${sub.tripId}`)}>
                          {sub.tripTitle || sub.tripDestination}
                        </span>{" "}
                        · {(() => { const d = toLocalDate(sub.submittedAt); return d ? `${formatDate(d, { month: "short", day: "numeric" })} ${formatTime(d)}` : ""; })()}
                        {sub.late && <span className="ww-portal-badge danger">{t("lateLabel")}</span>}
                      </p>
                      {graded && (
                        <div className="ww-portal-feedback">
                          <strong>🏅 {sub.score}/{a.points}</strong>
                          {sub.feedback && <p>{sub.feedback}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {!graded && (
                    <div className="ww-portal-form">
                      <label>
                        {t("pickTripLabel")}
                        <select className="ww-field-input" value={pick.tripId} onChange={(e) => setPick({ ...pick, tripId: e.target.value })}>
                          <option value="">— {t("pickTripPlaceholder")} —</option>
                          {myTrips.map((trip) => (
                            <option key={trip.id} value={trip.id}>
                              {trip.title || trip.destination}{trip.destination && trip.title ? ` · ${trip.destination}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      {myTrips.length === 0 && (
                        <p className="ww-portal-hint">
                          {t("noOwnTrips")}{" "}
                          <span className="ww-link-text" onClick={() => navigate("/trip-planning")}>{t("planATrip")}</span>
                        </p>
                      )}
                      <label>
                        {t("noteToTeacher")}
                        <textarea className="ww-journal-tips-input" value={pick.note} maxLength={1000}
                          onChange={(e) => setPick({ ...pick, note: e.target.value })} placeholder={t("optionalLabel")} />
                      </label>
                      {error && <p className="ww-portal-error">{error}</p>}
                      <div className="ww-portal-actions">
                        {sub && (
                          <button type="button" className="ww-booking-cancel" onClick={() => unsubmit(a)}>{t("unsubmit")}</button>
                        )}
                        <button type="button" className="ww-search-btn" onClick={() => submit(a)} disabled={saving || !pick.tripId}>
                          {saving ? t("savingEllipsis") : sub ? t("resubmit") : t("handIn")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
