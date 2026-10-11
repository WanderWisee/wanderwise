// CalendarPicker ay gumagamit ng { year, month (0-11), day }.
// Ang backend ay "YYYY-MM-DD".

export function partsToISO(d) {
  if (!d) return null;
  const mm = String(d.month + 1).padStart(2, '0');
  const dd = String(d.day).padStart(2, '0');
  return `${d.year}-${mm}-${dd}`;
}

export function isoToParts(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function rangeFromISO(startDate, endDate) {
  const start = isoToParts(startDate);
  const end = isoToParts(endDate);
  return start && end ? { start, end } : null;
}

export function todayISO() {
  const d = new Date();
  return partsToISO({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
}

export function addDaysISO(iso, days) {
  const p = isoToParts(iso);
  if (!p) return null;
  const d = new Date(p.year, p.month, p.day + days);
  return partsToISO({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
}

export function nightsBetween(startISO, endISO) {
  const a = isoToParts(startISO);
  const b = isoToParts(endISO);
  if (!a || !b) return 0;
  const ms = new Date(b.year, b.month, b.day) - new Date(a.year, a.month, a.day);
  return Math.max(0, Math.round(ms / 86400000));
}

export function formatPeso(amount) {
  const n = Number(amount) || 0;
  const fixed = Math.abs(n) >= 1000 || Number.isInteger(n) ? Math.round(n).toString() : n.toFixed(2);
  const [whole, dec] = fixed.split('.');
  return `₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${dec ? `.${dec}` : ''}`;
}
