import AppIcon from '../components/AppIcon';
import { Text } from '../components/Typography';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { createMapGestures } from '../utils/mapGestures';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { ScreenHeader } from '../components/ui';
import { TILE, TILE_HEADERS, project, tileUrl } from '../components/OsmMap';

// Buong mapa sa loob ng app (hindi na sa ibang website): lahat ng lugar ng
// trip bilang pin na may pangalan. I-drag para gumalaw, pinch para mag-zoom,
// double-tap para lumapit.
export default function MapViewScreen() {
  const router = useRouter();
  const { t } = useApp();
  const params = useLocalSearchParams();
  const points = useMemo(() => {
    try {
      return JSON.parse(String(params.points || '[]'))
        .filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
    } catch { return []; }
  }, [params.points]);

  const [size, setSize] = useState({ w: 0, h: 0 });
  // Simula: kasya lahat ng pin sa screen.
  const initial = useMemo(() => {
    if (!points.length) return { lat: 12.3, lng: 122.5, zoom: 6 };
    const lat = points.reduce((a, p) => a + Number(p.latitude), 0) / points.length;
    const lng = points.reduce((a, p) => a + Number(p.longitude), 0) / points.length;
    if (points.length === 1 || !size.w) return { lat, lng, zoom: 15 };
    for (let z = 17; z >= 3; z--) {
      const px = points.map((p) => project(Number(p.latitude), Number(p.longitude), z));
      const w = Math.max(...px.map((p) => p.x)) - Math.min(...px.map((p) => p.x));
      const h = Math.max(...px.map((p) => p.y)) - Math.min(...px.map((p) => p.y));
      if (w <= size.w - 80 && h <= size.h - 120) return { lat, lng, zoom: z };
    }
    return { lat, lng, zoom: 3 };
  }, [points, size.w, size.h]);

  const [view, setView] = useState(null); // { lat, lng, zoom } after the user moves
  const cur = view || initial;
  const curRef = useRef(cur);
  curRef.current = cur;
  const [selected, setSelected] = useState(-1);

  const sizeRef = useRef(size);
  sizeRef.current = size;
  const pan = useMemo(() => createMapGestures(() => curRef.current, setView, () => sizeRef.current), []);

  const layout = useMemo(() => {
    if (!size.w || !size.h) return null;
    const c = project(cur.lat, cur.lng, cur.zoom);
    const left = c.x - size.w / 2;
    const top = c.y - size.h / 2;
    const max = 2 ** cur.zoom;
    const tiles = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty++) {
        if (ty < 0 || ty >= max) continue;
        tiles.push({ key: `${cur.zoom}-${tx}-${ty}`, uri: tileUrl(cur.zoom, ((tx % max) + max) % max, ty), left: tx * TILE - left, top: ty * TILE - top });
      }
    }
    const pins = points.map((p, i) => {
      const pt = project(Number(p.latitude), Number(p.longitude), cur.zoom);
      return { i, name: p.name, left: pt.x - left, top: pt.y - top };
    });
    return { tiles, pins };
  }, [size, cur, points]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={String(params.title || t('viewOnMap'))} onBack={() => router.back()} />
      <View style={styles.map} onLayout={(e) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })} {...pan.panHandlers}>
        {layout && layout.tiles.map((tile) => (
          <Image key={tile.key} source={{ uri: tile.uri, headers: TILE_HEADERS }} cachePolicy="memory-disk" transition={0}
            style={[styles.tile, { left: tile.left, top: tile.top }]} />
        ))}
        {layout && layout.pins.map((p) => (
          <TouchableOpacity key={p.i} activeOpacity={0.8} onPress={() => setSelected(p.i === selected ? -1 : p.i)}
            style={[styles.pinWrap, { left: p.left - 14, top: p.top - 32 }]}>
            <AppIcon name="pin" size={28} color="#FC7E00" />
            {(selected === p.i || cur.zoom >= 14) && (
              <View style={styles.label}><Text style={styles.labelText} numberOfLines={1}>{p.name}</Text></View>
            )}
          </TouchableOpacity>
        ))}
        <View style={styles.attribution} pointerEvents="none">
          <Text style={styles.attributionText}>Tiles © Esri · © OpenStreetMap contributors</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  map: { flex: 1, overflow: 'hidden', backgroundColor: '#E8E2CF' },
  tile: { position: 'absolute', width: TILE, height: TILE },
  pinWrap: { position: 'absolute', alignItems: 'center', width: 28 },
  label: { position: 'absolute', top: 28, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.95)', maxWidth: 160 },
  labelText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: Colors.brown900 },
  zoomCol: { position: 'absolute', right: 12, top: 12, gap: 8 },
  zoomBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  attribution: { position: 'absolute', right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 6 },
  attributionText: { fontSize: 9, color: '#333' },
});
