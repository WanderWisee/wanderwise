import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { usePreferences } from "../context/PreferencesContext";

// One date field for a whole trip, like Airbnb/Agoda: open the calendar,
// tap the start date, then tap the end date. Days in between light up.
//
//   <DateRangePicker
//     startDate="2026-10-03" endDate="2026-10-05"
//     onChange={({ startDate, endDate }) => ...}
//   />
//
// Dates go in and out as "YYYY-MM-DD", the same as <input type="date">.
// minDate defaults to today (no past trips); pass minDate={null} to allow
// any date (e.g. editing a trip that already started).

function parseIso(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayIso() {
  return toIso(new Date());
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

// The days of one month laid out in weeks (Sunday first), with blanks
// before the 1st so it lines up under the right weekday.
function monthGrid(monthStart) {
  const cells = [];
  for (let i = 0; i < monthStart.getDay(); i++) cells.push(null);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toIso(new Date(monthStart.getFullYear(), monthStart.getMonth(), d)));
  }
  return cells;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const POPOVER_WIDTH = 300;

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate = todayIso(),
  className = "",
}) {
  const { t, language } = useLanguage();
  const { formatDateRange } = usePreferences();
  const locale = language === "fil" ? "fil-PH" : "en-US";

  const [open, setOpen] = useState(false);
  const [hoverIso, setHoverIso] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = parseIso(startDate) || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const wrapperRef = useRef(null);
  const fieldRef = useRef(null);
  const popoverRef = useRef(null);
  // Where the calendar sits on screen. It's "fixed", so it never gets cut
  // off by a modal or pushes the page sideways; it stays inside the
  // window and opens upward when there's no room below.
  const [position, setPosition] = useState(null);

  const placePopover = () => {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const margin = 12;
    const height = popoverRef.current?.offsetHeight || 380;
    const left = Math.min(Math.max(rect.left, margin), window.innerWidth - POPOVER_WIDTH - margin);
    const fitsBelow = rect.bottom + 6 + height <= window.innerHeight - margin;
    const top = fitsBelow ? rect.bottom + 6 : Math.max(margin, rect.top - 6 - height);
    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    placePopover();
    window.addEventListener("resize", placePopover);
    window.addEventListener("scroll", placePopover, true);
    return () => {
      window.removeEventListener("resize", placePopover);
      window.removeEventListener("scroll", placePopover, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, viewMonth]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openCalendar = () => {
    const base = parseIso(startDate) || parseIso(minDate) || new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  // Picking: no start yet (or a full range already) → this is the new
  // start. Start but no end → this is the end, unless it's before the
  // start, in which case it becomes the new start.
  const pick = (iso) => {
    if (!startDate || endDate) {
      onChange({ startDate: iso, endDate: "" });
      return;
    }
    if (iso < startDate) {
      onChange({ startDate: iso, endDate: "" });
      return;
    }
    onChange({ startDate, endDate: iso });
    setOpen(false);
    setHoverIso(null);
  };

  const clear = () => onChange({ startDate: "", endDate: "" });

  // While choosing the end date, preview the range up to the hovered day.
  const previewEnd = startDate && !endDate && hoverIso && hoverIso >= startDate ? hoverIso : endDate;
  const inRange = (iso) => startDate && previewEnd && iso > startDate && iso < previewEnd;

  const dayCount =
    startDate && endDate
      ? Math.round((parseIso(endDate) - parseIso(startDate)) / DAY_MS) + 1
      : 0;

  const label = startDate
    ? endDate
      ? `${formatDateRange(startDate, endDate)} · ${dayCount} ${t("daysSuffix")}`
      : `${formatDateRange(startDate, startDate)} – …`
    : t("selectDates");

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 1, 1 + i).toLocaleDateString(locale, { weekday: "narrow" })
  ); // Feb 1 2026 is a Sunday

  const canGoBack = !minDate || addMonths(viewMonth, -1) >= new Date(parseIso(minDate).getFullYear(), parseIso(minDate).getMonth(), 1);

  const renderMonth = (monthStart) => (
    <div className="ww-drp-month" key={toIso(monthStart)}>
      <div className="ww-drp-header">
        <button
          type="button"
          className="ww-drp-arrow"
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="ww-drp-month-title">
          {monthStart.toLocaleDateString(locale, { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          className="ww-drp-arrow"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="ww-drp-grid">
        {weekdays.map((w, i) => (
          <span key={`w${i}`} className="ww-drp-weekday">{w}</span>
        ))}
        {monthGrid(monthStart).map((iso, i) => {
          if (!iso) return <span key={`b${i}`} />;
          const disabled = minDate && iso < minDate;
          const isStart = iso === startDate;
          const isEnd = iso === previewEnd;
          const classes = [
            "ww-drp-day",
            disabled && "disabled",
            (isStart || isEnd) && "selected",
            inRange(iso) && "in-range",
            iso === todayIso() && "today",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              type="button"
              key={iso}
              className={classes}
              disabled={disabled}
              onClick={() => pick(iso)}
              onMouseEnter={() => setHoverIso(iso)}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`ww-drp ${className}`} ref={wrapperRef}>
      <button
        type="button"
        ref={fieldRef}
        className={`ww-drp-field ${startDate ? "" : "placeholder"}`}
        onClick={() => (open ? setOpen(false) : openCalendar())}
      >
        📅 {label}
      </button>

      {open && (
        <div
          className="ww-drp-popover"
          ref={popoverRef}
          style={{
            width: POPOVER_WIDTH,
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
          }}
          onMouseLeave={() => setHoverIso(null)}
        >
          <p className="ww-drp-hint">
            {!startDate || endDate ? t("pickStartDate") : t("pickEndDate")}
          </p>
          {renderMonth(viewMonth)}
          <div className="ww-drp-footer">
            <span>{dayCount > 0 ? `${dayCount} ${t("daysSuffix")}` : ""}</span>
            <button type="button" className="ww-drp-clear" onClick={clear}>
              {t("clearDates")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}