import { PanResponder } from 'react-native';
import { project, toLatLon } from '../components/OsmMap';

// Galaw ng mapa gamit ang daliri (walang native module):
//  - isang daliri: i-drag
//  - dalawang daliri: pinch para mag-zoom in / zoom out
//  - double-tap: zoom in sa tinapik na lugar
// getView() → { lat, lng, zoom }; setView(next) para baguhin ito.
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const clampZoom = (z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

function touchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

export function createMapGestures(getView, setView, getSize, { captureTaps = true } = {}) {
  let start = null; // { x, y, zoom }
  let pinch = null; // { dist, zoom }
  let pinched = false;
  let lastTap = 0;

  return PanResponder.create({
    onStartShouldSetPanResponder: () => captureTaps,
    onMoveShouldSetPanResponder: (_, g) => g.numberActiveTouches > 1 || Math.abs(g.dx) + Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      const v = getView();
      start = { ...project(v.lat, v.lng, v.zoom), zoom: v.zoom };
      pinch = null;
      pinched = false;
    },
    onPanResponderMove: (evt, g) => {
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        // Pinch: bawat doble ng layo ng daliri = 1 zoom level.
        const dist = touchDistance(touches);
        const v = getView();
        if (!pinch) pinch = { dist, zoom: v.zoom };
        pinched = true;
        if (dist > 0 && pinch.dist > 0) {
          const next = clampZoom(pinch.zoom + Math.round(Math.log2(dist / pinch.dist)));
          if (next !== v.zoom) setView({ ...v, zoom: next });
        }
        return;
      }
      if (pinched || !start) return; // tapos na ang pinch sa galaw na ito
      const ll = toLatLon(start.x - g.dx, start.y - g.dy, start.zoom);
      setView({ lat: Math.max(-85, Math.min(85, ll.lat)), lng: ll.lon, zoom: start.zoom });
    },
    onPanResponderRelease: (evt, g) => {
      const moved = Math.abs(g.dx) + Math.abs(g.dy);
      if (!pinched && moved < 6) {
        const now = Date.now();
        if (now - lastTap < 300) {
          // Double-tap: zoom in sa tinapik na lugar.
          const v = getView();
          const size = getSize();
          const c = project(v.lat, v.lng, v.zoom);
          const x = c.x + (evt.nativeEvent.locationX - size.w / 2);
          const y = c.y + (evt.nativeEvent.locationY - size.h / 2);
          const ll = toLatLon(x, y, v.zoom);
          setView({ lat: ll.lat, lng: ll.lon, zoom: clampZoom(v.zoom + 1) });
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }
      start = null;
      pinch = null;
      pinched = false;
    },
    onPanResponderTerminationRequest: () => false,
  });
}
