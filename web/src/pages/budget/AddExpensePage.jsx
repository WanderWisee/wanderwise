import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";

let nextExpenseId = 1;

export default function AddExpensePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const categories = [
    { icon: "🍽️", label: "Food and Drinks", key: "catFood" },
    { icon: "🚌", label: "Transit", key: "catTransit" },
    { icon: "🎟️", label: "Activities", key: "catActivities" },
    { icon: "🛍️", label: "Shopping", key: "catShopping" },
    { icon: "🚗", label: "Car Rental", key: "catCarRental" },
    { icon: "🛏️", label: "Lodging", key: "catLodging" },
    { icon: "⛽", label: "Gas", key: "catGas" },
    { icon: "✈️", label: "Flights", key: "catFlights" },
  ];

  // Data handed off by TripPlanBuilderPage's "+ Add Expense" button.
  const {
    destination = "",
    startDate = "",
    endDate = "",
    people = 0,
    tripState = { places: [], customSections: [], days: [], budgetTotal: 0, expenses: [] },
    returnPath = "/trip-plan",
    tripPlanItems = [], // [{ id, name }] — built from "Where to go?" + custom lists
    tripId = null,
  } = location.state || {};

  const [amount, setAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // holds the tripPlanItems id
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // The day a place is on in the itinerary (for the day-by-day breakdown).
  const dayLabelForPlace = (placeId) => {
    const day = (tripState.days || []).find((d) => (d.placeIds || []).includes(placeId));
    return day ? day.label : null;
  };

  const handleSave = async () => {
    // Require at least one choice (category or trip-plan item) before saving.
    if (!selectedCategory && !selectedItem) return;
    if (saving) return;

    const numericAmount = Number(amount) || 0;
    setSaving(true);

    // Both "From a category" and "From a trip plan" are real expenses and
    // go to the Expenses list. (The "$ Add Cost" button on a place is
    // different — that's only an estimated cost.) A place expense is saved
    // with the place NAME as its category and no placeId, because place ids
    // change every time the trip is saved.
    const pickedPlace = selectedItem ? tripPlanItems.find((item) => item.id === selectedItem) : null;
    // (Trimmed to 50 characters so it fits the category column.)
    const categoryToSave = pickedPlace ? pickedPlace.name.trim().slice(0, 50) : selectedCategory;

    let savedExpense = null;
    const token = localStorage.getItem("wanderwise_token");
    if (tripId && token) {
      try {
        const resp = await fetch(`/api/trips/${tripId}/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            placeId: null,
            category: categoryToSave,
            amount: numericAmount,
            description: description.trim() || null,
          }),
        });
        if (resp.ok) {
          savedExpense = await resp.json();
        } else {
          console.warn("Failed to save expense: server responded with", resp.status);
        }
      } catch (err) {
        console.warn("Failed to save expense:", err);
      }
    } else {
      console.warn("No tripId/token available — expense will not be saved to the server.");
    }

    const newExpense = {
      id: savedExpense?.id ?? nextExpenseId++,
      amount: numericAmount,
      label: categoryToSave,
      icon: pickedPlace ? "📍" : categories.find((c) => c.label === selectedCategory)?.icon,
      description: description.trim(),
      dayLabel: pickedPlace ? dayLabelForPlace(pickedPlace.id) : null,
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

      <main className="ww-add-expense-main">
        <h1 className="ww-add-expense-title">{t("addExpenseTitle")}</h1>

        <div className="ww-amount-input">
          <span className="ww-amount-caret">⌄</span>
          <span className="ww-amount-peso">₱</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <h2 className="ww-choose-item-title">{t("chooseAnItem")}</h2>

        <h3 className="ww-choose-subtitle">{t("fromACategory")}</h3>
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
              {c.icon} {t(c.key)}
            </button>
          ))}
        </div>

        {tripPlanItems.length > 0 && (
          <>
            <h3 className="ww-choose-subtitle">{t("fromATripPlan")}</h3>
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
          placeholder={t("writeDescription")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button className="ww-save-expense-btn" onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </button>
      </main>
    </div>
  );
}