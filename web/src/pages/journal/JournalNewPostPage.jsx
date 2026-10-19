import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import PlaceMap from "../../components/PlaceMap";
import { useAppData } from "../../context/AppDataContext";
import { useLanguage } from "../../context/LanguageContext";
import { useDialog } from "../../context/DialogContext";
import "../../App.css";
import Icon from "../../components/Icon";

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

// Phone photos can be 5–10 MB. Shrink to at most 1280px (JPEG) before
// saving, so the story loads fast and stays under the server's size limit.
// If the browser can't read the picture, the original is used.
function shrinkPhoto(file, maxSide = 1280) {
  return readFileAsDataUrl(file).then(
    (dataUrl) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      })
  );
}

export default function JournalNewPostPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addJournalEntry } = useAppData();
  const { t } = useLanguage();
  const { alert, confirm } = useDialog();

  const [storyTitle, setStoryTitle] = useState(
    location.state?.destination
      ? `${location.state.destination} ${t("travelStorySuffix")}`
      : ""
  );
  const [editingTitle, setEditingTitle] = useState(false);

  // ---- Fill in from a trip ----
  // Opened from the "trip is over" notification (?tripId=) or by picking
  // one of the student's trips here: the trip's places are filled in as
  // photos are added, and the trip's photo becomes the cover.
  const [searchParams] = useSearchParams();
  const [myTrips, setMyTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(
    searchParams.get("tripId") || (location.state?.tripId ? String(location.state.tripId) : "")
  );
  const [tripPlaces, setTripPlaces] = useState([]);
  const [tripCover, setTripCover] = useState(null);
  const authHeaders = () => {
    try {
      const token = localStorage.getItem("wanderwise_token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  // Only trips that have already started can get a story — a trip in
  // December can't be written about in October. (No dates = can't tell, so
  // it's allowed.) The server checks the same thing.
  const todayIso = (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();
  const tripStarted = (trip) => !trip.startDate || String(trip.startDate).slice(0, 10) <= todayIso;
  const startedTrips = myTrips.filter(tripStarted);
  // A destination that is ONLY in trips that haven't started yet.
  const notStartedTripFor = (title) => {
    const typed = (title || "").replace(new RegExp(`\\s*${t("travelStorySuffix")}\\s*$`, "i"), "").trim().toLowerCase();
    if (!typed) return null;
    const same = myTrips.filter((trip) => (trip.destination || "").trim().toLowerCase() === typed);
    return same.length > 0 && !same.some(tripStarted) ? same[0] : null;
  };
  const [notYetMsg, setNotYetMsg] = useState("");

  // Typing (or picking) a place in the title: if it is the destination of
  // one of the student's trips, that trip's places and photo are used and
  // the title becomes "<place> Travel Story".
  const suffix = t("travelStorySuffix");
  const tripDestinations = [];
  startedTrips.forEach((trip) => {
    const d = (trip.destination || "").trim();
    if (d && !tripDestinations.some((x) => x.toLowerCase() === d.toLowerCase())) tripDestinations.push(d);
  });
  const handleTitleChange = (value) => {
    const typed = value.replace(new RegExp(`\\s*${suffix}\\s*$`, "i"), "").trim().toLowerCase();
    const match = startedTrips.find((trip) => (trip.destination || "").trim().toLowerCase() === typed);
    const future = notStartedTripFor(value);
    setNotYetMsg(
      future
        ? t("journalTripNotStarted").replace("{place}", future.destination.trim()).replace("{date}", String(future.startDate).slice(0, 10))
        : ""
    );
    if (match && typed) {
      setStoryTitle(`${match.destination.trim()} ${suffix}`);
      setSelectedTripId(String(match.id));
      return;
    }
    setStoryTitle(value);
    const current = myTrips.find((trip) => String(trip.id) === selectedTripId);
    if (current && !value.toLowerCase().includes((current.destination || "").trim().toLowerCase())) {
      setSelectedTripId("");
    }
  };

  useEffect(() => {
    fetch("/api/trips", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setMyTrips(Array.isArray(list) ? list : []))
      .catch(() => setMyTrips([]));
  }, []);

  useEffect(() => {
    if (!selectedTripId) {
      setTripPlaces([]);
      setTripCover(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/trips/${selectedTripId}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((trip) => {
        if (cancelled || !trip) return;
        // Opened for a trip that hasn't started yet (e.g. an old link):
        // don't fill anything in from it.
        if (!tripStarted(trip)) {
          setNotYetMsg(t("journalTripNotStarted").replace("{place}", (trip.destination || "").trim()).replace("{date}", String(trip.startDate).slice(0, 10)));
          setSelectedTripId("");
          return;
        }
        const names = [];
        (trip.sections || []).forEach((sec) =>
          (sec.places || []).forEach((pl) => {
            // Only places already visited, or whose day has come.
            const day = pl.itineraryDate ? String(pl.itineraryDate).slice(0, 10) : "";
            if (!pl.visited && day && day > todayIso) return;
            const name = (pl.name || "").trim();
            if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) names.push(name);
          })
        );
        setTripPlaces(names);
        const destination = (trip.destination || "").trim();
        if (destination) {
          setStoryTitle((prev) => prev.trim() ? prev : `${destination} ${t("travelStorySuffix")}`);
          fetch(`/api/destination-image?name=${encodeURIComponent(destination)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((img) => { if (!cancelled) setTripCover(img && img.found && img.url ? img.url : null); })
            .catch(() => {});
        } else {
          setTripCover(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedTripId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Back to the page this was opened from (Profile, etc.). If photos were
  // already added and not posted yet, ask first so they aren't lost by
  // accident. Opened directly from a link → go to the Profile.
  const handleBack = async () => {
    if (entries.length > 0) {
      const ok = await confirm(t("confirmLeaveJournal"), {
        danger: true,
        confirmLabel: t("leaveLabel"),
      });
      if (!ok) return;
    }
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/profile");
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) {
      alert(t("chooseAPhotoFirst"));
      return;
    }
    setUploading(true);
    try {
      const imageUrl = await shrinkPhoto(selectedFile);
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
    // Don't post a story without a real title.
    if (!storyTitle.trim()) {
      alert(t("storyTitleRequired"));
      setEditingTitle(true);
      return;
    }
    const future = notStartedTripFor(storyTitle);
    if (future) {
      alert(t("journalTripNotStarted").replace("{place}", future.destination.trim()).replace("{date}", String(future.startDate).slice(0, 10)));
      setEditingTitle(true);
      return;
    }
    setPosting(true);
    try {
      const payload = {
        title: storyTitle.trim(),
        // Trip's photo first; the first uploaded photo if the trip has none.
        coverImage: tripCover || entries[0]?.img || null,
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
      alert(err.message || t("journalSaveError"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ww-journal-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/brand/logo.png" alt="WanderWise logo" className="ww-logo" />
          <img src="/assets/brand/wordmark.png" alt="WanderWise" className="ww-brand-wordmark" />
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">{t("navHome")}</a>
          <a href="/travel-tips">{t("navGuides")}</a>
          <a href="/hotels">{t("navHotels")}</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}><Icon name="search" /></span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}><Icon name="bell" /></span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}><Icon name="user" /></span>
        </div>
      </header>

      {posted ? (
        // --- Read-only summary, shown right after posting ---
        <main className="ww-guide-main">
          <p className="ww-journal-posted-banner"><Icon name="check-circle" /> {t("postedBanner")}</p>
          <h1 className="ww-guide-title">{storyTitle}</h1>

          {entries.map((entry) => (
            <section className="ww-guide-section" key={entry.id}>
              <div className="ww-guide-intro">
                <div className="ww-guide-text">
                  <p className="ww-guide-pin">
                    <Icon name="map-pin" />{entry.place || t("unnamedPlace")}{" "}
                    <span className="ww-stars">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Icon key={i} name="star" className={i <= entry.rating ? "filled" : ""} />
                      ))}
                    </span>
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
                        <p className="ww-guide-hotel-name"><Icon name="bed" /> {h.name}</p>
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
          <p className="ww-stories-back" onClick={handleBack}>
            <Icon name="arrow-left" /> {t("back")}
          </p>

          <h1 className="ww-journal-title">
            {editingTitle ? (
              <input
                className="ww-section-name-input-inline"
                value={storyTitle}
                placeholder={t("enterDestinationStory")}
                list="ww-journal-trip-destinations"
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingTitle(false);
                }}
                autoFocus
              />
            ) : (
              // Empty title: show the prompt as a hint; click it to edit.
              <span
                onClick={() => setEditingTitle(true)}
                style={storyTitle ? undefined : { opacity: 0.5, cursor: "pointer" }}
              >
                {storyTitle || t("enterDestinationStory")}
              </span>
            )}{" "}
            <span
              className="ww-edit-icon"
              onClick={() => setEditingTitle((v) => !v)}
              style={{ cursor: "pointer" }}
            >
              <Icon name="pencil" />
            </span>
          </h1>
          {notYetMsg && (
            <p className="ww-journal-not-yet" role="alert" style={{ margin: "4px 0 14px", color: "var(--ww-danger)", fontWeight: 600, fontSize: 14 }}>
              <Icon name="calendar" /> {notYetMsg}
            </p>
          )}

          <datalist id="ww-journal-trip-destinations">
            {tripDestinations.map((d) => <option key={d} value={d} />)}
          </datalist>
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
                <Icon name="folder" /> {t("chooseFile")}
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

          <datalist id="ww-journal-trip-places">
            {tripPlaces.map((n) => <option key={n} value={n} />)}
          </datalist>

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
                        placeholder={t("addAPlace")}
                        list="ww-journal-trip-places"
                        value={entry.place}
                        onChange={(e) => updateEntry(entry.id, "place", e.target.value)}
                      />
                      {/* Places from the trip's itinerary: pick the one this photo is of. */}
                      {(() => {
                        const usedElsewhere = entries
                          .filter((o) => o.id !== entry.id)
                          .map((o) => o.place.trim().toLowerCase());
                        const choices = tripPlaces.filter(
                          (n) => !usedElsewhere.includes(n.toLowerCase()) && n.toLowerCase() !== entry.place.trim().toLowerCase()
                        );
                        if (choices.length === 0) return null;
                        return (
                          <div className="ww-journal-place-chips">
                            {choices.map((n) => (
                              <button
                                type="button"
                                key={n}
                                className="ww-journal-place-chip"
                                onClick={() => updateEntry(entry.id, "place", n)}
                              >
                                <Icon name="map-pin" /> {n}
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="ww-journal-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            onClick={() => updateEntry(entry.id, "rating", n)}
                            style={{ cursor: "pointer" }}
                          >
                            <Icon name="star" className={n <= entry.rating ? "filled" : ""} />
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
                          <span onClick={() => removePro(entry.id, i)}><Icon name="x" /></span>
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
                          <span onClick={() => removeCon(entry.id, i)}><Icon name="x" /></span>
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
                        <span onClick={() => removeHotel(entry.id, hotel.id)}><Icon name="x" /></span>
                      </div>
                    ))}
                    <div className="ww-journal-hotel-fields-row">
                      <input
                        className="ww-journal-tag-input"
                        placeholder={t("hotelName")}
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