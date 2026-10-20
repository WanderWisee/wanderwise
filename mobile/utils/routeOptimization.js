export function distanceKm(a, b) {
  const rad = (n) => n * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

// Preserve the first stop. The result is a candidate, verified with actual
// driving-route estimates before the UI offers to apply it.
export function nearestRoute(stops) {
  if (stops.length < 3) return stops.slice();
  const result = [stops[0]];
  const remaining = stops.slice(1);
  while (remaining.length) {
    let next = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (distanceKm(result[result.length - 1], remaining[i]) < distanceKm(result[result.length - 1], remaining[next])) next = i;
    }
    result.push(remaining.splice(next, 1)[0]);
  }
  return result;
}

// ===== Parehong Optimize route ng web =====
// Haba ng pagdaan sa `order` gamit ang matrix (segundo o metro). Ang walang
// daan (null) ay napakalaki para hindi mapili.
export function pathLength(order, matrix) {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    const d = matrix[order[i]][order[i + 1]];
    total += d == null ? 1e9 : d;
  }
  return total;
}

// Pinakamaikling one-way na daan na nagsisimula sa point 0. Kapag kaunti ang
// lugar, sinusubukan lahat ng ayos; kapag marami, nearest-neighbour + 2-opt.
export function bestOpenPath(matrix) {
  const n = matrix.length;
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1);
  if (n <= 8) {
    let best = null;
    let bestLen = Infinity;
    const permute = (arr, l) => {
      if (l === arr.length) {
        const order = [0, ...arr];
        const len = pathLength(order, matrix);
        if (len < bestLen) { bestLen = len; best = order; }
        return;
      }
      for (let i = l; i < arr.length; i++) {
        [arr[l], arr[i]] = [arr[i], arr[l]];
        permute(arr, l + 1);
        [arr[l], arr[i]] = [arr[i], arr[l]];
      }
    };
    permute(rest, 0);
    return best;
  }
  const order = [0];
  const left = new Set(rest);
  while (left.size > 0) {
    const last = order[order.length - 1];
    let next = null;
    let nextDist = Infinity;
    left.forEach((j) => {
      const d = matrix[last][j] == null ? 1e9 : matrix[last][j];
      if (d < nextDist) { nextDist = d; next = j; }
    });
    order.push(next);
    left.delete(next);
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        if (pathLength(candidate, matrix) < pathLength(order, matrix)) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return order;
}

// Oras (segundo) at layo (metro) sa pagitan ng lahat ng lugar, mula sa OSRM
// (parehong server ng web).
export async function fetchRouteTable(points) {
  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`, { signal: controller.signal });
    const data = await res.json();
    if (data.code !== 'Ok' || !data.durations) throw new Error(data.code || 'No durations');
    return { durations: data.durations, distances: data.distances || null };
  } finally {
    clearTimeout(timer);
  }
}

export function formatTravelDuration(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatTravelDistance(meters) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
