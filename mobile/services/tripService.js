import { getToken } from './authService';

const BASE_URL = 'http://192.168.1.151:3001/api'; // TODO: palitan ng totoong IP

async function authHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

function isNetworkError(err) {
  const msg = (err.message || '').toLowerCase();
  return (
    err instanceof TypeError ||
    msg.includes('network') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('could not connect')
  );
}

// ===== Mock fallback (dev/testing lang, walang backend) =====
let mockTrips = [];
let mockIdCounter = 1;

function mockCreateTrip(body) {
  const trip = {
    id: mockIdCounter++,
    title: body.title,
    destination: body.destination,
    startDate: body.startDate,
    endDate: body.endDate,
    travelBuddiesCount: body.travelBuddiesCount,
    budgetTotal: body.budgetTotal || 0,
    sections: body.sections && body.sections.length > 0 ? body.sections : [
      { isDefault: true, name: body.title, sortOrder: 0, places: [] },
    ],
  };
  mockTrips.push(trip);
  console.warn('[tripService] Walang backend na maabot — gumagamit ng mock data.');
  return { tripId: trip.id };
}

// ===== Destinations (autocomplete) =====

export async function fetchDestinations() {
  try {
    const res = await fetch(`${BASE_URL}/destinations`);
    return await handleResponse(res);
  } catch (err) {
    return [];
  }
}

export async function ensureDestination(name) {
  try {
    await fetch(`${BASE_URL}/destinations/ensure`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ name }),
    });
  } catch (err) {
    // Hindi kritikal — huwag i-block ang user kahit mabigo ito
  }
}

// ===== Trips =====

// Listahan ng lahat ng trips ng user — ginagamit sa Home tab
export async function fetchTrips() {
  try {
    const res = await fetch(`${BASE_URL}/trips`, { headers: await authHeaders() });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) return mockTrips;
    throw err;
  }
}

// Buong laman ng isang trip (kasama ang sections/places) — ginagamit sa Trip Detail
export async function fetchTripById(tripId) {
  try {
    const res = await fetch(`${BASE_URL}/trips/${tripId}`, { headers: await authHeaders() });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) {
      const found = mockTrips.find((t) => t.id === Number(tripId) || t.id === tripId);
      if (found) return found;
      throw new Error('Trip not found (mock).');
    }
    throw err;
  }
}

// Gumagawa ng bagong trip — POST /api/trips
export async function createTrip(body) {
  try {
    const res = await fetch(`${BASE_URL}/trips`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) return mockCreateTrip(body);
    throw err;
  }
}

// Buong pag-save ng trip (title, dates, sections/places lahat sabay) — PUT /api/trips/:id
export async function saveTrip(tripId, body) {
  try {
    const res = await fetch(`${BASE_URL}/trips/${tripId}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) {
      const index = mockTrips.findIndex((t) => t.id === Number(tripId) || t.id === tripId);
      if (index === -1) throw new Error('Trip not found (mock).');
      mockTrips[index] = { ...mockTrips[index], ...body };
      return mockTrips[index];
    }
    throw err;
  }
}

export async function deleteTrip(tripId) {
  try {
    const res = await fetch(`${BASE_URL}/trips/${tripId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) {
      mockTrips = mockTrips.filter((t) => t.id !== Number(tripId) && t.id !== tripId);
      return { success: true };
    }
    throw err;
  }
}

export async function markTripViewed(tripId) {
  try {
    await fetch(`${BASE_URL}/trips/${tripId}/view`, {
      method: 'POST',
      headers: await authHeaders(),
    });
  } catch (err) {
    // fire-and-forget, hindi kritikal
  }
}

// ===== Expenses (hiwalay na "Add Expense" entries, hindi per-place cost) =====

export async function fetchExpenses(tripId) {
  try {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/expenses`, { headers: await authHeaders() });
    return await handleResponse(res);
  } catch (err) {
    return [];
  }
}

export async function createExpense(tripId, { placeId = null, category, amount, description }) {
  try {
    const res = await fetch(`${BASE_URL}/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ placeId, category, amount, description: description || null }),
    });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) {
      return { id: Date.now(), placeId, category, amount, description };
    }
    throw err;
  }
}