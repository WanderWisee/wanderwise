import React, { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useDialog } from "../../context/DialogContext";
import { api } from "../../utils/portal";
import "../../App.css";

// Admin → Destinations & guides.
// Destinations feed the Trip Planning suggestions ("featured" ones first);
// guide sections show on Guides → <destination>.
const emptyDest = { name: "", country: "Philippines", imageUrl: "", isFeatured: false };
const emptyGuide = { pinLabel: "", locationName: "", description: "", pros: "", cons: "", imageUrl: "", hotels: "", sortOrder: 0 };

export default function AdminContent() {
  const { t } = useLanguage();
  const { confirm } = useDialog();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState(null); // null | "new" | id
  const [form, setForm] = useState(emptyDest);
  const [guidesFor, setGuidesFor] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api("/api/admin/destinations");
    setItems(r.ok ? r.data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (d) => {
    setEditingId(d ? d.id : "new");
    setForm(d ? { name: d.name, country: d.country || "", imageUrl: d.imageUrl || "", isFeatured: d.isFeatured } : emptyDest);
    setError("");
  };

  const save = async (e) => {
    e.preventDefault();
    const r = editingId === "new"
      ? await api("/api/admin/destinations", { method: "POST", body: form })
      : await api(`/api/admin/destinations/${editingId}`, { method: "PUT", body: form });
    if (!r.ok) return setError(r.status === 409 ? t("destinationExists") : t("portalSaveFailed"));
    setEditingId(null);
    load();
  };

  const remove = async (d) => {
    if (!(await confirm(`${t("confirmDeleteDestination")} "${d.name}"?`, { danger: true, confirmLabel: t("dialogDelete") }))) return;
    const r = await api(`/api/admin/destinations/${d.id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  const toggleFeatured = async (d) => {
    const r = await api(`/api/admin/destinations/${d.id}`, {
      method: "PUT",
      body: { name: d.name, country: d.country, imageUrl: d.imageUrl, isFeatured: !d.isFeatured },
    });
    if (r.ok) load();
  };

  const shown = (items || []).filter((d) => !q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase()));

  if (guidesFor) return <Guides destination={guidesFor} onBack={() => { setGuidesFor(null); load(); }} />;

  return (
    <section className="ww-portal-card">
      <div className="ww-portal-card-head">
        <h2>📍 {t("destinationsTitle")}</h2>
        {editingId === null && (
          <button type="button" className="ww-search-btn" onClick={() => startEdit(null)}>＋ {t("addDestination")}</button>
        )}
      </div>
      <p className="ww-portal-hint">{t("destinationsHint")}</p>

      {editingId !== null && (
        <form className="ww-portal-form ww-portal-subcard" onSubmit={save}>
          <div className="ww-portal-form-grid">
            <label>{t("nameLabel")} *
              <input className="ww-field-input" value={form.name} maxLength={150} autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>{t("countryLabel")}
              <input className="ww-field-input" value={form.country} maxLength={100}
                onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </label>
            <label className="wide">{t("imageUrlLabel")}
              <input className="ww-field-input" value={form.imageUrl} maxLength={255}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://… / /assets/…" />
            </label>
            <label className="ww-portal-check">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
              ⭐ {t("featuredLabel")}
            </label>
          </div>
          {error && <p className="ww-portal-error">{error}</p>}
          <div className="ww-portal-actions">
            <button type="button" className="ww-booking-cancel" onClick={() => setEditingId(null)}>{t("cancel")}</button>
            <button type="submit" className="ww-search-btn" disabled={!form.name.trim()}>{t("save")}</button>
          </div>
        </form>
      )}

      <input className="ww-field-input ww-portal-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchDestinations")} />

      {items === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : (
        <div className="ww-portal-table-wrap">
          <table className="ww-portal-table">
            <thead>
              <tr>
                <th>{t("nameLabel")}</th>
                <th>{t("countryLabel")}</th>
                <th className="num">⭐</th>
                <th className="num">{t("guideSections")}</th>
                <th className="num">{t("colTrips")}</th>
                <th>{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.country}</td>
                  <td className="num">
                    <button type="button" className={`ww-portal-star ${d.isFeatured ? "on" : ""}`} onClick={() => toggleFeatured(d)}
                      title={t("featuredLabel")}>★</button>
                  </td>
                  <td className="num">{d.guidesCount}</td>
                  <td className="num">{d.tripsCount}</td>
                  <td>
                    <span className="ww-portal-btn-row">
                      <button type="button" className="ww-link-btn" onClick={() => setGuidesFor(d)}>📖 {t("guideSections")}</button>
                      <button type="button" className="ww-link-btn" onClick={() => startEdit(d)}>{t("edit")}</button>
                      <button type="button" className="ww-link-btn danger" onClick={() => remove(d)}>{t("dialogDelete")}</button>
                    </span>
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

function Guides({ destination, onBack }) {
  const { t } = useLanguage();
  const { confirm } = useDialog();
  const [guides, setGuides] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyGuide);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api(`/api/admin/destinations/${destination.id}/guides`);
    setGuides(r.ok ? r.data : []);
  }, [destination.id]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (g) => {
    setEditingId(g ? g.id : "new");
    setForm(
      g
        ? {
            pinLabel: g.pinLabel || "",
            locationName: g.locationName || "",
            description: g.description || "",
            pros: g.pros || "",
            cons: g.cons || "",
            imageUrl: g.imageUrl || "",
            hotels: (g.hotels || []).map((h) => (h.description ? `${h.name} — ${h.description}` : h.name)).join("\n"),
            sortOrder: g.sortOrder || 0,
          }
        : { ...emptyGuide, sortOrder: (guides || []).length }
    );
    setError("");
  };

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, sortOrder: Number(form.sortOrder) || 0 };
    const r = editingId === "new"
      ? await api(`/api/admin/destinations/${destination.id}/guides`, { method: "POST", body })
      : await api(`/api/admin/guides/${editingId}`, { method: "PUT", body });
    if (!r.ok) return setError(t("portalSaveFailed"));
    setEditingId(null);
    load();
  };

  const remove = async (g) => {
    if (!(await confirm(`${t("confirmDeleteGuide")} "${g.pinLabel}"?`, { danger: true, confirmLabel: t("dialogDelete") }))) return;
    const r = await api(`/api/admin/guides/${g.id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  return (
    <section className="ww-portal-card">
      <p className="ww-stories-back" onClick={onBack}>← {t("destinationsTitle")}</p>
      <div className="ww-portal-card-head">
        <h2>📖 {destination.name} · {t("guideSections")}</h2>
        {editingId === null && (
          <button type="button" className="ww-search-btn" onClick={() => startEdit(null)}>＋ {t("addGuideSection")}</button>
        )}
      </div>
      <p className="ww-portal-hint">{t("guidesHint")}</p>

      {editingId !== null && (
        <form className="ww-portal-form ww-portal-subcard" onSubmit={save}>
          <div className="ww-portal-form-grid">
            <label>{t("pinLabelLabel")} *
              <input className="ww-field-input" value={form.pinLabel} maxLength={150} autoFocus
                onChange={(e) => setForm({ ...form, pinLabel: e.target.value })} placeholder="White Beach" />
            </label>
            <label>{t("subtitleLabel")}
              <input className="ww-field-input" value={form.locationName} maxLength={150}
                onChange={(e) => setForm({ ...form, locationName: e.target.value })} placeholder="The Main Strip ★★★★★" />
            </label>
            <label className="wide">{t("descriptionLabel")}
              <textarea className="ww-journal-tips-input" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label>{t("prosOnePerLine")}
              <textarea className="ww-journal-tips-input" value={form.pros}
                onChange={(e) => setForm({ ...form, pros: e.target.value })} />
            </label>
            <label>{t("consOnePerLine")}
              <textarea className="ww-journal-tips-input" value={form.cons}
                onChange={(e) => setForm({ ...form, cons: e.target.value })} />
            </label>
            <label className="wide">{t("hotelsOnePerLine")}
              <textarea className="ww-journal-tips-input" value={form.hotels}
                onChange={(e) => setForm({ ...form, hotels: e.target.value })} placeholder="Discovery Shores — All-suite beachfront resort" />
            </label>
            <label>{t("imageUrlLabel")}
              <input className="ww-field-input" value={form.imageUrl} maxLength={255}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </label>
            <label>{t("orderLabel")}
              <input type="number" className="ww-field-input" value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </label>
          </div>
          {error && <p className="ww-portal-error">{error}</p>}
          <div className="ww-portal-actions">
            <button type="button" className="ww-booking-cancel" onClick={() => setEditingId(null)}>{t("cancel")}</button>
            <button type="submit" className="ww-search-btn" disabled={!form.pinLabel.trim()}>{t("save")}</button>
          </div>
        </form>
      )}

      {guides === null ? (
        <p className="ww-expense-empty">{t("loadingEllipsis")}</p>
      ) : guides.length === 0 ? (
        <div className="ww-portal-empty"><span>📖</span><p>{t("noGuidesYet")}</p></div>
      ) : (
        <div className="ww-portal-list">
          {guides.map((g) => (
            <div key={g.id} className="ww-portal-row">
              <div className="ww-portal-row-main">
                <strong>📍 {g.pinLabel}</strong>
                <span className="ww-portal-row-meta">
                  {g.locationName && <span>{g.locationName}</span>}
                  <span>🏨 {(g.hotels || []).length}</span>
                  <span>#{g.sortOrder}</span>
                </span>
                {g.description && <small className="ww-portal-clip">{g.description}</small>}
              </div>
              <div className="ww-portal-row-actions">
                <button type="button" className="ww-link-btn" onClick={() => startEdit(g)}>{t("edit")}</button>
                <button type="button" className="ww-link-btn danger" onClick={() => remove(g)}>{t("dialogDelete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
