import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useDialog } from "../../context/DialogContext";
import { api, fullName, toLocalDate } from "../../utils/portal";
import { Avatar } from "../teacher/TeacherClassPage";
import { Stat } from "../teacher/TeacherHomePage";
import "../../App.css";

// ===== Admin panel =====
// Overview · Users (approve teachers, roles, deactivate) · Journals
// (hide/unhide) · Destinations & guides · Classes · Activity log
const TABS = ["overview", "users", "journals", "classes", "logs"];

export default function AdminPage() {
  return (
    <div className="ww-portal-page">
      <PortalHeader />
      <RoleGate need="admin">
        <Admin />
      </RoleGate>
    </div>
  );
}

function Admin() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "overview";
  const setTab = (next, extra = {}) =>
    setSearchParams(next === "overview" ? {} : { tab: next, ...extra }, { replace: true });

  return (
    <main className="ww-portal-main">
      <div className="ww-portal-hero">
        <div>
          <p className="ww-portal-eyebrow">🛡️ {t("adminPanel")}</p>
          <h1 className="ww-portal-title">{t("adminTitle")}</h1>
          <p className="ww-portal-muted">{t("adminIntro")}</p>
        </div>
      </div>

      <div className="ww-portal-tabs" role="tablist">
        {TABS.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
            className={`ww-portal-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {t(`admin_tab_${key}`)}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview goTo={setTab} />}
      {tab === "users" && <Users initialStatus={searchParams.get("status") || ""} />}
      {tab === "journals" && <Journals />}
      {tab === "classes" && <Classes />}
      {tab === "logs" && <Logs />}
    </main>
  );
}

// ---------------- Overview ----------------
function Overview({ goTo }) {
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const [d, setD] = useState(null);

  useEffect(() => {
    api("/api/admin/overview").then((r) => setD(r.ok ? r.data : false));
  }, []);

  if (d === null) return <p className="ww-expense-empty">{t("loadingEllipsis")}</p>;
  if (d === false) return <p className="ww-portal-error">{t("portalLoadFailed")}</p>;

  const maxTrips = Math.max(1, ...d.topDestinations.map((x) => x.trips));

  return (
    <>

      <div className="ww-portal-stats">
        <Stat icon="👥" value={d.users} label={t("statUsers")} />
        <Stat icon="👩‍🎓" value={d.students} label={t("statStudents")} />
        <Stat icon="🧑‍🏫" value={d.teachers} label={t("statTeachers")} />
        <Stat icon="🆕" value={d.newUsersThisWeek} label={t("statNewThisWeek")} />
        <Stat icon="🗺️" value={d.trips} label={t("colTrips")} />
        <Stat icon="📖" value={d.journals} label={t("colJournals")} />
        <Stat icon="🏫" value={d.classes} label={t("statClasses")} />
        <Stat icon="📍" value={d.destinations} label={t("statDestinations")} />
      </div>

      <div className="ww-portal-two-col">
        <section className="ww-portal-card">
          <div className="ww-portal-card-head"><h2>🩺 {t("systemHealth")}</h2></div>
          <ul className="ww-portal-health">
            <li><span>{t("loginsToday")}</span><strong>{d.loginsToday}</strong></li>
            <li className={d.failedLoginsToday > 10 ? "warn" : ""}><span>{t("failedLoginsToday")}</span><strong>{d.failedLoginsToday}</strong></li>
            <li className={d.errorsThisWeek > 0 ? "danger" : "ok"}>
              <span>{t("errorsThisWeek")}</span>
              <strong>{d.errorsThisWeek}</strong>
            </li>
            <li><span>{t("deactivatedAccounts")}</span><strong>{d.deactivated}</strong></li>
            <li><span>{t("hiddenJournals")}</span><strong>{d.hiddenJournals}</strong></li>
          </ul>
          {d.errorsThisWeek > 0 && (
            <button type="button" className="ww-link-btn" onClick={() => goTo("logs", { action: "server_error" })}>
              {t("seeErrors")} →
            </button>
          )}
        </section>

        <section className="ww-portal-card">
          <div className="ww-portal-card-head"><h2>🔥 {t("adminTopDestinations")}</h2></div>
          {d.topDestinations.length === 0 ? (
            <p className="ww-expense-empty">{t("nothingHere")}</p>
          ) : (
            <ul className="ww-portal-bars">
              {d.topDestinations.map((x) => (
                <li key={x.name}>
                  <span className="ww-portal-bar-label">{x.name}</span>
                  <span className="ww-portal-bar"><span style={{ width: `${(100 * x.trips) / maxTrips}%` }} /></span>
                  <strong>{x.trips}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="ww-portal-card">
        <div className="ww-portal-card-head"><h2>🆕 {t("recentSignups")}</h2></div>
        <div className="ww-portal-list">
          {d.recentUsers.map((u) => (
            <div key={u.id} className="ww-portal-row">
              <div className="ww-portal-row-main">
                <strong>{fullName(u)}</strong>
                <span className="ww-portal-row-meta">
                  <span>{u.email}</span>
                  <RoleBadge role={u.role} />
                  <StatusBadge status={u.status} />
                  <span>{formatDate(toLocalDate(u.createdAt), { month: "short", day: "numeric", year: "numeric" })}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function RoleBadge({ role }) {
  const { t } = useLanguage();
  const icon = role === "admin" ? "🛡️" : role === "teacher" ? "🧑‍🏫" : "👩‍🎓";
  return <span className={`ww-portal-badge role-${role}`}>{icon} {t(`role_${role}`)}</span>;
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const tone = status === "active" ? "ok" : status === "pending" ? "warn" : "danger";
  return <span className={`ww-portal-badge ${tone}`}>{t(`status_${status}`)}</span>;
}

// ---------------- Users ----------------
function Users({ initialStatus }) {
  const { t } = useLanguage();
  const { confirm } = useDialog();
  const { formatDate } = usePreferences();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [users, setUsers] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    const r = await api(`/api/admin/users?${params}`);
    setUsers(r.ok ? r.data : []);
  }, [q, role, status]);

  // Search as you type (small delay).
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const setUserStatus = async (u, next, question) => {
    if (question && !(await confirm(question, { danger: next === "deactivated" }))) return;
    setBusyId(u.id);
    setError("");
    const r = await api(`/api/admin/users/${u.id}/status`, { method: "PUT", body: { status: next } });
    setBusyId(null);
    if (!r.ok) return setError(t("portalSaveFailed"));
    load();
  };

  return (
    <section className="ww-portal-card">
      <div className="ww-portal-filters">
        <input className="ww-field-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchUsers")} />
        <select className="ww-field-input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">{t("allRoles")}</option>
          <option value="student">{t("role_student")}</option>
          <option value="teacher">{t("role_teacher")}</option>
          <option value="admin">{t("role_admin")}</option>
        </select>
        <select className="ww-field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("allStatuses")}</option>
          <option value="active">{t("status_active")}</option>
          <option value="deactivated">{t("status_deactivated")}</option>
        </select>
      </div>
      {error && <p className="ww-portal-error">{error}</p>}

      {users === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : users.length === 0 ? (
        <p className="ww-expense-empty">{t("nothingHere")}</p>
      ) : (
        <div className="ww-portal-table-wrap">
          <table className="ww-portal-table">
            <thead>
              <tr>
                <th>{t("colUser")}</th>
                <th>{t("colIdNo")}</th>
                <th>{t("colRole")}</th>
                <th>{t("colStatus")}</th>
                <th className="num">{t("colTrips")}</th>
                <th>{t("colJoined")}</th>
                <th>{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="ww-portal-person">
                      <Avatar person={u} size={32} />
                      <span>
                        <strong>{fullName(u)} {u.isMe && <small>({t("youLabel")})</small>}</strong>
                        <small>{u.email}</small>
                      </span>
                    </span>
                  </td>
                  <td><code>{u.studentNumber}</code></td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="num">{u.tripsCount}</td>
                  <td>{formatDate(toLocalDate(u.createdAt), { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td>
                    {u.isMe || u.role === "admin" ? null : u.status === "active" ? (
                      <button type="button" className="ww-link-btn danger" disabled={busyId === u.id}
                        onClick={() => setUserStatus(u, "deactivated", `${t("confirmDeactivate")} ${fullName(u)}?`)}>
                        {t("deactivate")}
                      </button>
                    ) : (
                      <button type="button" className="ww-link-btn" disabled={busyId === u.id}
                        onClick={() => setUserStatus(u, "active")}>
                        {t("reactivate")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------- Journals ----------------
function Journals() {
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const [q, setQ] = useState("");
  const [show, setShow] = useState(""); // "" | "visible" | "hidden"
  const [items, setItems] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [hiding, setHiding] = useState(null); // journal being hidden
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (show) params.set("hidden", show === "hidden" ? "true" : "false");
    const r = await api(`/api/admin/journals?${params}`);
    setItems(r.ok ? r.data : []);
  }, [q, show]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const view = async (j) => {
    setViewing({ loading: true, title: j.title });
    const r = await api(`/api/admin/journals/${j.id}`);
    setViewing(r.ok ? r.data : null);
  };

  const setHidden = async (j, hidden, why) => {
    const r = await api(`/api/admin/journals/${j.id}/visibility`, { method: "PUT", body: { hidden, reason: why || null } });
    if (r.ok) {
      setHiding(null);
      setReason("");
      load();
    }
  };

  return (
    <section className="ww-portal-card">
      <div className="ww-portal-filters">
        <input className="ww-field-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchJournals")} />
        <select className="ww-field-input" value={show} onChange={(e) => setShow(e.target.value)}>
          <option value="">{t("allPosts")}</option>
          <option value="visible">{t("visiblePosts")}</option>
          <option value="hidden">{t("hiddenPosts")}</option>
        </select>
      </div>

      {items === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : items.length === 0 ? (
        <p className="ww-expense-empty">{t("nothingHere")}</p>
      ) : (
        <div className="ww-portal-list">
          {items.map((j) => (
            <div key={j.id} className={`ww-portal-row ${j.isHidden ? "is-hidden" : ""}`}>
              <div className="ww-portal-row-main">
                <strong>{j.title || t("untitledLabel")}</strong>
                <span className="ww-portal-row-meta">
                  <span>✍️ {fullName(j.author)}</span>
                  <span>📅 {formatDate(toLocalDate(j.createdAt), { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span>📌 {j.placesCount}</span>
                  <span>💬 {j.commentsCount}</span>
                  {j.isHidden && <span className="ww-portal-badge danger">{t("hiddenLabel")}{j.hiddenReason ? `: ${j.hiddenReason}` : ""}</span>}
                </span>
              </div>
              <div className="ww-portal-row-actions">
                <button type="button" className="ww-link-btn" onClick={() => view(j)}>{t("viewLabel")}</button>
                {j.isHidden ? (
                  <button type="button" className="ww-link-btn" onClick={() => setHidden(j, false)}>{t("unhide")}</button>
                ) : (
                  <button type="button" className="ww-link-btn danger" onClick={() => { setHiding(j); setReason(""); }}>{t("hide")}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hiding && (
        <div className="ww-modal-overlay" onClick={() => setHiding(null)}>
          <div className="ww-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="ww-planning-title">{t("hidePostTitle")}</h2>
            <p className="ww-portal-muted">“{hiding.title}” · {fullName(hiding.author)}</p>
            <textarea className="ww-journal-tips-input" value={reason} maxLength={255} autoFocus
              onChange={(e) => setReason(e.target.value)} placeholder={t("hideReasonPlaceholder")} />
            <p className="ww-portal-hint">{t("hideNotifyHint")}</p>
            <div className="ww-modal-actions">
              <button type="button" className="ww-modal-cancel-btn" onClick={() => setHiding(null)}>{t("cancel")}</button>
              <button type="button" className="ww-search-btn" onClick={() => setHidden(hiding, true, reason)}>{t("hide")}</button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="ww-modal-overlay" onClick={() => setViewing(null)}>
          <div className="ww-modal-card ww-portal-journal-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="ww-planning-title">{viewing.title}</h2>
            {viewing.loading ? (
              <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
            ) : (
              <div className="ww-portal-journal-places">
                {(viewing.places || []).map((p) => (
                  <div key={p.id} className="ww-portal-subcard">
                    <strong>📍 {p.placeName}</strong> {p.rating ? `· ${"★".repeat(p.rating)}` : ""}
                    {p.imageUrl && <img src={p.imageUrl} alt="" />}
                    {p.description && <p>{p.description}</p>}
                    {(p.pros || []).length > 0 && <p>👍 {(p.pros || []).map((x) => x.text).join(" · ")}</p>}
                    {(p.cons || []).length > 0 && <p>👎 {(p.cons || []).map((x) => x.text).join(" · ")}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="ww-modal-actions">
              <button type="button" className="ww-modal-cancel-btn" onClick={() => setViewing(null)}>{t("close")}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------- Classes (view only) ----------------
function Classes() {
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api("/api/admin/classes").then((r) => setItems(r.ok ? r.data : []));
  }, []);

  if (items === null) return <p className="ww-expense-empty">{t("loadingEllipsis")}</p>;
  return (
    <section className="ww-portal-card">
      {items.length === 0 ? (
        <p className="ww-expense-empty">{t("nothingHere")}</p>
      ) : (
        <div className="ww-portal-table-wrap">
          <table className="ww-portal-table">
            <thead>
              <tr>
                <th>{t("colClass")}</th>
                <th>{t("teacherLabel")}</th>
                <th className="num">{t("statStudents")}</th>
                <th>{t("colCreated")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong><br /><small>{[c.section, c.term].filter(Boolean).join(" · ")}</small></td>
                  <td>{c.teacherName}</td>
                  <td className="num">{c.students}</td>
                  <td>{formatDate(toLocalDate(c.createdAt), { month: "short", day: "numeric", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------- Activity log ----------------
const LOG_ACTIONS = [
  "login", "login_failed", "login_blocked", "register_student", "register_teacher", "password_reset",
  "user_status_changed", "journal_hidden", "journal_unhidden", "class_created", "class_deleted",
  "server_error",
];

function Logs() {
  const { t } = useLanguage();
  const { formatDate, formatTime } = usePreferences();
  const [searchParams] = useSearchParams();
  const [action, setAction] = useState(searchParams.get("action") || "");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (q.trim()) params.set("q", q.trim());
    const r = await api(`/api/admin/logs?${params}`);
    setRows(r.ok ? r.data : []);
  }, [action, q]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const tone = (a) =>
    a === "server_error" ? "danger"
    : a === "login_failed" || a === "login_blocked" ? "warn"
    : a === "login" ? "ok"
    : "";

  return (
    <section className="ww-portal-card">
      <div className="ww-portal-filters">
        <select className="ww-field-input" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">{t("allActions")}</option>
          {LOG_ACTIONS.map((a) => <option key={a} value={a}>{t(`log_${a}`)}</option>)}
        </select>
        <input className="ww-field-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchLogs")} />
        <button type="button" className="ww-booking-cancel" onClick={load}>↻ {t("refreshLabel")}</button>
      </div>

      {rows === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : rows.length === 0 ? (
        <p className="ww-expense-empty">{t("nothingHere")}</p>
      ) : (
        <div className="ww-portal-table-wrap">
          <table className="ww-portal-table ww-portal-logs">
            <thead>
              <tr>
                <th>{t("colWhen")}</th>
                <th>{t("colAction")}</th>
                <th>{t("colUser")}</th>
                <th>{t("colDetails")}</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = toLocalDate(r.createdAt);
                return (
                  <tr key={r.id}>
                    <td className="nowrap">{d ? `${formatDate(d, { month: "short", day: "numeric" })} ${formatTime(d)}` : ""}</td>
                    <td><span className={`ww-portal-badge ${tone(r.action)}`}>{t(`log_${r.action}`)}</span></td>
                    <td>
                      {r.user ? (
                        <span className="ww-link-text" onClick={() => navigate(`/profile/view/${r.user.id}`)}>{r.user.name || r.user.email}</span>
                      ) : "—"}
                    </td>
                    <td className="ww-portal-log-details">{r.details}</td>
                    <td><small>{r.ipAddress}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
