// Lahat ng OpenStreetMap-related na tawag: geocoding (Nominatim),
// routing (OSRM), at directions link (openstreetmap.org).

import { API_URL as BASE_URL } from '../constants/config';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://routing.openstreetmap.de';
const USER_AGENT = 'WanderWise-Mobile/1.0 (capstone project)';

const geocodeCache = {};
const routeCache = {};
let backendGeocodeAvailable = true;
let lastNominatimCall = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function hasCoords(place) {
  return place && place.latitude != null && place.longitude != null;
}

// ===== Geocoding =====

async function geocodeViaBackend(query) {
  const res = await fetchWithTimeout(`${BASE_URL}/geocode?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Backend geocode failed');
  const data = await res.json();
  return data && data.found
    ? { latitude: Number(data.lat), longitude: Number(data.lon) }
    : null;
}

async function geocodeViaNominatim(query) {
  // Patakaran ng Nominatim: hindi hihigit sa 1 request kada segundo.
  const elapsed = Date.now() - lastNominatimCall;
  if (elapsed < 1100) await wait(1100 - elapsed);
  lastNominatimCall = Date.now();

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
  });
  const data = await res.json();
  return data && data[0]
    ? { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }
    : null;
}

async function geocodeOnce(query) {
  if (query in geocodeCache) return geocodeCache[query];

  let result = null;
  if (backendGeocodeAvailable) {
    try {
      result = await geocodeViaBackend(query);
      geocodeCache[query] = result;
      return result;
    } catch (err) {
      // Hindi maabot ang backend: diretso na sa Nominatim sa mga susunod.
      backendGeocodeAvailable = false;
    }
  }

  try {
    result = await geocodeViaNominatim(query);
  } catch (err) {
    result = null;
  }
  geocodeCache[query] = result;
  return result;
}

// Parehong paraan ng web: pinaka-specific na query muna. Hindi tayo
// bumabagsak sa coordinates ng buong destination, dahil magiging mali
// ang oras at layo kapag nasa gitna ng lungsod ang pin ng isang cafe.
export async function geocodePlace(name, destination) {
  const attempts = [];
  if (destination) {
    attempts.push(`${name}, ${destination}, Philippines`);
    attempts.push(`${name}, ${destination}`);
  }
  attempts.push(`${name}, Philippines`);

  for (const query of attempts) {
    const coords = await geocodeOnce(query);
    if (coords) return coords;
  }
  return null;
}

// ===== Routing =====

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Ibinabalik: { durationMin, distanceKm, estimated }
// estimated = true kapag hindi naabot ang OSRM at tuwid na layo lang ang ginamit.
export async function getRoute(from, to, mode = 'walking') {
  const a = { latitude: Number(from.latitude), longitude: Number(from.longitude) };
  const b = { latitude: Number(to.latitude), longitude: Number(to.longitude) };
  const key = `${mode}:${a.latitude},${a.longitude};${b.latitude},${b.longitude}`;
  if (routeCache[key]) return routeCache[key];

  const profile = mode === 'driving' ? 'routed-car' : 'routed-foot';
  const url =
    `${OSRM_URL}/${profile}/route/v1/driving/` +
    `${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=false`;

  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } });
    const data = await res.json();
    const route = data && data.routes && data.routes[0];
    if (route) {
      const result = {
        durationMin: Math.max(1, Math.round(route.duration / 60)),
        distanceKm: route.distance / 1000,
        estimated: false,
      };
      routeCache[key] = result;
      return result;
    }
  } catch (err) {
    // tuloy sa tantiya sa ibaba
  }

  const km = haversineKm(a, b);
  const speedKmh = mode === 'driving' ? 30 : 5;
  return {
    durationMin: Math.max(1, Math.round((km / speedKmh) * 60)),
    distanceKm: km,
    estimated: true,
  };
}

// ===== Directions link =====

export function directionsUrl(from, to, mode, destination) {
  const engine = mode === 'driving' ? 'fossgis_osrm_car' : 'fossgis_osrm_foot';
  if (hasCoords(from) && hasCoords(to)) {
    return (
      `https://www.openstreetmap.org/directions?engine=${engine}` +
      `&route=${from.latitude},${from.longitude};${to.latitude},${to.longitude}`
    );
  }
  const label = (p) => (destination ? `${p.name}, ${destination}` : p.name);
  return (
    `https://www.openstreetmap.org/directions?engine=${engine}` +
    `&from=${encodeURIComponent(label(from))}&to=${encodeURIComponent(label(to))}`
  );
}

// ===== Larawan ng destination (Wikipedia, sa pamamagitan ng backend) =====
// Parehong /api/destination-image na gamit ng Profile page ng web.

const imageCache = {};

export async function fetchDestinationImage(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  if (key in imageCache) return imageCache[key];
  imageCache[key] = (async () => {
    // Unahin ang buong pangalan, tapos ang unang bahagi ("El Nido, Palawan" -> "El Nido")
    const attempts = [name.trim()];
    const first = name.split(',')[0].trim();
    if (first && first !== attempts[0]) attempts.push(first);
    for (const q of attempts) {
      try {
        const res = await fetchWithTimeout(`${BASE_URL}/destination-image?name=${encodeURIComponent(q)}`, {}, 12000);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.found && data.url) return data.url;
      } catch (err) {
        // subukan ang susunod
      }
    }
    return null;
  })();
  return imageCache[key];
}

// Destination ng buong trip (hal. "Baguio City") -> coordinates.
export async function geocodeDestination(destination) {
  if (!destination) return null;
  return (await geocodeOnce(`${destination}, Philippines`)) || (await geocodeOnce(destination));
}
