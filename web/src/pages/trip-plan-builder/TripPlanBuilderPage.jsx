import React, { useState, useMemo, useEffect } from "react";
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
    days.push({ label: formatDayLabel(current), places: [] });
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

  // All editable trip data lives in one object so we can snapshot it
  // as a whole for Undo/Redo, and so it survives the round trip to
  // the Add Expense page (via tripInfo.restoredTripState).
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
          places: prev.days[i] ? prev.days[i].places : [],
        })),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const budgetSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Adds `place` to the itinerary at `dayIndex`. If that day doesn't
  // exist yet (e.g. more "New List" sections than actual trip days),
  // the place stays in its "Where to go?" / custom list without
  // joining the itinerary until the date range is extended.
  const addPlaceToItinerary = (state, place, dayIndex = 0) => {
    const base = state.days.length > 0 ? state.days : generatedDays;
    if (base.length === 0 || !base[dayIndex]) return state.days;
    return base.map((day, i) =>
      i === dayIndex
        ? {
            ...day,
            places: [
              ...day.places,
              { id: place.id, number: place.number, name: place.name, visited: false },
            ],
          }
        : day
    );
  };

  const handleAddPlace = (e) => {
    if (e.key !== "Enter" || !newPlaceInput.trim()) return;
    const place = { id: nextPlaceId++, number: nextNumber++, name: newPlaceInput.trim() };
    applyChange((prev) => ({
      ...prev,
      places: [...prev.places, place],
      days: addPlaceToItinerary(prev, place, 0), // "Where to go?" -> always Day 1
    }));
    setNewPlaceInput("");
  };

  const toggleVisited = (dayIndex, placeId) => {
    applyChange((prev) => ({
      ...prev,
      days: prev.days.map((day, i) =>
        i !== dayIndex
          ? day
          : {
              ...day,
              places: day.places.map((p) =>
                p.id === placeId ? { ...p, visited: !p.visited } : p
              ),
            }
      ),
    }));
  };

  // "+ New List" -> each list is pinned to the next day in sequence.
  // 1st list -> Day 2, 2nd list -> Day 3, etc.
  const handleNewList = () => {
    applyChange((prev) => ({
      ...prev,
      customSections: [
        ...prev.customSections,
        {
          id: nextSectionId++,
          name: "",
          places: [],
          placeInput: "",
          dayIndex: prev.customSections.length + 1,
        },
      ],
    }));
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

  // Adding a place inside a "New List" auto-joins the itinerary on
  // that list's assigned day — no extra click needed.
  const handleAddSectionPlace = (sectionId) => (e) => {
    if (e.key !== "Enter") return;
    const section = tripState.customSections.find((s) => s.id === sectionId);
    if (!section || !section.placeInput.trim()) return;

    const place = { id: nextPlaceId++, number: nextNumber++, name: section.placeInput.trim() };
    applyChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, places: [...s.places, place], placeInput: "" }
      ),
      days: addPlaceToItinerary(prev, place, section.dayIndex),
    }));
  };

  // --- Where to go? list edit mode ---
  const [editingWhereToGo, setEditingWhereToGo] = useState(false);

  const handleEditPlaceName = (placeId, value) => {
    setTripState((prev) => ({
      ...prev,
      places: prev.places.map((p) => (p.id === placeId ? { ...p, name: value } : p)),
      days: prev.days.map((day) => ({
        ...day,
        places: day.places.map((p) => (p.id === placeId ? { ...p, name: value } : p)),
      })),
    }));
  };

  const handleDeletePlace = (placeId) => {
    applyChange((prev) => ({
      ...prev,
      places: prev.places.filter((p) => p.id !== placeId),
      days: prev.days.map((day) => ({
        ...day,
        places: day.places.filter((p) => p.id !== placeId),
      })),
    }));
  };

  // --- "New List" section edit mode (per section, like "Where to go?") ---
  const [editingSections, setEditingSections] = useState({});

  const toggleSectionEdit = (sectionId) => {
    setEditingSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleEditSectionPlaceName = (sectionId, placeId, value) => {
    setTripState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              places: s.places.map((p) =>
                p.id === placeId ? { ...p, name: value } : p
              ),
            }
      ),
      days: prev.days.map((day) => ({
        ...day,
        places: day.places.map((p) =>
          p.id === placeId ? { ...p, name: value } : p
        ),
      })),
    }));
  };

  const handleDeleteSectionPlace = (sectionId, placeId) => {
    applyChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, places: s.places.filter((p) => p.id !== placeId) }
      ),
      days: prev.days.map((day) => ({
        ...day,
        places: day.places.filter((p) => p.id !== placeId),
      })),
    }));
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
    const tripPlanItems = [
      ...places,
      ...customSections.flatMap((s) => s.places),
    ];
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

          {places.map((p) => (
            <div className="ww-place-card" key={p.id}>
              {editingWhereToGo ? (
                <div className="ww-place-edit-row">
                  <span className="ww-place-number">📍{p.number}</span>
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
                  <p className="ww-place-name">📍{p.number} {p.name}</p>
                  <p className="ww-place-notes">Add notes, etc, here</p>
                  <p className="ww-place-actions">
                    <span>🕐 Select Time</span>
                    <span>$ Add Cost</span>
                  </p>
                  <p className="ww-mark-visited">✓ Mark visited</p>
                </>
              )}
            </div>
          ))}

          <input
            className="ww-add-place-input"
            placeholder="📍 Add a new place"
            value={newPlaceInput}
            onChange={(e) => setNewPlaceInput(e.target.value)}
            onKeyDown={handleAddPlace}
          />

          <hr className="ww-builder-divider" />

          {customSections.map((section) => (
            <div key={section.id} className="ww-custom-section">
              <div className="ww-section-name-row">
                <input
                  className="ww-section-name-input"
                  placeholder='Name this section (e.g., "Lamon")'
                  value={section.name}
                  onChange={(e) => handleSectionNameChange(section.id, e.target.value)}
                />
                {section.places.length > 0 && (
                  <span
                    className="ww-edit-icon"
                    onClick={() => toggleSectionEdit(section.id)}
                    style={{ cursor: "pointer" }}
                  >
                    ✎
                  </span>
                )}
              </div>

              {section.places.map((p) =>
                editingSections[section.id] ? (
                  <div className="ww-place-card" key={p.id}>
                    <div className="ww-place-edit-row">
                      <span className="ww-place-number">📍{p.number}</span>
                      <input
                        className="ww-place-edit-input"
                        value={p.name}
                        onChange={(e) =>
                          handleEditSectionPlaceName(section.id, p.id, e.target.value)
                        }
                      />
                      <button
                        className="ww-place-delete-btn"
                        onClick={() => handleDeleteSectionPlace(section.id, p.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ww-place-card" key={p.id}>
                    <p className="ww-place-name">📍{p.number} {p.name}</p>
                    <p className="ww-place-notes">Add notes, etc, here</p>
                    <p className="ww-place-actions">
                      <span>🕐 Select Time</span>
                      <span>$ Add Cost</span>
                    </p>
                    <p className="ww-mark-visited">✓ Mark visited</p>
                  </div>
                )
              )}

              <input
                className="ww-add-place-input"
                placeholder="📍 Add a new place"
                value={section.placeInput}
                onChange={(e) => handleSectionPlaceInputChange(section.id, e.target.value)}
                onKeyDown={handleAddSectionPlace(section.id)}
              />
            </div>
          ))}

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

              {days.map((day, dayIndex) => (
                <div className="ww-day-block" key={day.label}>
                  <p className="ww-day-header">⌄ {day.label}</p>
                  {day.places.map((p, i) => (
                    <React.Fragment key={p.id}>
                      <div className="ww-place-card ww-itinerary-place">
                        <div className="ww-visited-checkbox">
                          <input
                            type="checkbox"
                            checked={p.visited}
                            onChange={() => toggleVisited(dayIndex, p.id)}
                          />
                        </div>
                        <div>
                          <p className="ww-place-name">📍{p.number} {p.name}</p>
                          <p className="ww-place-notes">Add notes, etc, here</p>
                          <p className="ww-place-actions">
                            <span>🕐 Select Time</span>
                            <span>$ Add Cost</span>
                          </p>
                          <p className="ww-mark-visited">✓ Mark visited</p>
                        </div>
                      </div>
                      {i < day.places.length - 1 && (
                        <p className="ww-directions-hint">
                          🚗 -- mins - -- km &nbsp;|&nbsp; Directions
                        </p>
                      )}
                    </React.Fragment>
                  ))}
                  {day.places.length === 0 && (
                    <p className="ww-day-empty-hint">
                      No places yet — add one above under "Where to go?" or its list.
                    </p>
                  )}
                </div>
              ))}

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
            <p className="ww-budget-link">👤 Add Crew</p>
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
