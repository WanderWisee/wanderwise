import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../App.css";

let nextExpenseId = 1;

const categories = [
  { icon: "🍽️", label: "Food and Drinks" },
  { icon: "🚌", label: "Transit" },
  { icon: "🎟️", label: "Activities" },
  { icon: "🛍️", label: "Shopping" },
  { icon: "🚗", label: "Car Rental" },
  { icon: "🛏️", label: "Lodging" },
  { icon: "⛽", label: "Gas" },
  { icon: "✈️", label: "Flights" },
];

export default function AddExpensePage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Data handed off by TripPlanBuilderPage's "+ Add Expense" button.
  const {
    destination = "",
    startDate = "",
    endDate = "",
    people = 0,
    tripState = { places: [], customSections: [], days: [], budgetTotal: 0, expenses: [] },
    returnPath = "/trip-plan",
    tripPlanItems = [], // [{ id, name }] — built from "Where to go?" + custom lists
  } = location.state || {};

  const [amount, setAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // holds the tripPlanItems id
  const [description, setDescription] = useState("");

  const handleSave = () => {
    // Require at least one choice (category or trip-plan item) before saving.
    if (!selectedCategory && !selectedItem) return;

    const chosenTripItem = tripPlanItems.find((item) => item.id === selectedItem);

    // If picked "from a trip plan", find which itinerary day that
    // place belongs to, so the breakdown page can group by day.
    const matchedDay = chosenTripItem
      ? (tripState.days || []).find((day) =>
          day.places.some((p) => p.id === chosenTripItem.id)
        )
      : null;

    const newExpense = {
      id: nextExpenseId++,
      amount: Number(amount) || 0,
      label: selectedCategory || chosenTripItem?.name || "Expense",
      icon: selectedCategory
        ? categories.find((c) => c.label === selectedCategory)?.icon
        : "📍",
      description: description.trim(),
      dayLabel: matchedDay ? matchedDay.label : null,
    };

    const updatedTripState = {
      ...tripState,
      expenses: [...(tripState.expenses || []), newExpense],
    };

    navigate(returnPath, {
      state: {
        destination,
        startDate,
        endDate,
        people,
        restoredTripState: updatedTripState,
      },
    });
  };

  return (
    <div className="ww-add-expense-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">Home</a>
          <a href="/travel-tips">Guides</a>
          <a href="/hotels">Hotels</a>
          <span className="ww-menu-dropdown">Menu</span>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
          <span>👤</span>
        </div>
      </header>

      <main className="ww-add-expense-main">
        <h1 className="ww-add-expense-title">Add Expense</h1>

        <div className="ww-amount-input">
          <span className="ww-amount-caret">⌄</span>
          <span className="ww-amount-peso">₱</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <h2 className="ww-choose-item-title">Choose an Item</h2>

        <h3 className="ww-choose-subtitle">From a category</h3>
        <div className="ww-category-grid">
          {categories.map((c) => (
            <button
              key={c.label}
              className={`ww-category-btn ${selectedCategory === c.label ? "selected" : ""}`}
              onClick={() => {
                setSelectedCategory(c.label);
                setSelectedItem(null);
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {tripPlanItems.length > 0 && (
          <>
            <h3 className="ww-choose-subtitle">From a trip plan</h3>
            <div className="ww-trip-item-list">
              {tripPlanItems.map((item) => (
                <button
                  key={item.id}
                  className={`ww-trip-item-btn ${selectedItem === item.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedItem(item.id);
                    setSelectedCategory(null);
                  }}
                >
                  📍 {item.name}
                </button>
              ))}
            </div>
          </>
        )}

        <input
          className="ww-description-input"
          placeholder="Write description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button className="ww-save-expense-btn" onClick={handleSave}>
          Save
        </button>
      </main>
    </div>
  );
}