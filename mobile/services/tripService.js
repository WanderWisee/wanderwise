import { getToken } from './authService';

const BASE_URL = 'http://localhost:3001/api';

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

export async function fetchTrips() {
  const res = await fetch(`${BASE_URL}/trips`, {
    headers: await authHeaders(),
  });
  return handleResponse(res);
}

export async function createTrip(tripData) {
  const res = await fetch(`${BASE_URL}/trips`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(tripData),
  });
  return handleResponse(res);
}

export async function updateTrip(tripId, updates) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteTrip(tripId) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return handleResponse(res);
}