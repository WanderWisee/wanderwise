import AppIcon from '../components/AppIcon';
import { Text } from '../components/Typography';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { createMapGestures } from '../utils/mapGestures';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { PrimaryButton, ScreenHeader } from '../components/ui';
import { TILE, TILE_HEADERS, project, tileUrl } from '../components/OsmMap';
import { finishPinPicker } from '../utils/pinPicker';

// "Pin on map" (parehong ng web): i-drag ang mapa hanggang nasa tamang
// lugar ang pin sa gitna, tapos I-save. Ipinapakita rin ang ibang lugar ng
// trip para may batayan.
const MAP_HEIGHT = 420;

export default function PinLocationScreen() {
  const router = useRouter();
  const { t } = useApp();
  const { toast } = useDialog();
  const params = useLocalSearchParams();
  const name = String(params.name || '');
  const others = useMemo(() => {
    try { return JSON.parse(String(params.others || '[]')); } catch { return []; }
  }, [params.others]);
  const startLat = Number(params.lat);
  const startLng = Number(params.lng);
  const hasStart = Number.isFinite(startLat) && Number.isFinite(startLng);

  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(hasStart ? 15 : 6);
  const [center, setCenter] = useState(hasStart ? { lat: startLat, lng: startLng } : { lat: 12.3, lng: 122.5 });
  const centerRef = useRef(center);
  centerRef.current = center;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // I-drag, pinch para mag-zoom, double-tap para lumapit (walang native module).
  const pan = useMemo(() => createMapGestures(
    () => ({ ...centerRef.current, zoom: zoomRef.current }),
    (v) => { setCenter({ lat: v.lat, lng: v.lng }); setZoom(v.zoom); },
    () => ({ w: width, h: MAP_HEIGHT }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [width]);

  const layout = useMemo(() => {
    if (!width) return null;
    const c = project(center.lat, center.lng, zoom);
    const left = c.x - width / 2;
    const top = c.y - MAP_HEIGHT / 2;
    const max = 2 ** zoom;
    const tiles = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + MAP_HEIGHT) / TILE); ty++) {
        if (ty < 0 || ty >= max) continue;
        tiles.push({ key: `${zoom}-${tx}-${ty}`, uri: tileUrl(zoom, ((tx % max) + max) % max, ty), left: tx * TILE - left, top: ty * TILE - top });
      }
    }
    const pins = others.map((p, i) => {
      const pt = project(Number(p.latitude), Number(p.longitude), zoom);
      return { key: `o-${i}`, name: p.name, left: pt.x - left, top: pt.y - top };
    }).filter((p) => p.left > -20 && p.left < width + 20 && p.top > -20 && p.top < MAP_HEIGHT + 20);
    return { tiles, pins };
  }, [width, center, zoom, others]);

  async function goToMyLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { toast(t('locationNeeded')); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null)
        || await Location.getLastKnownPositionAsync().catch(() => null);
      if (!pos) { toast(t('locationUnavailable')); return; }
      setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setZoom(17);
    } catch { toast(t('locationUnavailable')); }
  }

  function save() {
    finishPinPicker({ latitude: Math.round(center.lat * 1e6) / 1e6, longitude: Math.round(center.lng * 1e6) / 1e6 });
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('pinOnMap')} onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.hint}>{t('pinDragHint').replace('{place}', name)}</Text>
        <View style={styles.mapWrap} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} {...pan.panHandlers}>
          {layout && layout.tiles.map((tile) => (
            <Image key={tile.key} source={{ uri: tile.uri, headers: TILE_HEADERS }} cachePolicy="memory-disk" transition={0}
              style={[styles.tile, { left: tile.left, top: tile.top }]} />
          ))}
          {layout && layout.pins.map((p) => (
            <View key={p.key} pointerEvents="none" style={[styles.otherPin, { left: p.left - 6, top: p.top - 6 }]} />
          ))}
          {/* Ang pin sa gitna = lokasyong ise-save */}
          <View pointerEvents="none" style={styles.centerPinWrap}>
            <AppIcon name="pin" size={40} color={Colors.error} />
          </View>
          <View style={styles.attribution} pointerEvents="none">
            <Text style={styles.attributionText}>Tiles © Esri · © OpenStreetMap contributors</Text>
          </View>
        </View>

        <View style={styles.row}>
          <TouchableOpacity onPress={goToMyLocation} style={styles.chip}>
            <AppIcon name="compass" size={16} />
            <Text style={styles.chipText}>{t('youAreHere')}</Text>
          </TouchableOpacity>
          {others.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/map-view', params: { title: name, points: JSON.stringify([...others, { latitude: center.lat, longitude: center.lng, name }]) } })}
              style={styles.chip}
            >
              <AppIcon name="external" size={16} />
              <Text style={styles.chipText}>{t('viewOnMap')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <PrimaryButton label={t('savePinLocation')} onPress={save} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, width: '100%', maxWidth: 640, alignSelf: 'center' },
  hint: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600, marginBottom: 10 },
  mapWrap: { height: MAP_HEIGHT, overflow: 'hidden', borderRadius: 14, backgroundColor: '#E8E2CF', borderWidth: 1, borderColor: Colors.line },
  tile: { position: 'absolute', width: TILE, height: TILE },
  otherPin: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FC7E00', borderWidth: 2, borderColor: '#FFFFFF' },
  centerPinWrap: { position: 'absolute', left: '50%', top: '50%', marginLeft: -20, marginTop: -40 },
  zoomCol: { position: 'absolute', right: 10, top: 10, gap: 8 },
  zoomBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  attribution: { position: 'absolute', right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 6 },
  attributionText: { fontSize: 9, color: '#333' },
  row: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.cream2 },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.brown900 },
});
