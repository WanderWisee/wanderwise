// Small helpers shared by the Teacher portal, the student Classes pages
// and the Admin panel.

// fetch() with the login token + JSON. Never throws: returns
// { ok, status, data } so pages can show their own message.
export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("wanderwise_token");
  try {
    const resp = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await resp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: resp.ok, status: resp.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// The server sends UTC times without the "Z".
export function toLocalDate(value) {
  if (!value) return null;
  const s = String(value);
  const d = new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
  return isNaN(d) ? null : d;
}

export function fullName(p) {
  if (!p) return "";
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "";
}

export function initials(p) {
  const name = fullName(p);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
}

export function peso(n) {
  const v = Number(n || 0);
  return `₱${v.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

// "2026-10-30T09:00" (for <input type="datetime-local">) from a server time.
export function toDateTimeInput(value) {
  const d = toLocalDate(value);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The other way: local date-time input → UTC ISO for the server.
export function fromDateTimeInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d) ? null : d.toISOString();
}

// Where each role lands after logging in.
export function homeForRole(role) {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  return "/dashboard";
}
