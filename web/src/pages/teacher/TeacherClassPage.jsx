import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useDialog } from "../../context/DialogContext";
import { api, fullName, initials, toLocalDate } from "../../utils/portal";
import { keepTerm, termProblem } from "../../utils/validation";
import ClassSummaryTab from "./ClassSummaryTab";
import "../../App.css";
import Icon from "../../components/Icon";

// One class in the Teacher portal ("viewing only"):
// Summary (class at a glance + CSV export) · Students (→ each student's
// itinerary, attendance, journals) · Announcements
const TABS = ["summary", "students", "announcements"];

export default function TeacherClassPage() {
  return (
    <div className="ww-portal-page">
      <PortalHeader />
      <RoleGate need="teacher">
        <TeacherClass />
      </RoleGate>
    </div>
  );
}

function TeacherClass() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { confirm } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "summary";

  const [cls, setCls] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", section: "", term: "" });
  const [copied, setCopied] = useState(false);

  const loadClass = useCallback(async () => {
    const r = await api(`/api/classes/${classId}`);
    if (r.ok && r.data?.myRole === "teacher") {
      setCls(r.data);
      setForm({ name: r.data.name || "", section: r.data.section || "", term: r.data.term || "" });
    } else setNotFound(true);
  }, [classId]);

  useEffect(() => {
    loadClass();
  }, [loadClass]);

  const setTab = (next) => setSearchParams(next === "summary" ? {} : { tab: next }, { replace: true });

  const saveClass = async (e) => {
    e.preventDefault();
    if (termProblem(form.term)) return;
    const r = await api(`/api/teacher/classes/${classId}`, { method: "PUT", body: form });
    if (r.ok) {
      setEditing(false);
      loadClass();
    }
  };

  const newCode = async () => {
    if (!(await confirm(t("confirmNewCode")))) return;
    const r = await api(`/api/teacher/classes/${classId}/new-code`, { method: "POST" });
    if (r.ok) setCls((c) => ({ ...c, joinCode: r.data.joinCode }));
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(cls.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — the code is on screen anyway
    }
  };

  const deleteClass = async () => {
    if (!(await confirm(t("confirmDeleteClass"), { danger: true, confirmLabel: t("dialogDelete") }))) return;
    const r = await api(`/api/teacher/classes/${classId}`, { method: "DELETE" });
    if (r.ok) navigate("/teacher");
  };

  if (notFound) {
    return (
      <main className="ww-portal-main">
        <p className="ww-stories-back" onClick={() => navigate("/teacher")}><Icon name="arrow-left" /> {t("backToClasses")}</p>
        <p className="ww-expense-empty">{t("classNotFound")}</p>
      </main>
    );
  }
  if (!cls) return <main className="ww-portal-main"><p className="ww-expense-empty">{t("loadingEllipsis")}</p></main>;

  return (
    <main className="ww-portal-main">
      <p className="ww-stories-back" onClick={() => navigate("/teacher")}><Icon name="arrow-left" /> {t("backToClasses")}</p>

      <section className="ww-portal-class-head">
        {editing ? (
          <form className="ww-portal-form" onSubmit={saveClass}>
            <div className="ww-portal-form-grid">
              <label>{t("classNameLabel")} *
                <input className="ww-field-input" value={form.name} maxLength={150} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>{t("sectionLabel")}
                <input className="ww-field-input" value={form.section} maxLength={100} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </label>
              <label>{t("termLabel")}
                <input className="ww-field-input" value={form.term} maxLength={9} inputMode="numeric" placeholder={t("termPlaceholder")} onChange={(e) => setForm({ ...form, term: keepTerm(e.target.value) })} />
                {termProblem(form.term) && <span className="ww-portal-error">{t("valTerm")}</span>}
              </label>
            </div>
            <div className="ww-portal-actions">
              <button type="button" className="ww-booking-cancel" onClick={() => setEditing(false)}>{t("cancel")}</button>
              <button type="submit" className="ww-search-btn" disabled={!form.name.trim() || !!termProblem(form.term)}>{t("save")}</button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <h1 className="ww-portal-title">{cls.name}</h1>
              <p className="ww-portal-muted">
                {[cls.section, cls.term].filter(Boolean).join(" · ")}
                {(cls.section || cls.term) && " · "}
                {cls.studentCount} {t("statStudents").toLowerCase()}
              </p>
            </div>
            <div className="ww-portal-join">
              <span className="ww-portal-join-label">{t("joinCodeLabel")}</span>
              <code className="ww-portal-code big">{cls.joinCode}</code>
              <div className="ww-portal-join-actions">
                <button type="button" className="ww-link-btn" onClick={copyCode}>{copied ? <><Icon name="check" /> {t("linkCopied")}</> : t("copy")}</button>
                <button type="button" className="ww-link-btn" onClick={newCode}>{t("newCode")}</button>
                <button type="button" className="ww-link-btn" onClick={() => setEditing(true)}>{t("edit")}</button>
                <button type="button" className="ww-link-btn danger" onClick={deleteClass}>{t("dialogDelete")}</button>
              </div>
              <p className="ww-portal-hint">{t("joinCodeHint")}</p>
            </div>
          </>
        )}
      </section>

      <div className="ww-portal-tabs" role="tablist">
        {TABS.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
            className={`ww-portal-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {t(`tab_${key}`)}
          </button>
        ))}
      </div>

      {tab === "summary" && <ClassSummaryTab classId={classId} className={cls.name} />}
      {tab === "students" && <StudentsTab cls={cls} reload={loadClass} />}
      {tab === "announcements" && <AnnouncementsTab classId={classId} canPost />}
    </main>
  );
}

// ---------------- Students ----------------
function StudentsTab({ cls, reload }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { confirm } = useDialog();
  const [filter, setFilter] = useState("");

  const remove = async (s) => {
    if (!(await confirm(`${t("confirmRemoveStudent")} ${fullName(s)}?`, { danger: true, confirmLabel: t("removeLabel") }))) return;
    const r = await api(`/api/teacher/classes/${cls.id}/students/${s.userId}`, { method: "DELETE" });
    if (r.ok) reload();
  };

  const students = (cls.students || []).filter((s) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return `${fullName(s)} ${s.studentNumber} ${s.email}`.toLowerCase().includes(q);
  });

  return (
    <section className="ww-portal-card">
      {/* Students join themselves with the class code (their consent). */}
      <p className="ww-portal-hint">
        {t("studentsJoinWithCode")} <code className="ww-portal-code">{cls.joinCode}</code>
      </p>

      {(cls.students || []).length === 0 ? (
        <div className="ww-portal-empty">
          <span><Icon name="user" /></span>
          <p>{t("noStudentsYet")}</p>
        </div>
      ) : (
        <>
          <input className="ww-field-input ww-portal-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("searchStudents")} />
          <div className="ww-portal-table-wrap">
            <table className="ww-portal-table">
              <thead>
                <tr>
                  <th>{t("colStudent")}</th>
                  <th>{t("colStudentNo")}</th>
                  <th className="num">{t("colTrips")}</th>
                  <th className="num">{t("colCheckIns")}</th>
                  <th className="num">{t("colJournals")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.userId} className="clickable" onClick={() => navigate(`/teacher/class/${cls.id}/student/${s.userId}`)}>
                    <td>
                      <span className="ww-portal-person">
                        <Avatar person={s} />
                        <span>
                          <strong>{fullName(s)}</strong>
                          <small>{s.email}</small>
                        </span>
                      </span>
                    </td>
                    <td><code>{s.studentNumber}</code></td>
                    <td className="num">{s.tripsCount}</td>
                    <td className="num">{s.checkInsCount}</td>
                    <td className="num">{s.journalsCount}</td>
                    <td className="num">
                      <button type="button" className="ww-cost-remove" title={t("removeLabel")}
                        onClick={(e) => { e.stopPropagation(); remove(s); }}><Icon name="x" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export function Avatar({ person, size = 36 }) {
  return person?.avatarUrl ? (
    <img className="ww-portal-avatar" src={person.avatarUrl} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="ww-portal-avatar" style={{ width: size, height: size }}>{initials(person)}</span>
  );
}

// ---------------- Announcements (teacher posts, students read) ----------------
export function AnnouncementsTab({ classId, canPost }) {
  const { t } = useLanguage();
  const { confirm } = useDialog();
  const { formatDate, formatTime } = usePreferences();
  const [items, setItems] = useState(null);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const r = await api(`/api/classes/${classId}/announcements`);
    setItems(r.ok ? r.data : []);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setPosting(true);
    const r = await api(`/api/classes/${classId}/announcements`, { method: "POST", body: { message } });
    setPosting(false);
    if (r.ok) {
      setMessage("");
      load();
    }
  };

  const remove = async (a) => {
    if (!(await confirm(t("confirmDeleteAnnouncement"), { danger: true, confirmLabel: t("dialogDelete") }))) return;
    const r = await api(`/api/classes/${classId}/announcements/${a.id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  const when = (v) => {
    const d = toLocalDate(v);
    return d ? `${formatDate(d, { month: "short", day: "numeric", year: "numeric" })} · ${formatTime ? formatTime(d) : d.toLocaleTimeString()}` : "";
  };

  return (
    <section className="ww-portal-card">
      {canPost && (
        <form className="ww-portal-form" onSubmit={post}>
          <textarea className="ww-journal-tips-input" value={message} maxLength={2000}
            onChange={(e) => setMessage(e.target.value)} placeholder={t("classAnnouncementPlaceholder")} />
          <div className="ww-portal-actions">
            <span className="ww-portal-hint">{t("classAnnouncementHint")}</span>
            <button type="submit" className="ww-search-btn" disabled={posting || !message.trim()}>
              <Icon name="megaphone" /> {posting ? t("savingEllipsis") : t("postAnnouncement")}
            </button>
          </div>
        </form>
      )}
      {items === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : items.length === 0 ? (
        <div className="ww-portal-empty"><span><Icon name="megaphone" /></span><p>{t("noAnnouncementsYet")}</p></div>
      ) : (
        <ul className="ww-tour-announcements ww-portal-announcements">
          {items.map((a) => (
            <li key={a.id}>
              <div className="ww-tour-announcement-head">
                <strong>{a.authorName}</strong>
                <span>{when(a.createdAt)}</span>
                {canPost && (
                  <button type="button" className="ww-cost-remove" onClick={() => remove(a)} title={t("dialogDelete")}><Icon name="x" /></button>
                )}
              </div>
              <p>{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}