// Lahat ng OpenStreetMap-related na tawag: geocoding (Nominatim),
// routing (OSRM), at directions link (openstreetmap.org).

import AsyncStorage from '@react-native-async-storage/async-storage';
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
    } catch {
      // Hindi maabot ang backend: diretso na sa Nominatim sa mga susunod.
      backendGeocodeAvailable = false;
    }
  }

  try {
    result = await geocodeViaNominatim(query);
  } catch {
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

// Naka-save din sa phone ang mga route na nakuha na (ilang oras), kaya
// pagbalik sa trip o pagbukas ulit ng directions, hindi na naglo-load ulit.
const ROUTE_STORE_KEY = 'ww_routes_v1';
const ROUTE_STORE_MS = 6 * 60 * 60 * 1000;
let routeStoreLoaded = null;
function loadRouteStore() {
  if (!routeStoreLoaded) {
    routeStoreLoaded = AsyncStorage.getItem(ROUTE_STORE_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : {};
        Object.entries(saved).forEach(([k, v]) => {
          if (v && Date.now() - v.at < ROUTE_STORE_MS && !routeCache[k]) routeCache[k] = v;
        });
      })
      .catch(() => {});
  }
  return routeStoreLoaded;
}
function saveRouteStore() {
  const fresh = Object.entries(routeCache)
    .filter(([, v]) => v && v.at && Date.now() - v.at < ROUTE_STORE_MS)
    .slice(-200);
  AsyncStorage.setItem(ROUTE_STORE_KEY, JSON.stringify(Object.fromEntries(fresh))).catch(() => {});
}

// Ibinabalik: { durationMin, distanceKm, estimated }
// estimated = true kapag hindi naabot ang OSRM at tuwid na layo lang ang ginamit.
export async function getRoute(from, to, mode = 'walking') {
  const a = { latitude: Number(from.latitude), longitude: Number(from.longitude) };
  const b = { latitude: Number(to.latitude), longitude: Number(to.longitude) };
  // ~100 m sa pinanggalingan (GPS na gumagalaw nang kaunti), eksakto sa lugar.
  const key = `${mode}:${a.latitude.toFixed(3)},${a.longitude.toFixed(3)};${b.latitude.toFixed(5)},${b.longitude.toFixed(5)}`;
  await loadRouteStore();
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
        at: Date.now(),
      };
      routeCache[key] = result;
      saveRouteStore();
      return result;
    }
  } catch {
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

// Daan sa mapa (sunod-sunod na lugar): mga point ng totoong kalsada mula sa
// OSRM. Kapag hindi naabot, tuwid na linya sa pagitan ng mga lugar.
export async function getRoutePath(points, mode = 'driving') {
  const pts = (points || []).filter(hasCoords).map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }));
  if (pts.length < 2) return pts;
  const profile = mode === 'walking' ? 'routed-foot' : 'routed-car';
  const url = `${OSRM_URL}/${profile}/route/v1/driving/${pts.map((p) => `${p.longitude},${p.latitude}`).join(';')}?overview=full&geometries=geojson`;
  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, 10000);
    const data = await res.json();
    const line = data?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(line) && line.length > 1) return line.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
  } catch {
    // tuwid na linya na lang
  }
  return pts;
}

// Parehong mapa sa ibang tab (OpenStreetMap / OSRM): ipinapakita ang daan
// na dumadaan sa lahat ng point, gaya ng nasa app.
export function osmRouteUrl(points) {
  const pts = (points || []).filter(hasCoords);
  if (pts.length === 1) return `https://www.openstreetmap.org/?mlat=${pts[0].latitude}&mlon=${pts[0].longitude}#map=16/${pts[0].latitude}/${pts[0].longitude}`;
  return `https://map.project-osrm.org/?${pts.map((p) => `loc=${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}`).join('&')}&srv=0`;
}

// Lahat ng lugar bilang pin (may pangalan) sa OpenStreetMap map, sa ibang tab.
export function osmPointsUrl(points) {
  const features = (points || []).filter(hasCoords).map((p) => ({
    type: 'Feature',
    properties: { name: p.label || p.name || '' },
    geometry: { type: 'Point', coordinates: [Number(Number(p.longitude).toFixed(6)), Number(Number(p.latitude).toFixed(6))] },
  }));
  return `https://geojson.io/#data=data:application/json,${encodeURIComponent(JSON.stringify({ type: 'FeatureCollection', features }))}`;
}

// Google Maps (kilala ang mas maraming lugar kaysa OpenStreetMap). Walang
// "origin" = magsisimula sa kasalukuyang lokasyon ng phone.
export function googleDirectionsUrl(to, destination, mode = 'driving') {
  const dest = hasCoords(to) ? `${to.latitude},${to.longitude}` : [to.name, destination].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=${mode === 'walking' ? 'walking' : 'driving'}`;
}

export function googleSearchUrl(name, destination) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, destination].filter(Boolean).join(', '))}`;
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
      } catch {
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
