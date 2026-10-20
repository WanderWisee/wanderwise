import AppIcon from './AppIcon';
import { Text } from './Typography';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Polyline } from 'react-native-svg';
import { Colors, Fonts } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { osmRouteUrl } from '../services/geoService';

// Totoong mapa gamit ang Esri World Street Map tiles (galing sa OpenStreetMap
// at iba pang data). Hindi na tile.openstreetmap.org (403 "Access blocked" sa
// APK) at hindi na CARTO ("API KEY REQUIRED" sa APK); ang Esri tiles ay walang
// kailangang API key. Gamit ang expo-image para maipadala ang headers.
// Kinukuwenta ang zoom para magkasya lahat ng pin,
// tapos inilalatag ang mga tile bilang <Image>. Pag-tap: bubukas ang buong
// mapa sa openstreetmap.org para makapag-zoom/pan ang user.
//
// markers: [{ latitude, longitude, label?, color?, number? }]
// path (optional): [{ latitude, longitude }] — daan na iguguhit sa mapa.
// number = numerong ipapakita sa pin (kapareho ng nasa list); wala = 1, 2, 3…

export const TILE = 256;
// Pansinin: z / y / x ang ayos sa Esri (hindi z / x / y).
export const tileUrl = (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
export const TILE_HEADERS = {
  'User-Agent': 'WanderWise-Mobile/1.0 (+https://www.wanderwise.site)',
  Referer: 'https://www.wanderwise.site/',
};

// Sentro ng Pilipinas kapag walang pin
const PH_CENTER = { latitude: 12.3, longitude: 122.5, zoom: 5 };

export function project(lat, lon, zoom) {
  const scale = TILE * 2 ** zoom;
  const clamped = Math.max(-85, Math.min(85, lat));
  const rad = (clamped * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale,
  };
}

function pickView(points, width, height, fallback) {
  if (points.length === 0) {
    return { zoom: fallback.zoom, center: project(fallback.latitude, fallback.longitude, fallback.zoom) };
  }
  if (points.length === 1) {
    const zoom = fallback.singleZoom || 13;
    return { zoom, center: project(points[0].latitude, points[0].longitude, zoom) };
  }
  const pad = 36;
  for (let zoom = 16; zoom >= 2; zoom--) {
    const px = points.map((p) => project(p.latitude, p.longitude, zoom));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    if (w <= width - pad * 2 && h <= height - pad * 2) {
      return {
        zoom,
        center: { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 },
      };
    }
  }
  const zoom = 2;
  return { zoom, center: project(points[0].latitude, points[0].longitude, zoom) };
}

export function toLatLon(x, y, zoom) {
  const scale = TILE * 2 ** zoom;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lon };
}

export default function OsmMap({
  markers = [],
  height = 180,
  style = null,
  numbered = true,
  emptyLabel = null,
  fallbackCenter = PH_CENTER,
  singleZoom = 13,
  onPress = null,
  path = null,
}) {
  const [width, setWidth] = useState(0);
  const [failedTile, setFailedTile] = useState('');
  const { t } = useApp();

  const points = useMemo(
    () =>
      (markers || []).filter(
        (m) => m && m.latitude != null && m.longitude != null && !isNaN(Number(m.latitude)) && !isNaN(Number(m.longitude))
      ).map((m) => ({ ...m, latitude: Number(m.latitude), longitude: Number(m.longitude) })),
    [markers]
  );

  const pathPoints = useMemo(
    () => (path || []).filter((p) => p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
      .map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) })),
    [path]
  );

  const layout = useMemo(() => {
    if (!width) return null;
    // Kasya sa view ang mga pin at ang buong daan.
    const { zoom, center } = pickView([...points, ...pathPoints], width, height, { ...fallbackCenter, singleZoom });
    const left = center.x - width / 2;
    const top = center.y - height / 2;
    const maxTile = 2 ** zoom;
    const tiles = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
        if (ty < 0 || ty >= maxTile) continue;
        const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
        tiles.push({
          key: `${zoom}-${tx}-${ty}`,
          uri: tileUrl(zoom, wrappedX, ty),
          left: tx * TILE - left,
          top: ty * TILE - top,
        });
      }
    }
    const pins = points.map((p, i) => {
      const pt = project(p.latitude, p.longitude, zoom);
      return { ...p, index: i, left: pt.x - left, top: pt.y - top };
    });
    const centerLatLon = toLatLon(center.x, center.y, zoom);
    const line = pathPoints.map((p) => {
      const pt = project(p.latitude, p.longitude, zoom);
      return `${(pt.x - left).toFixed(1)},${(pt.y - top).toFixed(1)}`;
    }).join(' ');
    return { zoom, tiles, pins, centerLatLon, line };
  }, [width, height, points, pathPoints, fallbackCenter, singleZoom]);

  function openFullMap() {
    if (onPress) return onPress();
    if (!layout) return;
    // May daan: buksan ang parehong ruta (lahat ng point) sa OpenStreetMap/OSRM.
    if (pathPoints.length > 1 && points.length > 1) { Linking.openURL(osmRouteUrl(points)); return; }
    const { zoom, centerLatLon } = layout;
    const marker = points.length === 1 ? `mlat=${points[0].latitude}&mlon=${points[0].longitude}&` : '';
    Linking.openURL(
      `https://www.openstreetmap.org/?${marker}#map=${zoom}/${centerLatLon.lat.toFixed(5)}/${centerLatLon.lon.toFixed(5)}`
    );
  }

  return (
    <Pressable
      onPress={openFullMap}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={[styles.wrap, { height }, style]}
      accessibilityRole="button"
      accessibilityLabel="Open map"
    >
      {layout &&
        layout.tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri, headers: TILE_HEADERS }}
            cachePolicy="memory-disk"
            transition={0}
            onError={() => setFailedTile(tile.key)}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        ))}

      {layout && !!layout.line && pathPoints.length > 1 && (
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
          <Polyline points={layout.line} fill="none" stroke={Colors.teal} strokeWidth={4} strokeOpacity={0.85} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      )}

      {layout &&
        layout.pins.map((pin) => (
          <View key={`pin-${pin.index}`} pointerEvents="none" style={[styles.pinWrap, { left: pin.left - 13, top: pin.top - 30 }]}>
            <View style={[styles.pin, pin.color ? { backgroundColor: pin.color } : null]}>
              <Text style={styles.pinText}>{numbered ? (pin.number ?? pin.index + 1) : '•'}</Text>
            </View>
            <View style={[styles.pinTail, pin.color ? { borderTopColor: pin.color } : null]} />
          </View>
        ))}

      {points.length === 0 && emptyLabel && (
        <View style={styles.emptyBadge} pointerEvents="none">
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      )}

      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionText}>Tiles © Esri · © OpenStreetMap contributors</Text>
      </View>
      <View style={styles.expandBadge} pointerEvents="none">
        <AppIcon name="expand" style={styles.expandText} />
      </View>
      <View style={{ position: 'absolute', top: 8, left: 8, right: 44, backgroundColor: 'rgba(246,241,220,0.94)', borderRadius: 8, padding: 6 }} pointerEvents="none">
        <Text style={{ fontFamily: Fonts.regular, color: Colors.brown900, fontSize: 11 }}>
          {layout?.tiles.some((tile) => tile.key === failedTile) ? t('mapUnavailable') : t('mapPreview')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden', borderRadius: 14, backgroundColor: '#E8E2CF',
    borderWidth: 1, borderColor: Colors.line,
  },
  tile: { position: 'absolute', width: TILE, height: TILE },
  pinWrap: { position: 'absolute', width: 26, alignItems: 'center' },
  pin: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.brown900,
    borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  pinText: { fontFamily: Fonts.semibold, fontSize: 11, color: Colors.mint },
  pinTail: {
    width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.brown900, marginTop: -1,
  },
  attribution: {
    position: 'absolute', right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 6,
  },
  attributionText: { fontSize: 9, color: '#333' },
  expandBadge: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  expandText: { fontSize: 14, color: Colors.brown900 },
  emptyBadge: {
    position: 'absolute', left: 12, bottom: 12, right: 60,
    backgroundColor: 'rgba(246,241,220,0.95)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  emptyText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.brown600 },
});
