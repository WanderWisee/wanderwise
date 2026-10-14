import { useEffect, useRef } from 'react';
import { geocodePlace, hasCoords } from '../services/geoService';

// Isa-isang pinoproseso ang geocoding (hindi sabay-sabay) para hindi
// lumampas sa rate limit ng Nominatim.
let queue = Promise.resolve();
function enqueue(task) {
  queue = queue.then(task).catch(() => {});
  return queue;
}

// Binabantayan ang trip: kapag may place na walang coordinates, hahanapin
// ito sa background at tatawagin ang onCoordsFound(name, coords).
export function useAutoGeocode(trip, onCoordsFound) {
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const handledRef = useRef(new Set());
  const callbackRef = useRef(onCoordsFound);
  useEffect(() => { callbackRef.current = onCoordsFound; }, [onCoordsFound]);

  useEffect(() => {
    if (!trip) return;
    const destination = trip.destination || '';

    trip.sections
      .flatMap((s) => s.places)
      .filter((p) => !hasCoords(p))
      .forEach((place) => {
        const id = `${place.name}|${destination}`;
        if (handledRef.current.has(id)) return;
        handledRef.current.add(id);

        enqueue(async () => {
          if (!mountedRef.current) return;
          const coords = await geocodePlace(place.name, destination);
          if (coords && mountedRef.current) callbackRef.current(place.name, coords);
        });
      });
  }, [trip]);
}