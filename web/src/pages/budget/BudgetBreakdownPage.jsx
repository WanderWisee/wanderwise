import React from "react";
import "../../App.css";

const categoryData = [
  { label: "Foods and Drinks", value: 2.6 },
  { label: "Shopping", value: 3.2 },
  { label: "Gas", value: 3.9 },
  { label: "Transit", value: 4.1 },
  { label: "Car Rental", value: 3.6 },
  { label: "Flights", value: 1.9 },
];

const dayData = [
  { label: "4/17", value: 2.7 },
  { label: "4/18", value: 3.1 },
  { label: "4/19", value: 3.6 },
  { label: "4/20", value: 3.8 },
  { label: "4/21", value: 3.2 },
  { label: "4/22", value: 1.7 },
];

function BarChart({ title, data }) {
  const max = 4.5;
  return (
    <div className="ww-chart-card">
      <h2 className="ww-chart-title">{title}</h2>
      <div className="ww-chart-axis">
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n}>₱{n}.00</span>
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
          <span className="ww-menu-dropdown">Menu</span>
        </nav>
        <div className="ww-nav-icons">
          <span>🔍</span>
          <span>🔔</span>
          <span>👤</span>
        </div>
      </header>

      <main className="ww-breakdown-main">
        <h1 className="ww-breakdown-title">Breakdown</h1>
        <BarChart title="Category" data={categoryData} />
        <BarChart title="Day-by-day" data={dayData} />
      </main>
    </div>
  );
}