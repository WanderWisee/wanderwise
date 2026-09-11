import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../App.css";

let nextPlaceId = 1;
let nextSectionId = 1;
let nextNumber = 1;

function formatDayLabel(date) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${weekday}, ${month} ${day}${suffix}`;
}

function buildDaysFromRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const days = [];
  const current = new Date(start);
  while (current <= end) {
    days.push({ label: formatDayLabel(current), placeIds: [] });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export default function TripPlanBuilderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const tripInfo = location.state || {};

  const [destination, setDestination] = useState(tripInfo.destination || "");
  const [startDate, setStartDate] = useState(tripInfo.startDate || "");
  const [endDate, setEndDate] = useState(tripInfo.endDate || "");
  const [people, setPeople] = useState(tripInfo.people || 0);

  // "Where to go?" (`places`) and each "+ New List" section
  // (`customSections[].places`) are independent lists, each with
  // their own places. The itinerary's "Add a new place" (per day)
  // looks for a name match specifically in "Where to go?" so visited
  // status can be shared between the itinerary and that list.
  const [tripState, setTripState] = useState(
    tripInfo.restoredTripState || {
      places: [],
      customSections: [{ id: nextSectionId++, name: "", placeInput: "", places: [] }],
      days: [],
      budgetTotal: 0,
      expenses: [],
    }
  );

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const applyChange = (updater) => {
    setTripState((prevState) => {
      setPast((p) => [...p, prevState]);
      setFuture([]);
      return typeof updater === "function" ? updater(prevState) : updater;
    });
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [tripState, ...f]);
    setTripState(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, tripState]);
    setTripState(next);
  };

  const { places, customSections, days, budgetTotal, expenses = [] } = tripState;

  // --- Edit Trip Info modal ---
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [editForm, setEditForm] = useState({ destination, startDate, endDate, people });

  const openEditTrip = () => {
    setEditForm({ destination, startDate, endDate, people });
    setShowEditTrip(true);
  };

  const handleSaveTripInfo = () => {
    setDestination(editForm.destination);
    setStartDate(editForm.startDate);
    setEndDate(editForm.endDate);
    setPeople(editForm.people);
    setShowEditTrip(false);
  };

  const [newPlaceInput, setNewPlaceInput] = useState("");
  const newPlaceInputRef = useRef(null);

  const generatedDays = useMemo(
    () => buildDaysFromRange(startDate, endDate),
    [startDate, endDate]
  );

  useEffect(() => {
    setTripState((prev) => {
      if (generatedDays.length === 0) return { ...prev, days: [] };
      return {
        ...prev,
        days: generatedDays.map((day, i) => ({
          ...day,
          placeIds: prev.days[i] ? prev.days[i].placeIds : [],
        })),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Finds a place wherever it lives (top-level "Where to go?" list or
  // inside any "Name this section" list) and returns it along with
  // its display number = its position in whichever list it belongs to.
  const findPlaceWithOrigin = (state, placeId) => {
    const mainIdx = state.places.findIndex((p) => p.id === placeId);
    if (mainIdx !== -1) return { place: state.places[mainIdx], number: mainIdx + 1 };
    for (const s of state.customSections) {
      const idx = s.places.findIndex((p) => p.id === placeId);
      if (idx !== -1) return { place: s.places[idx], number: idx + 1 };
    }
    return null;
  };

  // Updates a place wherever it lives (top-level or inside a section).
  const updatePlaceEverywhere = (state, placeId, updater) => {
    if (state.places.some((p) => p.id === placeId)) {
      return {
        ...state,
        places: state.places.map((p) => (p.id === placeId ? updater(p) : p)),
      };
    }
    return {
      ...state,
      customSections: state.customSections.map((s) => ({
        ...s,
        places: s.places.map((p) => (p.id === placeId ? updater(p) : p)),
      })),
    };
  };

  const budgetSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Adds a new place to the "Where to go?" checklist only.
  const addPlace = (name) => {
    const place = { id: nextPlaceId++, number: nextNumber++, name, visited: false };
    applyChange((prev) => ({ ...prev, places: [...prev.places, place] }));
  };

  const handleAddPlace = (e) => {
    if (e.key !== "Enter" || !newPlaceInput.trim()) return;
    addPlace(newPlaceInput.trim());
    setNewPlaceInput("");
  };

  const toggleVisited = (placeId) => {
    applyChange((prev) => updatePlaceEverywhere(prev, placeId, (p) => ({ ...p, visited: !p.visited })));
  };

  // --- Where to go? heading title (editable via pencil, like a section name) ---
  const [whereToGoTitle, setWhereToGoTitle] = useState("Where to go?");
  const [editingWhereToGoTitle, setEditingWhereToGoTitle] = useState(false);

  const handleDeletePlace = (placeId) => {
    applyChange((prev) => ({
      ...prev,
      places: prev.places.filter((p) => p.id !== placeId),
      days: prev.days.map((day) => ({
        ...day,
        placeIds: day.placeIds.filter((id) => id !== placeId),
      })),
    }));
  };

  // Delete confirmation modal — replaces window.confirm with a
  // styled in-app popup. `pendingDelete` holds what's about to be
  // deleted: { type: "whereToGo" } or { type: "section", id }.
  const [pendingDelete, setPendingDelete] = useState(null);

  const performDeleteWhereToGoList = () => {
    applyChange((prev) => {
      const idsToRemove = new Set(prev.places.map((p) => p.id));
      return {
        ...prev,
        places: [],
        days: prev.days.map((day) => ({
          ...day,
          placeIds: day.placeIds.filter((id) => !idsToRemove.has(id)),
        })),
      };
    });
  };

  const performDeleteSection = (sectionId) => {
    applyChange((prev) => {
      const section = prev.customSections.find((s) => s.id === sectionId);
      const idsToRemove = new Set((section?.places || []).map((p) => p.id));
      return {
        ...prev,
        customSections: prev.customSections.map((s) =>
          s.id === sectionId ? { ...s, places: [] } : s
        ),
        days: prev.days.map((day) => ({
          ...day,
          placeIds: day.placeIds.filter((id) => !idsToRemove.has(id)),
        })),
      };
    });
  };

  const handleDeleteWhereToGoList = () => setPendingDelete({ type: "whereToGo" });

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "whereToGo") performDeleteWhereToGoList();
    if (pendingDelete.type === "section") performDeleteSection(pendingDelete.id);
    setPendingDelete(null);
  };

  // --- "+ New List" — commits whatever is currently typed in every
  // section's own input into that section's list. It no longer
  // spawns an additional blank section on each click. ---
  const handleNewList = () => {
    applyChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) => {
        if (!s.placeInput.trim()) return s;
        const place = {
          id: nextPlaceId++,
          number: nextNumber++,
          name: s.placeInput.trim(),
          visited: false,
        };
        return { ...s, places: [...s.places, place], placeInput: "" };
      }),
    }));
  };

  const [editingSectionName, setEditingSectionName] = useState({});

  const toggleSectionNameEdit = (sectionId) => {
    setEditingSectionName((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleSectionNameChange = (sectionId, value) => {
    setTripState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id === sectionId ? { ...s, name: value } : s
      ),
    }));
  };

  const handleSectionPlaceInputChange = (sectionId, value) => {
    setTripState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id === sectionId ? { ...s, placeInput: value } : s
      ),
    }));
  };

  const toggleSectionPlaceVisited = (sectionId, placeId) => {
    applyChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              places: s.places.map((p) =>
                p.id === placeId ? { ...p, visited: !p.visited } : p
              ),
            }
      ),
    }));
  };

  const handleDeleteSection = (sectionId) => setPendingDelete({ type: "section", id: sectionId });

  // --- Itinerary: each day has its own independent "Add a new place"
  // input. Typing a place either reuses an existing "Where to go?"
  // entry with the same name (shared visited status), or creates a
  // new one there. ---
  const [dayInputs, setDayInputs] = useState({});

  const handleDayInputChange = (dayIndex, value) => {
    setDayInputs((prev) => ({ ...prev, [dayIndex]: value }));
  };

  const handleAddDayPlace = (dayIndex) => (e) => {
    if (e.key !== "Enter") return;
    const value = (dayInputs[dayIndex] || "").trim();
    if (!value) return;

    applyChange((prev) => {
      const lower = value.toLowerCase();
      // Search "Where to go?" first, then every "Name this section" list.
      let existing = prev.places.find((p) => p.name.trim().toLowerCase() === lower);
      if (!existing) {
        for (const s of prev.customSections) {
          existing = s.places.find((p) => p.name.trim().toLowerCase() === lower);
          if (existing) break;
        }
      }

      let updatedState = prev;
      let placeId;
      if (existing) {
        placeId = existing.id;
      } else {
        const newPlace = { id: nextPlaceId++, number: nextNumber++, name: value, visited: false };
        updatedState = { ...prev, places: [...prev.places, newPlace] };
        placeId = newPlace.id;
      }

      return {
        ...updatedState,
        days: updatedState.days.map((day, i) => {
          if (i !== dayIndex) return day;
          if (day.placeIds.includes(placeId)) return day;
          return { ...day, placeIds: [...day.placeIds, placeId] };
        }),
      };
    });
    setDayInputs((prev) => ({ ...prev, [dayIndex]: "" }));
  };

  // --- Reordering places within a day via drag-and-drop ---
  const [draggingPlaceId, setDraggingPlaceId] = useState(null);

  const handleItemDragStart = (e, dayIndex, placeId) => {
    setDraggingPlaceId(placeId);
    e.dataTransfer.setData("text/plain", JSON.stringify({ dayIndex, placeId }));
  };

  const handleItemDragOver = (e) => {
    e.preventDefault();
  };

  const handleItemDrop = (e, dayIndex, targetPlaceId) => {
    e.preventDefault();
    setDraggingPlaceId(null);
    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    if (!data || data.dayIndex !== dayIndex || data.placeId === targetPlaceId) return;

    applyChange((prev) => ({
      ...prev,
      days: prev.days.map((day, i) => {
        if (i !== dayIndex) return day;
        const ids = [...day.placeIds];
        const fromIdx = ids.indexOf(data.placeId);
        const toIdx = ids.indexOf(targetPlaceId);
        if (fromIdx === -1 || toIdx === -1) return day;
        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, data.placeId);
        return { ...day, placeIds: ids };
      }),
    }));
  };

  // --- Select Time (per place, shown inline when clicked) ---
  const [editingTimeFor, setEditingTimeFor] = useState(null);

  const updatePlaceTime = (placeId, value) => {
    setTripState((prev) => updatePlaceEverywhere(prev, placeId, (p) => ({ ...p, time: value })));
  };

  const updatePlaceNote = (placeId, value) => {
    setTripState((prev) => updatePlaceEverywhere(prev, placeId, (p) => ({ ...p, note: value })));
  };

  // --- Sidebar scroll targets ---
  const whereToGoRef = useRef(null);
  const itineraryRef = useRef(null);
  const untitledRef = useRef(null);

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // --- Add Cost -> scroll down to the "Expenses" list on this same page ---
  const expensesRef = useRef(null);

  const handleAddCostForPlace = () => {
    expensesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // --- Budget edit ---
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budgetTotal);

  const openEditBudget = () => {
    setBudgetInput(budgetTotal);
    setShowEditBudget(true);
  };

  const handleSaveBudget = () => {
    applyChange((prev) => ({ ...prev, budgetTotal: Number(budgetInput) || 0 }));
    setShowEditBudget(false);
  };

  // --- Navigate to Add Expense page ---
  const handleGoToAddExpense = () => {
    const tripPlanItems = [...places, ...customSections.flatMap((s) => s.places)];
    navigate("/add-expense", {
      state: {
        destination,
        startDate,
        endDate,
        people,
        tripState,
        returnPath: "/trip-plan",
        tripPlanItems,
      },
    });
  };

  const handleGoToBreakdown = () => {
    navigate("/breakdown", {
      state: {
        destination,
        startDate,
        endDate,
        people,
        tripState,
        returnPath: "/trip-plan",
        expenses,
        days,
      },
    });
  };

  const handleGoToAddCrew = () => {
    navigate("/invite-crew", {
      state: {
        destination,
        startDate,
        endDate,
        people,
        tripState,
        returnPath: "/trip-plan",
      },
    });
  };

  return (
    <div className="ww-builder-page">
      <header className="ww-builder-topbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <div className="ww-builder-topbar-actions">
          <span
            className="ww-undo-redo"
            onClick={handleUndo}
            style={{ cursor: past.length === 0 ? "default" : "pointer", opacity: past.length === 0 ? 0.4 : 1 }}
          >
            ↩ Undo
          </span>
          <span className="ww-builder-saved">Saved</span>
          <span
            className="ww-undo-redo"
            onClick={handleRedo}
            style={{ cursor: future.length === 0 ? "default" : "pointer", opacity: future.length === 0 ? 0.4 : 1 }}
          >
            ↪ Redo
          </span>
          <button className="ww-trip-plan-btn">Trip Plan</button>
          <span>⋯</span>
        </div>
      </header>

      <div className="ww-builder-body">
        <aside className="ww-builder-sidebar">
          <p className="ww-sidebar-item active">Overview</p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(whereToGoRef)} style={{ cursor: "pointer" }}>
            Where to go?
          </p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(itineraryRef)} style={{ cursor: "pointer" }}>
            Notes
          </p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(untitledRef)} style={{ cursor: "pointer" }}>
            Untitled
          </p>
          <p className="ww-sidebar-header">Itinerary</p>
          {days.map((day) => (
            <p className="ww-sidebar-item" key={day.label}>{day.label}</p>
          ))}
          <p className="ww-sidebar-header">Budget</p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(expensesRef)} style={{ cursor: "pointer" }}>
            View
          </p>
        </aside>

        <main className="ww-builder-main">
          <h1 className="ww-builder-trip-title">
            Trip to {destination || "your next destination"}{" "}
            <span className="ww-edit-icon" onClick={openEditTrip} style={{ cursor: "pointer" }}>
              ✎
            </span>
          </h1>
          {startDate && endDate && (
            <p className="ww-builder-dates">📅 {startDate} - {endDate}</p>
          )}

          <div className="ww-builder-map">
            <img src="/assets/philippines-map-placeholder.jpg" alt="Trip map" />
          </div>

          <h2 className="ww-builder-section-title">
            <span className="ww-title-with-icon">
              {editingWhereToGoTitle ? (
                <input
                  className="ww-section-name-input-inline"
                  value={whereToGoTitle}
                  onChange={(e) => setWhereToGoTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingWhereToGoTitle(false);
                  }}
                  autoFocus
                />
              ) : (
                <span>{whereToGoTitle}</span>
              )}
              <span
                className="ww-edit-icon"
                onClick={() => setEditingWhereToGoTitle((v) => !v)}
                style={{ cursor: "pointer" }}
              >
                ✎
              </span>
            </span>
            <span
              className="ww-more-icon"
              onClick={handleDeleteWhereToGoList}
              style={{ cursor: "pointer" }}
              title="Delete this entire list"
            >
              ⋯
            </span>
          </h2>
          <div ref={whereToGoRef} />

          {places.map((p, i) => (
            <div className="ww-place-card" key={p.id}>
              <p className="ww-place-name">
                📍{i + 1} {p.name} {p.visited && <span className="ww-visited-badge">✅ Visited</span>}
              </p>
              <input
                className="ww-place-notes-input"
                placeholder="Add notes, etc, here"
                value={p.note || ""}
                onChange={(e) => updatePlaceNote(p.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                }}
              />
              <p className="ww-place-actions">
                <span>🕐 Select Time</span>
                <span>$ Add Cost</span>
              </p>
              <p
                className="ww-mark-visited"
                onClick={() => toggleVisited(p.id)}
                style={{ cursor: "pointer" }}
              >
                {p.visited ? "✕ Unmark visited" : "✓ Mark visited"}
              </p>
            </div>
          ))}

          <input
            ref={newPlaceInputRef}
            className="ww-add-place-input"
            placeholder="📍 Add a new place"
            value={newPlaceInput}
            onChange={(e) => setNewPlaceInput(e.target.value)}
            onKeyDown={handleAddPlace}
          />

          <hr className="ww-builder-divider" />

          {customSections.map((section, sectionIndex) => (
            <div key={section.id} className="ww-custom-section" ref={sectionIndex === 0 ? untitledRef : null}>
              <h2
                className={`ww-builder-section-title ${
                  section.name ? "" : "ww-section-placeholder-title"
                }`}
              >
                <span className="ww-title-with-icon">
                  {editingSectionName[section.id] ? (
                    <input
                      className="ww-section-name-input-inline"
                      placeholder='Name this section (e.g., "Lamon")'
                      value={section.name}
                      onChange={(e) => handleSectionNameChange(section.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") toggleSectionNameEdit(section.id);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{section.name || 'Name this section (e.g., "Lamon")'}</span>
                  )}
                  <span
                    className="ww-edit-icon"
                    onClick={() => toggleSectionNameEdit(section.id)}
                    style={{ cursor: "pointer" }}
                  >
                    ✎
                  </span>
                </span>
                <span
                  className="ww-more-icon"
                  onClick={() => handleDeleteSection(section.id)}
                  style={{ cursor: "pointer" }}
                  title="Delete this entire list"
                >
                  ⋯
                </span>
              </h2>

              {section.places.map((p, i) => (
                <div className="ww-place-card" key={p.id}>
                  <p className="ww-place-name">
                    📍{i + 1} {p.name} {p.visited && <span className="ww-visited-badge">✅ Visited</span>}
                  </p>
                  <input
                    className="ww-place-notes-input"
                    placeholder="Add notes, etc, here"
                    value={p.note || ""}
                    onChange={(e) => updatePlaceNote(p.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                    }}
                  />
                  <p className="ww-place-actions">
                    <span>🕐 Select Time</span>
                    <span>$ Add Cost</span>
                  </p>
                  <p
                    className="ww-mark-visited"
                    onClick={() => toggleSectionPlaceVisited(section.id, p.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {p.visited ? "✕ Unmark visited" : "✓ Mark visited"}
                  </p>
                </div>
              ))}

              <input
                className="ww-add-place-input"
                placeholder="📍 Add a new place"
                value={section.placeInput}
                onChange={(e) => handleSectionPlaceInputChange(section.id, e.target.value)}
              />
            </div>
          ))}

          <button className="ww-new-list-btn" onClick={handleNewList}>
            + New List
          </button>

          <hr className="ww-builder-thick-divider" />

          {days.length > 0 && (
            <>
              <h2 className="ww-builder-section-title" ref={itineraryRef}>
                Itinerary
                {startDate && endDate && (
                  <span className="ww-date-pill">📅 {startDate} - {endDate}</span>
                )}
              </h2>

              {days.map((day, dayIndex) => {
                const dayPlaces = day.placeIds
                  .map((id) => findPlaceWithOrigin(tripState, id))
                  .filter(Boolean);

                return (
                  <div className="ww-day-block" key={day.label}>
                    <p className="ww-day-header">⌄ {day.label}</p>
                    {dayPlaces.map(({ place: p, number }, i) => (
                      <React.Fragment key={p.id}>
                        <div
                          className="ww-place-card ww-itinerary-place"
                          draggable
                          onDragStart={(e) => handleItemDragStart(e, dayIndex, p.id)}
                          onDragOver={handleItemDragOver}
                          onDrop={(e) => handleItemDrop(e, dayIndex, p.id)}
                          style={{
                            cursor: "grab",
                            opacity: draggingPlaceId === p.id ? 0.5 : 1,
                          }}
                        >
                          <div className="ww-visited-checkbox">
                            <input
                              type="checkbox"
                              checked={p.visited}
                              onChange={() => toggleVisited(p.id)}
                            />
                          </div>
                          <div>
                            <p className="ww-place-name">📍{number} {p.name}</p>
                            <input
                              className="ww-place-notes-input"
                              placeholder="Add notes, etc, here"
                              value={p.note || ""}
                              onChange={(e) => updatePlaceNote(p.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.target.blur();
                              }}
                            />
                            <p className="ww-place-actions">
                              {editingTimeFor === p.id ? (
                                <input
                                  type="time"
                                  autoFocus
                                  value={p.time || ""}
                                  onChange={(e) => updatePlaceTime(p.id, e.target.value)}
                                  onBlur={() => setEditingTimeFor(null)}
                                />
                              ) : (
                                <span
                                  onClick={() => setEditingTimeFor(p.id)}
                                  style={{ cursor: "pointer" }}
                                >
                                  🕐 {p.time || "Select Time"}
                                </span>
                              )}
                              <span
                                onClick={handleAddCostForPlace}
                                style={{ cursor: "pointer" }}
                              >
                                $ Add Cost
                              </span>
                            </p>
                            <p className="ww-mark-visited">
                              {p.visited ? "✓ Visited" : "✓ Mark visited"}
                            </p>
                          </div>
                        </div>
                        <p className="ww-directions-hint">
                          🚗 -- mins - -- km &nbsp;|&nbsp; Directions
                        </p>
                      </React.Fragment>
                    ))}
                    <input
                      className="ww-add-place-input"
                      placeholder="📍 Add a new place"
                      value={dayInputs[dayIndex] || ""}
                      onChange={(e) => handleDayInputChange(dayIndex, e.target.value)}
                      onKeyDown={handleAddDayPlace(dayIndex)}
                    />
                  </div>
                );
              })}

              <hr className="ww-builder-thick-divider" />
            </>
          )}

          <h2 className="ww-builder-section-title">Budget</h2>
          <div className="ww-budget-card">
            <p className="ww-budget-amount">₱{budgetSpent.toLocaleString()}.00</p>
            <p className="ww-budget-total">
              Budget: ₱{budgetTotal.toLocaleString()}.00{" "}
              <span className="ww-edit-icon" onClick={openEditBudget} style={{ cursor: "pointer" }}>
                ✎
              </span>
            </p>
            <div className="ww-budget-buttons">
              <button className="ww-add-expense-btn" onClick={handleGoToAddExpense}>
                + Add Expense
              </button>
            </div>
            <p className="ww-budget-link" onClick={handleGoToBreakdown} style={{ cursor: "pointer" }}>
              📊 View Breakdown
            </p>
            <p className="ww-budget-link" onClick={handleGoToAddCrew} style={{ cursor: "pointer" }}>
              👤 Add Crew
            </p>
          </div>

          <h2 className="ww-builder-section-title" ref={expensesRef}>⌄ Expenses</h2>
          {expenses.length === 0 ? (
            <p className="ww-expense-empty">No expenses yet. Add one to get started.</p>
          ) : (
            expenses.map((e) => (
              <div className="ww-expense-row" key={e.id}>
                <span>{e.icon} {e.description || e.label}</span>
                <span>₱{e.amount.toLocaleString()}</span>
              </div>
            ))
          )}
        </main>
      </div>

      {showEditTrip && (
        <div className="ww-modal-overlay" onClick={() => setShowEditTrip(false)}>
          <div className="ww-planning-form ww-modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="ww-planning-title">Edit your trip</h1>
            <label className="ww-planning-label">Destination?</label>
            <input
              type="text"
              className="ww-planning-input"
              placeholder="Thailand"
              value={editForm.destination}
              onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
            />
            <hr className="ww-planning-divider" />
            <label className="ww-planning-label">Dates</label>
            <div className="ww-dates-row">
              <input
                type="date"
                className="ww-date-input"
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
              />
              <input
                type="date"
                className="ww-date-input"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
              />
            </div>
            <hr className="ww-planning-divider" />
            <label className="ww-planning-label ww-center-label">How many people?</label>
            <div className="ww-people-counter">
              <button onClick={() => setEditForm({ ...editForm, people: Math.max(0, editForm.people - 1) })}>
                −
              </button>
              <span>{editForm.people}</span>
              <button onClick={() => setEditForm({ ...editForm, people: editForm.people + 1 })}>
                +
              </button>
            </div>
            <div className="ww-modal-actions">
              <button className="ww-modal-cancel-btn" onClick={() => setShowEditTrip(false)}>
                Cancel
              </button>
              <button className="ww-lets-go-btn" onClick={handleSaveTripInfo}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditBudget && (
        <div className="ww-modal-overlay" onClick={() => setShowEditBudget(false)}>
          <div className="ww-planning-form ww-modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="ww-planning-title">Edit budget</h1>
            <label className="ww-planning-label">Total budget (₱)</label>
            <input
              type="number"
              min="0"
              className="ww-planning-input"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
            />
            <div className="ww-modal-actions">
              <button className="ww-modal-cancel-btn" onClick={() => setShowEditBudget(false)}>
                Cancel
              </button>
              <button className="ww-lets-go-btn" onClick={handleSaveBudget}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="ww-modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="ww-warning-modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="ww-warning-modal-icon">⚠️</p>
            <p className="ww-warning-modal-text">Delete section</p>
            <p className="ww-warning-modal-subtext">
              This will remove every place in this list. This can't be undone
              (except with Undo).
            </p>
            <button className="ww-warning-modal-ok-btn" onClick={confirmPendingDelete}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}