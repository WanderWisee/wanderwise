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

// ===== Mock fallback, dev/testing purposes lang =====
// Kapag hindi maabot ang backend (walang koneksyon, o wala pang tumatakbong
// server), gagamit ito ng in-memory na "fake database" para gumana pa rin
// ang buong UI flow nang walang totoong backend. Awtomatiko itong titigil
// gamitin kapag gumana na ang totoong koneksyon.
let mockTrips = [];
let mockIdCounter = 1;

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

function mockCreateTrip(tripData) {
  const trip = {
    id: `mock_${mockIdCounter++}`,
    ...tripData,
    stops: [],
    expenses: [],
    createdAt: new Date().toISOString(),
  };
  mockTrips.push(trip);
  console.warn('[tripService] Walang backend na maabot — gumagamit ng mock data (hindi naka-save).');
  return trip;
}

// ===== Totoong API calls, may mock fallback =====

export async function fetchTrips() {
  try {
    const res = await fetch(`${BASE_URL}/trips`, { headers: await authHeaders() });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) return mockTrips;
    throw err;
  }
}

export async function createTrip(tripData) {
  try {
    const res = await fetch(`${BASE_URL}/trips`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(tripData),
    });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) return mockCreateTrip(tripData);
    throw err;
  }
}

export async function updateTrip(tripId, updates) {
  try {
    const res = await fetch(`${BASE_URL}/trips/${tripId}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(updates),
    });
    return await handleResponse(res);
  } catch (err) {
    if (isNetworkError(err)) {
      const index = mockTrips.findIndex((t) => t.id === tripId);
      if (index === -1) throw new Error('Trip not found (mock).');
      mockTrips[index] = { ...mockTrips[index], ...updates };
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
      mockTrips = mockTrips.filter((t) => t.id !== tripId);
      return { success: true };
    }
    throw err;
  }
}