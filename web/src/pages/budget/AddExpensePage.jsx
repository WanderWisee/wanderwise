import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import { useLanguage } from "../../context/LanguageContext";
import "../../App.css";
import Icon from "../../components/Icon";

let nextExpenseId = 1;

// ISO date (yyyy-mm-dd) of trip day number `index` (0 = first day).
function dayIso(startDate, index) {
  if (!startDate) return null;
  const d = new Date(String(startDate).slice(0, 10) + "T00:00:00");
  if (isNaN(d)) return null;
  d.setDate(d.getDate() + index);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Same money rules as the trip page (2 decimals, at most ₱1,000,000.00).
const MAX_MONEY = 1000000;
function keepMoney(value) {
  let v = String(value ?? "").replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return v.slice(0, 10);
}

export default function AddExpensePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const categories = [
    { icon: "utensils", label: "Food and Drinks", key: "catFood" },
    { icon: "bus", label: "Transit", key: "catTransit" },
    { icon: "ticket", label: "Activities", key: "catActivities" },
    { icon: "shopping-bag", label: "Shopping", key: "catShopping" },
    { icon: "car", label: "Car Rental", key: "catCarRental" },
    { icon: "bed", label: "Lodging", key: "catLodging" },
    { icon: "fuel", label: "Gas", key: "catGas" },
    { icon: "plane", label: "Flights", key: "catFlights" },
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

  const [amount, setAmount] = useState("");
  // Category and place are separate fields now: the category is required,
  // the place (from the trip plan) and the day are optional.
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(""); // tripPlanItems id ("" = none)
  const [selectedDay, setSelectedDay] = useState(""); // day index as string ("" = none)
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const days = tripState.days || [];

  // Picking a place also picks the day it is on in the itinerary.
  const pickPlace = (id) => {
    setSelectedItem(id);
    const index = days.findIndex((d) => (d.placeIds || []).map(String).includes(String(id)));
    if (index !== -1) setSelectedDay(String(index));
  };

  // Back to the trip builder without saving — passes the same tripState
  // back (same as the Breakdown page) so nothing on the trip is lost.
  // replace: true so the browser Back button doesn't come back here.
  const handleBack = () => {
    navigate(returnPath, {
      replace: true,
      state: {
        destination,
        startDate,
        endDate,
        people,
        restoredTripState: tripState,
      },
    });
  };

  const handleSave = async () => {
    if (saving) return;
    // Clear messages under the form that say how to fix the entry.
    const numericAmount = Math.round((Number(amount) || 0) * 100) / 100;
    if (numericAmount <= 0) return setError(t("expenseNeedAmount"));
    if (numericAmount > MAX_MONEY) return setError(t("moneyTooHigh"));
    if (!selectedCategory) return setError(t("expenseNeedCategory"));
    setError("");
    setSaving(true);

    // Both "From a category" and "From a trip plan" are real expenses and
    // go to the Expenses list. (The "$ Add Cost" button on a place is
    // different — that's only an estimated cost.) A place expense is saved
    // with the place NAME as its category and no placeId, because place ids
    // change every time the trip is saved.
    const pickedPlace = selectedItem ? tripPlanItems.find((item) => String(item.id) === String(selectedItem)) : null;
    const categoryToSave = selectedCategory;
    // The place goes in front of the description ("Place · note").
    const descriptionToSave = [pickedPlace?.name?.trim(), description.trim()].filter(Boolean).join(" · ").slice(0, 255);
    const dayIndex = selectedDay === "" ? -1 : Number(selectedDay);
    const expenseDate = dayIndex >= 0 ? dayIso(startDate, dayIndex) : null;

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
            description: descriptionToSave || null,
            expenseDate,
          }),
        });
        if (resp.ok) {
          savedExpense = await resp.json();
        } else {
          // Show the server's reason (e.g. "Amount must be more than 0") and stay on the page.
          const body = await resp.json().catch(() => ({}));
          setSaving(false);
          return setError(`${t("saveFailed")}: ${body.error || resp.status}. ${t("checkInternetTryAgain")}`);
        }
      } catch (err) {
        setSaving(false);
        return setError(`${t("saveFailed")}. ${t("checkInternetTryAgain")}`);
      }
    }

    const newExpense = {
      id: savedExpense?.id ?? nextExpenseId++,
      amount: numericAmount,
      label: categoryToSave,
      icon: categories.find((c) => c.label === selectedCategory)?.icon,
      description: descriptionToSave,
      dayLabel: dayIndex >= 0 && days[dayIndex] ? days[dayIndex].label : null,
      category: categoryToSave,
      expenseDate,
    };

    const updatedTripState = {
      ...tripState,
      expenses: [...(tripState.expenses || []), newExpense],
    };

    navigate(returnPath, {
      replace: true,
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

      <main className="ww-add-expense-main">
        {/* Click the title to go back (same as the Breakdown page) */}
        <h1
          className="ww-add-expense-title"
          onClick={handleBack}
          title={t("back")}
          style={{ cursor: "pointer" }}
        >
          <Icon name="arrow-left" /> {t("addExpenseTitle")}
        </h1>

        <div className="ww-amount-input">
          <span className="ww-amount-caret"><Icon name="chevron-down" /></span>
          <span className="ww-amount-peso">₱</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => { setAmount(keepMoney(e.target.value)); setError(""); }}
            onBlur={() => amount !== "" && setAmount((Number(amount) || 0).toFixed(2))}
          />
        </div>

        <h3 className="ww-choose-subtitle">{t("expenseCategoryLabel")}</h3>
        <div className="ww-category-grid">
          {categories.map((c) => (
            <button
              key={c.label}
              className={`ww-category-btn ${selectedCategory === c.label ? "selected" : ""}`}
              onClick={() => {
                setSelectedCategory(c.label);
                setError("");
              }}
            >
              <Icon name={c.icon} /> {t(c.key)}
            </button>
          ))}
        </div>

        <div className="ww-expense-fields">
          {tripPlanItems.length > 0 && (
            <label className="ww-expense-field">
              <span>{t("expensePlaceLabel")}</span>
              <select value={selectedItem} onChange={(e) => pickPlace(e.target.value)}>
                <option value="">{t("noPlace")}</option>
                {tripPlanItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          )}
          {days.length > 0 && (
            <label className="ww-expense-field">
              <span>{t("expenseDayLabel")}</span>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                <option value="">{t("noDay")}</option>
                {days.map((d, i) => (
                  <option key={i} value={String(i)}>{t("dayN").replace("{n}", String(i + 1))} · {d.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <input
          className="ww-description-input"
          placeholder={t("writeDescription")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="ww-money-error" role="alert">{error}</p>}

        <button className="ww-save-expense-btn" onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </button>
      </main>
    </div>
  );
}