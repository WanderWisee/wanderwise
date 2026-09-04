import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  const tripInfo = location.state || {};

  // Trip info is now local state (not just read from location.state)
  // so the edit modal can update it in place.
  const [destination, setDestination] = useState(tripInfo.destination || "");
  const [startDate, setStartDate] = useState(tripInfo.startDate || "");
  const [endDate, setEndDate] = useState(tripInfo.endDate || "");
  const [people, setPeople] = useState(tripInfo.people || 0);

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

  const [places, setPlaces] = useState([]);
  const [newPlaceInput, setNewPlaceInput] = useState("");
  const [customSections, setCustomSections] = useState([]);

  const generatedDays = useMemo(
    () => buildDaysFromRange(startDate, endDate),
    [startDate, endDate]
  );
  const [days, setDays] = useState([]);

  // When dates change (via edit modal), regenerate the day list.
  // Existing places already assigned to a day are preserved by
  // matching day index where possible; anything beyond the new
  // range is dropped from the itinerary view (still lives in
  // "Where to go?" so it isn't lost, just unassigned).
  useEffect(() => {
    setDays((prevDays) => {
      if (generatedDays.length === 0) return [];
      return generatedDays.map((day, i) => ({
        ...day,
        places: prevDays[i] ? prevDays[i].places : [],
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const [budgetSpent] = useState(0);
  const [budgetTotal, setBudgetTotal] = useState(0);

  const addPlaceToItinerary = (place) => {
    setDays((prev) => {
      const base = prev.length > 0 ? prev : generatedDays;
      if (base.length === 0) return prev;
      return base.map((day, i) =>
        i === 0
          ? {
              ...day,
              places: [
                ...day.places,
                { id: place.id, number: place.number, name: place.name, visited: false },
              ],
            }
          : day
      );
    });
  };

  const handleAddPlace = (e) => {
    if (e.key !== "Enter" || !newPlaceInput.trim()) return;
    const place = { id: nextPlaceId++, number: nextNumber++, name: newPlaceInput.trim() };
    setPlaces((prev) => [...prev, place]);
    setNewPlaceInput("");
    addPlaceToItinerary(place);
  };

  const toggleVisited = (dayIndex, placeId) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i !== dayIndex
          ? day
          : {
              ...day,
              places: day.places.map((p) =>
                p.id === placeId ? { ...p, visited: !p.visited } : p
              ),
            }
      )
    );
  };

  const handleNewList = () => {
    setCustomSections((prev) => [
      ...prev,
      { id: nextSectionId++, name: "", places: [], placeInput: "" },
    ]);
  };

  const handleSectionNameChange = (sectionId, value) => {
    setCustomSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name: value } : s))
    );
  };

  const handleSectionPlaceInputChange = (sectionId, value) => {
    setCustomSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, placeInput: value } : s))
    );
  };

  const handleAddSectionPlace = (sectionId) => (e) => {
    if (e.key !== "Enter") return;
    const section = customSections.find((s) => s.id === sectionId);
    if (!section || !section.placeInput.trim()) return;

    const place = { id: nextPlaceId++, number: nextNumber++, name: section.placeInput.trim() };
    setCustomSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, places: [...s.places, place], placeInput: "" }
      )
    );
  };

  const addFromSectionToItinerary = (sectionId, place) => {
    addPlaceToItinerary(place);
    setCustomSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, places: s.places.filter((p) => p.id !== place.id) }
      )
    );
  };

  // --- Where to go? list edit mode ---
  const [editingWhereToGo, setEditingWhereToGo] = useState(false);

  const handleEditPlaceName = (placeId, value) => {
    setPlaces((prev) =>
      prev.map((p) => (p.id === placeId ? { ...p, name: value } : p))
    );
    // keep itinerary copy in sync
    setDays((prev) =>
      prev.map((day) => ({
        ...day,
        places: day.places.map((p) =>
          p.id === placeId ? { ...p, name: value } : p
        ),
      }))
    );
  };

  const handleDeletePlace = (placeId) => {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
    setDays((prev) =>
      prev.map((day) => ({
        ...day,
        places: day.places.filter((p) => p.id !== placeId),
      }))
    );
  };

  // --- Budget edit ---
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budgetTotal);

  const openEditBudget = () => {
    setBudgetInput(budgetTotal);
    setShowEditBudget(true);
  };

  const handleSaveBudget = () => {
    setBudgetTotal(Number(budgetInput) || 0);
    setShowEditBudget(false);
  };

  return (
    <div className="ww-builder-page">
      <header className="ww-builder-topbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <div className="ww-builder-topbar-actions">
          <span>↩ Undo</span>
          <span className="ww-builder-saved">Saved</span>
          <span>↪ Redo</span>
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
                  <button
                    className="ww-place-delete-btn"
                    onClick={() => handleDeletePlace(p.id)}
                  >
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
              <input
                className="ww-section-name-input"
                placeholder='Name this section (e.g., "Lamon")'
                value={section.name}
                onChange={(e) => handleSectionNameChange(section.id, e.target.value)}
              />
              {section.places.map((p) => (
                <div className="ww-place-card" key={p.id}>
                  <p className="ww-place-name">📍{p.number} {p.name}</p>
                  <p className="ww-place-notes">Add notes, etc, here</p>
                  <p className="ww-place-actions">
                    <span>🕐 Select Time</span>
                    <span>$ Add Cost</span>
                  </p>
                  <p className="ww-mark-visited">✓ Mark visited</p>
                  {days.length > 0 && (
                    <button
                      className="ww-add-to-itinerary-btn"
                      onClick={() => addFromSectionToItinerary(section.id, p)}
                    >
                      + Add to itinerary
                    </button>
                  )}
                </div>
              ))}
              <input
                className="ww-add-place-input"
                placeholder="📍 Add a new place"
                value={section.placeInput}
                onChange={(e) =>
                  handleSectionPlaceInputChange(section.id, e.target.value)
                }
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
                      No places yet — add one above under "Where to go?".
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
              <button className="ww-add-expense-btn">+ Add Expense</button>
            </div>
            <p className="ww-budget-link">📊 View Breakdown</p>
            <p className="ww-budget-link">👤 Add Crew</p>
          </div>

          <h2 className="ww-builder-section-title">⌄ Expenses</h2>
          <p className="ww-expense-empty">No expenses yet. Add one to get started.</p>
        </main>
      </div>

      {/* --- Edit Trip Info Modal (reuses the "Begin your journey" form design) --- */}
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

      {/* --- Edit Budget Modal --- */}
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