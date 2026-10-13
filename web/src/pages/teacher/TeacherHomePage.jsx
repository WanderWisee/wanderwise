import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { useAppData } from "../../context/AppDataContext";
import { api } from "../../utils/portal";
import "../../App.css";

// Teacher portal home: all of the teacher's classes + "New class".
export default function TeacherHomePage() {
  return (
    <div className="ww-portal-page">
      <PortalHeader />
      <RoleGate need="teacher">
        <TeacherHome />
      </RoleGate>
    </div>
  );
}

function TeacherHome() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profileName } = useAppData();
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", section: "", term: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await api("/api/teacher/classes");
    if (r.ok) setClasses(r.data || []);
    else {
      setClasses([]);
      setError("portalLoadFailed");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createClass = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const r = await api("/api/teacher/classes", { method: "POST", body: form });
    setSaving(false);
    if (!r.ok) return setError("portalSaveFailed");
    navigate(`/teacher/class/${r.data.id}`);
  };

  const totalStudents = (classes || []).reduce((n, c) => n + c.studentCount, 0);

  return (
    <main className="ww-portal-main">
      <div className="ww-portal-hero">
        <div>
          <p className="ww-portal-eyebrow">🎓 {t("teacherPortal")}</p>
          <h1 className="ww-portal-title">
            {t("helloName")} {profileName ? profileName.split(" ")[0] : ""}!
          </h1>
          <p className="ww-portal-muted">{t("teacherHomeIntro")}</p>
        </div>
        <button type="button" className="ww-search-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : `＋ ${t("newClass")}`}
        </button>
      </div>

      {classes && classes.length > 0 && (
        <div className="ww-portal-stats">
          <Stat icon="🏫" value={classes.length} label={t("statClasses")} />
          <Stat icon="👩‍🎓" value={totalStudents} label={t("statStudents")} />
        </div>
      )}

      {showForm && (
        <form className="ww-portal-card ww-portal-form" onSubmit={createClass}>
          <h2>{t("newClass")}</h2>
          <div className="ww-portal-form-grid">
            <label>
              {t("classNameLabel")} *
              <input className="ww-field-input" value={form.name} maxLength={150}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("classNamePlaceholder")} autoFocus />
            </label>
            <label>
              {t("sectionLabel")}
              <input className="ww-field-input" value={form.section} maxLength={100}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder={t("sectionPlaceholder")} />
            </label>
            <label>
              {t("termLabel")}
              <input className="ww-field-input" value={form.term} maxLength={100}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                placeholder={t("termPlaceholder")} />
            </label>
          </div>
          <div className="ww-portal-actions">
            <button type="submit" className="ww-search-btn" disabled={saving || !form.name.trim()}>
              {saving ? t("savingEllipsis") : t("createClass")}
            </button>
          </div>
        </form>
      )}

      {error && <p className="ww-portal-error">{t(error)}</p>}

      {classes === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : classes.length === 0 ? (
        <div className="ww-portal-empty">
          <span>🏫</span>
          <p>{t("noClassesYet")}</p>
        </div>
      ) : (
        <div className="ww-portal-class-grid">
          {classes.map((c) => (
            <button type="button" key={c.id} className="ww-portal-class-card" onClick={() => navigate(`/teacher/class/${c.id}`)}>
              <span className="ww-portal-class-band" aria-hidden="true" />
              <span className="ww-portal-class-name">{c.name}</span>
              <span className="ww-portal-class-sub">
                {[c.section, c.term].filter(Boolean).join(" · ") || "—"}
              </span>
              <span className="ww-portal-class-meta">
                <span>👩‍🎓 {c.studentCount}</span>
              </span>
              <span className="ww-portal-class-foot">
                <code className="ww-portal-code">{c.joinCode}</code>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

export function Stat({ icon, value, label, tone = "" }) {
  return (
    <div className={`ww-portal-stat ${tone}`}>
      <span className="ww-portal-stat-icon">{icon}</span>
      <span className="ww-portal-stat-value">{value}</span>
      <span className="ww-portal-stat-label">{label}</span>
    </div>
  );
}
