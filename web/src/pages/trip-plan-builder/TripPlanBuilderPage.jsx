import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../App.css";

let nextPlaceId = 1;
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

  // "Where to go?" (`places`) is a standalone checklist/reference for
  // the whole trip — it has no link to the itinerary. Each itinerary
  // day (`days[i].places`) keeps its own independent list, typed in
  // directly per day.
  const [tripState, setTripState] = useState(
    tripInfo.restoredTripState || {
      places: [],
      customSections: [],
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

  const { places, days, budgetTotal, expenses = [] } = tripState;

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

  // Single persistent input under "Name this section" — clicking
  // "+ New List" is what submits it (instead of pressing Enter), then
  // the input clears itself, ready for the next entry.
  const [sectionPlaceInput, setSectionPlaceInput] = useState("");

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
    applyChange((prev) => ({
      ...prev,
      places: prev.places.map((p) =>
        p.id === placeId ? { ...p, visited: !p.visited } : p
      ),
    }));
  };

  // "+ New List" click = the submit action for the section input
  // (replaces pressing Enter). Adds the typed place to "Where to go?"
  // and clears the input so it's ready for the next one.
  const handleNewList = () => {
    if (!sectionPlaceInput.trim()) return;
    addPlace(sectionPlaceInput.trim());
    setSectionPlaceInput("");
  };

  // --- Where to go? list edit mode ---
  const [editingWhereToGo, setEditingWhereToGo] = useState(false);

  const handleEditPlaceName = (placeId, value) => {
    setTripState((prev) => ({
      ...prev,
      places: prev.places.map((p) => (p.id === placeId ? { ...p, name: value } : p)),
    }));
  };

  const handleDeletePlace = (placeId) => {
    applyChange((prev) => ({
      ...prev,
      places: prev.places.filter((p) => p.id !== placeId),
    }));
  };

  // --- Itinerary: each day has its own independent "Add a new place"
  // input, unrelated to the "Where to go?" checklist. ---
  const [dayInputs, setDayInputs] = useState({});

  const handleDayInputChange = (dayIndex, value) => {
    setDayInputs((prev) => ({ ...prev, [dayIndex]: value }));
  };

  // Typing a place into a day's input either reuses an existing
  // "Where to go?" entry with the same name, or creates a new one —
  // either way, the day just stores a reference (id) to it. This is
  // what makes "visited" shared between the itinerary and "Where to
  // go?": they're both looking at the same underlying place object.
  const handleAddDayPlace = (dayIndex) => (e) => {
    if (e.key !== "Enter") return;
    const value = (dayInputs[dayIndex] || "").trim();
    if (!value) return;

    applyChange((prev) => {
      const existing = prev.places.find(
        (p) => p.name.trim().toLowerCase() === value.toLowerCase()
      );
      let places = prev.places;
      let placeId;
      if (existing) {
        placeId = existing.id;
      } else {
        const newPlace = { id: nextPlaceId++, number: nextNumber++, name: value, visited: false };
        places = [...places, newPlace];
        placeId = newPlace.id;
      }
      return {
        ...prev,
        places,
        days: prev.days.map((day, i) => {
          if (i !== dayIndex) return day;
          if (day.placeIds.includes(placeId)) return day; // already in this day
          return { ...day, placeIds: [...day.placeIds, placeId] };
        }),
      };
    });
    setDayInputs((prev) => ({ ...prev, [dayIndex]: "" }));
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
    navigate("/add-expense", {
      state: {
        destination,
        startDate,
        endDate,
        people,
        tripState,
        returnPath: "/trip-plan",
        tripPlanItems: places,
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
          <p className="ww-sidebar-item">Search</p>
          <p className="ww-sidebar-item">Where to go?</p>
          <p className="ww-sidebar-item">Notes</p>
          <p className="ww-sidebar-item">Untitled</p>
          <p className="ww-sidebar-header">Itinerary</p>
          {days.map((day) => (
            <p className="ww-sidebar-item" key={day.label}>{day.label}</p>
          ))}
          <p className="ww-sidebar-header">Budget</p>
          <p className="ww-sidebar-item">View</p>
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

          <button className="ww-browse-btn">🔍 Browse</button>

          <h2 className="ww-builder-section-title">
            Where to go?{" "}
            <span
              className="ww-edit-icon"
              onClick={() => setEditingWhereToGo((v) => !v)}
              style={{ cursor: "pointer" }}
            >
              ✎
            </span>
            <span className="ww-more-icon">⋯</span>
          </h2>

          {places.map((p, i) => (
            <div className="ww-place-card" key={p.id}>
              {editingWhereToGo ? (
                <div className="ww-place-edit-row">
                  <span className="ww-place-number">📍{i + 1}</span>
                  <input
                    className="ww-place-edit-input"
                    value={p.name}
                    onChange={(e) => handleEditPlaceName(p.id, e.target.value)}
                  />
                  <button className="ww-place-delete-btn" onClick={() => handleDeletePlace(p.id)}>
                    🗑
                  </button>
                </div>
              ) : (
                <>
                  <p className="ww-place-name">
                    📍{i + 1} {p.name} {p.visited && <span className="ww-visited-badge">✅ Visited</span>}
                  </p>
                  <p className="ww-place-notes">Add notes, etc, here</p>
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
                </>
              )}
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

          {/* Single persistent input. Clicking "+ New List" below
              submits whatever is typed here into "Where to go?" and
              clears it — no Enter key needed. */}
          <h2 className="ww-builder-section-title ww-section-placeholder-title">
            Name this section (e.g., "Lamon")
            <span className="ww-edit-icon">✎</span>
            <span className="ww-more-icon">⋯</span>
          </h2>
          <input
            className="ww-add-place-input"
            placeholder="📍 Add a new place"
            value={sectionPlaceInput}
            onChange={(e) => setSectionPlaceInput(e.target.value)}
          />

          <button className="ww-new-list-btn" onClick={handleNewList}>
            + New List
          </button>

          <hr className="ww-builder-thick-divider" />

          {days.length > 0 && (
            <>
              <h2 className="ww-builder-section-title">
                Itinerary
                {startDate && endDate && (
                  <span className="ww-date-pill">📅 {startDate} - {endDate}</span>
                )}
              </h2>

              {days.map((day, dayIndex) => {
                const dayPlaces = day.placeIds
                  .map((id) => places.find((p) => p.id === id))
                  .filter(Boolean);

                return (
                  <div className="ww-day-block" key={day.label}>
                    <p className="ww-day-header">⌄ {day.label}</p>
                    {dayPlaces.map((p, i) => (
                      <React.Fragment key={p.id}>
                        <div className="ww-place-card ww-itinerary-place">
                          <div className="ww-visited-checkbox">
                            <input
                              type="checkbox"
                              checked={p.visited}
                              onChange={() => toggleVisited(p.id)}
                            />
                          </div>
                          <div>
                            <p className="ww-place-name">📍{i + 1} {p.name}</p>
                            <p className="ww-place-notes">Add notes, etc, here</p>
                            <p className="ww-place-actions">
                              <span>🕐 Select Time</span>
                              <span>$ Add Cost</span>
                            </p>
                            <p className="ww-mark-visited">
                              {p.visited ? "✓ Visited" : "✓ Mark visited"}
                            </p>
                          </div>
                        </div>
                        {i < dayPlaces.length - 1 && (
                          <p className="ww-directions-hint">
                            🚗 -- mins - -- km &nbsp;|&nbsp; Directions
                          </p>
                        )}
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

          <h2 className="ww-builder-section-title">⌄ Expenses</h2>
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
    </div>
  );
}