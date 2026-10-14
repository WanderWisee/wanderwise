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
