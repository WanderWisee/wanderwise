import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import PlaceMap from "../../components/PlaceMap";
import { useAppData } from "../../context/AppDataContext";
import { useLanguage } from "../../context/LanguageContext";
import { useDialog } from "../../context/DialogContext";
import "../../App.css";

let nextHotelId = 1;

// Reads a File as a base64 data URL. We use this instead of
// URL.createObjectURL() because a blob URL only stays valid inside the
// current browser tab — it breaks on refresh, on other devices, and once
// saved+reloaded from the database. A base64 data URL is a plain string,
// so it can be sent to the backend and stored (in the CoverImage/ImageUrl
// text columns) and will keep working anywhere it's loaded.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function JournalNewPostPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addJournalEntry } = useAppData();
  const { t } = useLanguage();
  const { alert } = useDialog();

  const [storyTitle, setStoryTitle] = useState(
    location.state?.destination
      ? `${location.state.destination} ${t("travelStorySuffix")}`
      : t("enterDestinationStory")
  );
  const [editingTitle, setEditingTitle] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [hasUploadedPhoto, setHasUploadedPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChooseFile = (e) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const [entries, setEntries] = useState([]);
  const nextEntryIdRef = useRef(1);

  // Once true, this page switches from the editing form to a
  // read-only summary — so posting gives immediate visible feedback
  // instead of silently navigating somewhere else.
  const [posted, setPosted] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleUploadPhoto = async () => {
    if (!selectedFile) {
      alert(t("chooseAPhotoFirst"));
      return;
    }
    setUploading(true);
    try {
      const imageUrl = await readFileAsDataUrl(selectedFile);
      const newEntry = {
        id: nextEntryIdRef.current++,
        place: "",
        img: imageUrl,
        rating: 0,
        description: "",
        pros: [],
        cons: [],
        hotels: [],
        proInput: "",
        conInput: "",
        hotelNameInput: "",
        hotelDescInput: "",
      };
      setEntries((prev) => [...prev, newEntry]);
      setHasUploadedPhoto(true);
      setSelectedFile(null);
    } catch (err) {
      alert(t("couldntReadPhoto"));
    } finally {
      setUploading(false);
    }
  };

  const updateEntry = (id, field, value) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const addPro = (id) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || !e.proInput.trim()) return e;
        return { ...e, pros: [...e.pros, e.proInput.trim()], proInput: "" };
      })
    );
  };

  const removePro = (id, index) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== id ? e : { ...e, pros: e.pros.filter((_, i) => i !== index) }
      )
    );
  };

  const addCon = (id) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || !e.conInput.trim()) return e;
        return { ...e, cons: [...e.cons, e.conInput.trim()], conInput: "" };
      })
    );
  };

  const removeCon = (id, index) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== id ? e : { ...e, cons: e.cons.filter((_, i) => i !== index) }
      )
    );
  };

  const addHotel = (id) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || !e.hotelNameInput.trim()) return e;
        const hotel = {
          id: nextHotelId++,
          name: e.hotelNameInput.trim(),
          description: e.hotelDescInput.trim(),
        };
        return { ...e, hotels: [...e.hotels, hotel], hotelNameInput: "", hotelDescInput: "" };
      })
    );
  };

  const removeHotel = (id, hotelId) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== id ? e : { ...e, hotels: e.hotels.filter((h) => h.id !== hotelId) }
      )
    );
  };

  const handlePost = async () => {
    setPosting(true);
    try {
      const payload = {
        title: storyTitle,
        coverImage: entries[0]?.img || null,
        places: entries.map((e, idx) => ({
          placeName: e.place,
          imageUrl: e.img,
          rating: e.rating,
          description: e.description,
          sortOrder: idx,
          pros: e.pros,
          cons: e.cons,
          hotels: e.hotels.map((h) => ({ name: h.name, description: h.description })),
        })),
      };

      await addJournalEntry(payload);
      setPosted(true);
    } catch (err) {
      alert(t("journalSaveError"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ww-journal-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">{t("navHome")}</a>
          <a href="/travel-tips">{t("navGuides")}</a>
          <a href="/hotels">{t("navHotels")}</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      {posted ? (
        // --- Read-only summary, shown right after posting ---
        <main className="ww-guide-main">
          <p className="ww-journal-posted-banner">✅ {t("postedBanner")}</p>
          <h1 className="ww-guide-title">{storyTitle}</h1>

          {entries.map((entry) => (
            <section className="ww-guide-section" key={entry.id}>
              <div className="ww-guide-intro">
                <div className="ww-guide-text">
                  <p className="ww-guide-pin">
                    📍{entry.place || t("unnamedPlace")}{" "}
                    {"★".repeat(entry.rating)}
                    {"☆".repeat(5 - entry.rating)}
                  </p>
                  {entry.description && (
                    <p className="ww-guide-description">{entry.description}</p>
                  )}

                  {entry.pros.length > 0 && (
                    <>
                      <p className="ww-guide-list-title">
                        {t("prosOfVisiting")} {entry.place || t("thisPlace")}:
                      </p>
                      <ul className="ww-guide-list">
                        {entry.pros.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </>
                  )}

                  {entry.cons.length > 0 && (
                    <>
                      <p className="ww-guide-list-title">
                        {t("consOfVisiting")} {entry.place || t("thisPlace")}:
                      </p>
                      <ul className="ww-guide-list">
                        {entry.cons.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </>
                  )}
                </div>
                <img src={entry.img} alt={entry.place || "place"} className="ww-guide-image" />
              </div>

              {entry.hotels.length > 0 && (
                <>
                  <h3 className="ww-guide-hotel-heading">{t("hotelOption")}</h3>
                  <div className="ww-guide-hotels-grid">
                    {entry.hotels.map((h) => (
                      <div className="ww-guide-hotel-card" key={h.id}>
                        <p className="ww-guide-hotel-name">🏨 {h.name}</p>
                        {h.description && <p className="ww-guide-hotel-desc">{h.description}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {entry.place && entry.place.trim() && (
                <>
                  <h3 className="ww-guide-location-heading">{t("location")}</h3>
                  <div className="ww-guide-map">
                    <PlaceMap placeName={entry.place} height={220} />
                  </div>
                </>
              )}
            </section>
          ))}

          <button className="ww-lets-go-btn" onClick={() => navigate("/profile")}>
            {t("goToProfile")}
          </button>
        </main>
      ) : (
        // --- Editing form ---
        <main className="ww-journal-main">
          <h1 className="ww-journal-title">
            {editingTitle ? (
              <input
                className="ww-section-name-input-inline"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingTitle(false);
                }}
                autoFocus
              />
            ) : (
              <span>{storyTitle}</span>
            )}{" "}
            <span
              className="ww-edit-icon"
              onClick={() =>
                setEditingTitle((v) => {
                  const next = !v;
                  if (next) setStoryTitle("");
                  return next;
                })
              }
              style={{ cursor: "pointer" }}
            >
              ✎
            </span>
          </h1>

          <div className="ww-journal-upload-card">
            <h2>{t("uploadAPhoto")}</h2>
            <p className="ww-journal-upload-note">
              {t("uploadPhotoNote")}
            </p>
            <div className="ww-journal-file-row">
              <button
                className="ww-journal-choose-file-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 {t("chooseFile")}
              </button>
              <span>{selectedFile ? selectedFile.name : t("noFileChosen")}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleChooseFile}
                style={{ display: "none" }}
              />
            </div>
            <button
              className="ww-journal-upload-btn"
              onClick={handleUploadPhoto}
              disabled={uploading}
            >
              {uploading ? t("uploading") : t("uploadPhoto")}
            </button>
          </div>

          {hasUploadedPhoto && (
            <>
              <hr className="ww-journal-divider" />
              <h2 className="ww-journal-rate-title">{t("rateYourExperience")}</h2>

              {entries.map((entry) => (
                <div className="ww-journal-entry-block" key={entry.id}>
                  <div className="ww-journal-entry">
                    <img src={entry.img} alt={entry.place || "destination"} className="ww-journal-entry-img" />
                    <div className="ww-journal-entry-fields">
                      <input
                        className="ww-journal-place-input"
                        placeholder={`📍 ${t("addAPlace")}`}
                        value={entry.place}
                        onChange={(e) => updateEntry(entry.id, "place", e.target.value)}
                      />

                      <div className="ww-journal-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            onClick={() => updateEntry(entry.id, "rating", n)}
                            style={{ cursor: "pointer" }}
                          >
                            {n <= entry.rating ? "★" : "☆"}
                          </span>
                        ))}
                      </div>

                      <textarea
                        className="ww-journal-tips-input"
                        placeholder={t("writeShortDescription")}
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.id, "description", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live preview — as soon as a place name is typed above,
                      it gets geocoded and pinned here, same idea as the
                      Trip Plan Builder's map. */}
                  {entry.place.trim() && (
                    <div className="ww-journal-entry-map" style={{ margin: "12px 0" }}>
                      <PlaceMap placeName={entry.place} height={180} />
                    </div>
                  )}

                  <div className="ww-journal-tag-section">
                    <p className="ww-journal-list-label">{t("pros")}</p>
                    <div className="ww-journal-tag-row">
                      {entry.pros.map((pro, i) => (
                        <span className="ww-journal-tag ww-journal-tag-pro" key={i}>
                          {pro}
                          <span onClick={() => removePro(entry.id, i)}>✕</span>
                        </span>
                      ))}
                    </div>
                    <div className="ww-journal-tag-add-row">
                      <input
                        className="ww-journal-tag-input"
                        placeholder={t("addAProPlaceholder")}
                        value={entry.proInput}
                        onChange={(e) => updateEntry(entry.id, "proInput", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addPro(entry.id)}
                      />
                      <button className="ww-journal-tag-add-btn" onClick={() => addPro(entry.id)}>+</button>
                    </div>
                  </div>

                  <div className="ww-journal-tag-section">
                    <p className="ww-journal-list-label">{t("cons")}</p>
                    <div className="ww-journal-tag-row">
                      {entry.cons.map((con, i) => (
                        <span className="ww-journal-tag ww-journal-tag-con" key={i}>
                          {con}
                          <span onClick={() => removeCon(entry.id, i)}>✕</span>
                        </span>
                      ))}
                    </div>
                    <div className="ww-journal-tag-add-row">
                      <input
                        className="ww-journal-tag-input"
                        placeholder={t("addAConPlaceholder")}
                        value={entry.conInput}
                        onChange={(e) => updateEntry(entry.id, "conInput", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCon(entry.id)}
                      />
                      <button className="ww-journal-tag-add-btn" onClick={() => addCon(entry.id)}>+</button>
                    </div>
                  </div>

                  <div className="ww-journal-tag-section">
                    <p className="ww-journal-list-label">{t("hotelOptions")}</p>
                    {entry.hotels.map((hotel) => (
                      <div className="ww-journal-hotel-chip" key={hotel.id}>
                        <div>
                          <strong>{hotel.name}</strong>
                          {hotel.description && <p>{hotel.description}</p>}
                        </div>
                        <span onClick={() => removeHotel(entry.id, hotel.id)}>✕</span>
                      </div>
                    ))}
                    <div className="ww-journal-hotel-fields-row">
                      <input
                        className="ww-journal-tag-input"
                        placeholder={`🛏 ${t("hotelName")}`}
                        value={entry.hotelNameInput}
                        onChange={(e) => updateEntry(entry.id, "hotelNameInput", e.target.value)}
                      />
                      <textarea
                        className="ww-journal-tag-input"
                        placeholder={t("shortHotelDescription")}
                        value={entry.hotelDescInput}
                        onChange={(e) => updateEntry(entry.id, "hotelDescInput", e.target.value)}
                      />
                      <button className="ww-journal-tag-add-btn" onClick={() => addHotel(entry.id)}>+</button>
                    </div>
                  </div>
                </div>
              ))}

              <button className="ww-journal-post-btn" onClick={handlePost} disabled={posting}>
                {posting ? t("posting") : t("post")}
              </button>
            </>
          )}
        </main>
      )}
    </div>
  );
}