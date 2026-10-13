import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../utils/portal";
import "../../App.css";

// Student: the classes I'm in + "Join a class" with the teacher's code.
export default function MyClassesPage() {
  return (
    <div className="ww-portal-page">
      <PortalHeader />
      <RoleGate need="student">
        <MyClasses />
      </RoleGate>
    </div>
  );
}

function MyClasses() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [classes, setClasses] = useState(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    const r = await api("/api/classes/mine");
    setClasses(r.ok ? r.data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const join = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    setMsg(null);
    const r = await api("/api/classes/join", { method: "POST", body: { code } });
    setJoining(false);
    if (r.ok) {
      setCode("");
      navigate(`/classes/${r.data.classId}`);
    } else if (r.status === 409) setMsg(t("alreadyInClass"));
    else if (r.status === 404) setMsg(t("badJoinCode"));
    else setMsg(t("portalSaveFailed"));
  };

  return (
    <main className="ww-portal-main">
      <div className="ww-portal-hero">
        <div>
          <p className="ww-portal-eyebrow">🎓 {t("myClasses")}</p>
          <h1 className="ww-portal-title">{t("myClassesTitle")}</h1>
          <p className="ww-portal-muted">{t("myClassesIntro")}</p>
        </div>
        <form className="ww-portal-join-form" onSubmit={join}>
          <input className="ww-field-input ww-portal-code-input" value={code} maxLength={12}
            onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t("joinCodePlaceholder")} />
          <button type="submit" className="ww-search-btn" disabled={joining || !code.trim()}>
            {joining ? t("savingEllipsis") : t("joinClass")}
          </button>
        </form>
      </div>
      {msg && <p className="ww-portal-error">{msg}</p>}

      {classes === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : classes.length === 0 ? (
        <div className="ww-portal-empty">
          <span>🎒</span>
          <p>{t("noClassesStudent")}</p>
        </div>
      ) : (
        <div className="ww-portal-class-grid">
          {classes.map((c) => (
            <button type="button" key={c.id} className="ww-portal-class-card" onClick={() => navigate(`/classes/${c.id}`)}>
              <span className="ww-portal-class-band" aria-hidden="true" />
              <span className="ww-portal-class-name">{c.name}</span>
              <span className="ww-portal-class-sub">{[c.section, c.term].filter(Boolean).join(" · ") || "—"}</span>
              <span className="ww-portal-class-meta">
                <span>🧑‍🏫 {c.teacherName}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
