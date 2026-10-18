import { api } from './api';
import {
  getCached, setCached, getPendingSave, setPendingSave, removePendingSave,
  listPendingTripIds, isTripOpen, isOfflineError, setOffline,
} from './offlineStore';

// Offline mode: GETs keep a copy on the phone; when there's no connection
// the saved copy is returned instead of an error.
async function withCache(name, load) {
  try {
    const data = await load();
    void setCached(name, data);
    setOffline(false);
    return data;
  } catch (error) {
    if (isOfflineError(error)) {
      setOffline(true);
      const cached = await getCached(name);
      if (cached != null) return cached;
    }
    throw error;
  }
}

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

export function fetchTrips() {
  return withCache('trips', async () => {
    const data = await api.get('/trips');
    return Array.isArray(data) ? data : [];
  });
}

export function fetchTripById(tripId) {
  return withCache(`trip:${tripId}`, () => api.get(`/trips/${tripId}`));
}

export function createTrip(body) {
  return api.post('/trips', body);
}

// Buong pag-save ng trip (title, dates, sections/places lahat sabay)
export function saveTrip(tripId, body) {
  return api.put(`/trips/${tripId}`, body);
}

// Offline-aware save. baseVersion = the trip version this edit started from
// (the server answers 409 "trip_changed" if a crewmate saved in between).
// No connection → the edit goes to the outbox and { queued: true } is returned.
export async function saveTripOrQueue(tripId, body, baseVersion) {
  try {
    const data = await api.put(`/trips/${tripId}`, { ...body, baseVersion: baseVersion || null });
    await removePendingSave(tripId);
    if (data) void setCached(`trip:${tripId}`, data);
    setOffline(false);
    return { queued: false, data };
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    setOffline(true);
    await setPendingSave(tripId, { body, baseVersion: baseVersion || null });
    return { queued: true, data: null };
  }
}

// Background sync of the outbox (AppContext runs this every 30 s and when
// the app comes back to the front). Trips open on screen sync themselves.
let flushing = null;

export function flushPendingSaves() {
  if (flushing) return flushing;
  flushing = (async () => {
    const ids = await listPendingTripIds();
    for (const tripId of ids) {
      if (isTripOpen(tripId)) continue;
      const entry = await getPendingSave(tripId);
      if (!entry || entry.conflict) continue;
      try {
        const data = await api.put(`/trips/${tripId}`, { ...entry.body, baseVersion: entry.baseVersion || null });
        await removePendingSave(tripId);
        if (data) void setCached(`trip:${tripId}`, data);
        setOffline(false);
      } catch (error) {
        if (isOfflineError(error)) { setOffline(true); break; }
        if (error.status === 401) break;
        if (error.status === 409) {
          // A crewmate changed the trip: keep the edit; the trip screen asks
          // "keep mine / load latest" the next time it is opened.
          await setPendingSave(tripId, { ...entry, conflict: true });
          continue;
        }
        // 400/403/404: the edit can't be applied anymore (trip deleted,
        // edit access removed, invalid data) — drop it.
        await removePendingSave(tripId);
      }
    }
  })().finally(() => { flushing = null; });
  return flushing;
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

export function fetchCrew(tripId) {
  return withCache(`crew:${tripId}`, async () => {
    const data = await api.get(`/trips/${tripId}/crew`);
    return Array.isArray(data) ? data : [];
  });
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

export function fetchExpenses(tripId) {
  return withCache(`expenses:${tripId}`, async () => {
    const data = await api.get(`/trips/${tripId}/expenses`);
    return Array.isArray(data) ? data : [];
  });
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

export function fetchTripBookings(tripId) {
  return withCache(`bookings:${tripId}`, async () => {
    const data = await api.get(`/trips/${tripId}/bookings`);
    return Array.isArray(data) ? data : [];
  });
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

export const updateCrewPermission = (tripId, memberId, canEdit) =>
  api.put(`/trips/${tripId}/crew/${memberId}/permission`, { canEdit });

export async function fetchSuggestedPlaces(destination, category = '') {
  const data = await api.get(`/places?destination=${encodeURIComponent(destination)}&category=${encodeURIComponent(category)}`, { auth: false, timeout: 60000 });
  return Array.isArray(data?.places) ? data.places : [];
}
