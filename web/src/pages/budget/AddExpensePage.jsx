import React, { useState } from "react";
import "../../App.css";

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

const tripPlanItems = [
  { icon: "🍽️", label: "Flotsam and Jetsam" },
  { icon: "🎟️", label: "San Juan" },
  { icon: "☕", label: "El Union Cafe" },
];

export default function AddExpensePage() {
  const [amount, setAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [description, setDescription] = useState("");

  const handleSave = () => {
    // TEMPORARY: no backend call yet — just log for now.
    console.log({ amount, selectedCategory, selectedItem, description });
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
              onClick={() => setSelectedCategory(c.label)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <h3 className="ww-choose-subtitle">From a trip plan</h3>
        <div className="ww-trip-item-list">
          {tripPlanItems.map((item) => (
            <button
              key={item.label}
              className={`ww-trip-item-btn ${selectedItem === item.label ? "selected" : ""}`}
              onClick={() => setSelectedItem(item.label)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

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