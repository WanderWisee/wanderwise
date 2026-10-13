import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PortalHeader, { RoleGate } from "../../components/PortalHeader";
import { useLanguage } from "../../context/LanguageContext";
import { api, fullName } from "../../utils/portal";
import { AnnouncementsTab, Avatar } from "../teacher/TeacherClassPage";
import "../../App.css";

// Student view of one class: who the teacher is + the class announcements.
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

      <h2 className="ww-portal-section-title">📢 {t("tab_announcements")}</h2>
      <AnnouncementsTab classId={classId} canPost={false} />
    </main>
  );
}
