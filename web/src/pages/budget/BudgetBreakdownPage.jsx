import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import "../../App.css";

function groupByLabel(expenses) {
  const totals = {};
  expenses.forEach((e) => {
    totals[e.label] = (totals[e.label] || 0) + e.amount;
  });
  return Object.entries(totals).map(([label, value]) => ({ label, value }));
}

function groupByDay(expenses, days) {
  const totals = {};
  expenses.forEach((e) => {
    if (!e.dayLabel) return; // category-only expenses aren't tied to a day
    totals[e.dayLabel] = (totals[e.dayLabel] || 0) + e.amount;
  });
  // Keep the order of the actual itinerary days, skip days with no expense.
  return days
    .map((d) => ({ label: d.label, value: totals[d.label] || 0 }))
    .filter((d) => d.value > 0);
}

function niceMax(values) {
  const highest = Math.max(1, ...values);
  // round up to the next nice step (multiples of 1, 2, 5, 10, ...)
  const magnitude = Math.pow(10, Math.floor(Math.log10(highest)));
  const steps = [1, 2, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= highest) return candidate;
  }
  return magnitude * 10;
}

function BarChart({ title, data }) {
  if (data.length === 0) {
    return (
      <div className="ww-chart-card">
        <h2 className="ww-chart-title">{title}</h2>
        <p className="ww-expense-empty">No expenses yet for this view.</p>
      </div>
    );
  }

  const max = niceMax(data.map((d) => d.value));
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (max / tickCount) * i);

  return (
    <div className="ww-chart-card">
      <h2 className="ww-chart-title">{title}</h2>
      <div className="ww-chart-axis">
        {ticks.map((n) => (
          <span key={n}>₱{n.toLocaleString()}</span>
        ))}
      </div>
      <div className="ww-chart-bars">
        {data.map((row) => (
          <div className="ww-chart-row" key={row.label}>
            <span className="ww-chart-label">{row.label}</span>
            <div className="ww-chart-track">
              <div
                className="ww-chart-bar"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BudgetBreakdownPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    expenses = [],
    days = [],
    returnPath = "/trip-plan",
    destination = "",
    startDate = "",
    endDate = "",
    people = 0,
    tripState = null,
  } = location.state || {};

  const categoryData = groupByLabel(expenses);
  const dayData = groupByDay(expenses, days);

  const handleBack = () => {
    // Go back to the trip builder without losing anything — pass the
    // same tripState straight back through restoredTripState.
    navigate(returnPath, {
      state: { destination, startDate, endDate, people, restoredTripState: tripState },
    });
  };

  return (
    <div className="ww-breakdown-page">
      <header className="ww-navbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <a href="/dashboard">Home</a>
          <a href="/travel-tips">Guides</a>
          <a href="/hotels">Hotels</a>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-breakdown-main">
        <h1 className="ww-breakdown-title" onClick={handleBack} style={{ cursor: "pointer" }}>
          ← Breakdown
        </h1>
        <BarChart title="Category" data={categoryData} />
        <BarChart title="Day-by-day" data={dayData} />
      </main>
    </div>
  );
}