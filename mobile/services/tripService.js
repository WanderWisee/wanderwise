import { api } from './api';

// Lahat ng tawag tungkol sa trips — parehong endpoints ng web
// (TripsController, ExpensesController, BookingsController).
// Wala nang mock fallback: kapag patay ang backend, makikita ng user ang
// totoong error sa halip na magkunwaring gumagana ang app.

// ===== Destinations (autocomplete) =====

export async function fetchDestinations() {
  try {
    const data = await api.get('/destinations', { auth: false });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function ensureDestination(name) {
  try {
    await api.post('/destinations/ensure', { name });
  } catch {
    // Hindi kritikal — huwag i-block ang user kahit mabigo ito
  }
}

// ===== Trips =====

export async function fetchTrips() {
  const data = await api.get('/trips');
  return Array.isArray(data) ? data : [];
}

export function fetchTripById(tripId) {
  return api.get(`/trips/${tripId}`);
}

export function createTrip(body) {
  return api.post('/trips', body);
}

// Buong pag-save ng trip (title, dates, sections/places lahat sabay)
export function saveTrip(tripId, body) {
  return api.put(`/trips/${tripId}`, body);
}

export function deleteTrip(tripId) {
  return api.del(`/trips/${tripId}`);
}

export function leaveTrip(tripId) {
  return api.post(`/trips/${tripId}/leave`);
}

export async function markTripViewed(tripId) {
  try {
    await api.post(`/trips/${tripId}/view`);
  } catch {
    // fire-and-forget
  }
}

// ===== Crew / sharing =====

export async function fetchCrew(tripId) {
  const data = await api.get(`/trips/${tripId}/crew`);
  return Array.isArray(data) ? data : [];
}

export function addCrewMember(tripId, userId) {
  return api.post(`/trips/${tripId}/crew`, { userId });
}

export function removeCrewMember(tripId, memberId) {
  return api.del(`/trips/${tripId}/crew/${memberId}`);
}

export async function getShareToken(tripId) {
  const data = await api.post(`/trips/${tripId}/share-link`);
  return data && data.shareToken;
}

export function joinTripByToken(shareToken) {
  return api.post(`/trips/join/${encodeURIComponent(shareToken)}`);
}

export function fetchSharedTrip(shareToken) {
  return api.get(`/trips/shared/${encodeURIComponent(shareToken)}`, { auth: false });
}

// ===== Expenses =====
// Kasama sa GET ang mga per-place cost (may placeId) at ang hiwalay na
// "Add Expense" entries (placeId = null).

export async function fetchExpenses(tripId) {
  const data = await api.get(`/trips/${tripId}/expenses`);
  return Array.isArray(data) ? data : [];
}

export function createExpense(tripId, { placeId = null, category, amount, description, expenseDate = null }) {
  return api.post(`/trips/${tripId}/expenses`, {
    placeId,
    category,
    amount,
    description: description || null,
    expenseDate,
  });
}

export function deleteExpense(tripId, expenseId) {
  return api.del(`/trips/${tripId}/expenses/${expenseId}`);
}

// ===== Bookings (hotel na na-book sa Agoda/Klook/etc.) =====

export async function fetchTripBookings(tripId) {
  const data = await api.get(`/trips/${tripId}/bookings`);
  return Array.isArray(data) ? data : [];
}

export async function fetchMyBookings() {
  const data = await api.get('/bookings/mine');
  return Array.isArray(data) ? data : [];
}

export function createBooking(tripId, { placeName, bookingSite, confirmationNumber, checkIn, checkOut }) {
  return api.post(`/trips/${tripId}/bookings`, {
    placeName,
    bookingSite: bookingSite || null,
    confirmationNumber: confirmationNumber || null,
    checkIn,
    checkOut: checkOut || null,
  });
}

export function deleteBooking(tripId, bookingId) {
  return api.del(`/trips/${tripId}/bookings/${bookingId}`);
}
