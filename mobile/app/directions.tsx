import { Text } from '../components/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import OsmMap from '../components/OsmMap';
import { ErrorState, Loading, ScreenHeader } from '../components/ui';
import { getRoute, getRoutePath, osmRouteUrl } from '../services/geoService';

// Directions mula sa kinaroroonan ngayon papunta sa isang lugar — parehong
// Directions page ng web: daan sa mapa, oras at layo. Pindutin ang mapa para
// buksan ang parehong ruta sa OpenStreetMap.
function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export default function DirectionsScreen() {
  const router = useRouter();
  const { t, formatDistance } = useApp();
  const params = useLocalSearchParams();
  const name = String(params.name || '');
  const destinationName = String(params.destination || '');
  const to = { latitude: Number(params.lat), longitude: Number(params.lng), name };
  const mode = 'driving';
  const [origin, setOrigin] = useState<any>(null);
  const [locError, setLocError] = useState('');
  const [route, setRoute] = useState<any>(null);
  const [path, setPath] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const ticket = useRef(0);

  const locate = useCallback(async () => {
    setLocError('');
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setLocError(t('locationNeeded')); setLoading(false); return; }
      // Puwedeng matagal ang GPS: 15s lang, tapos huling alam na lokasyon.
      let timer: any;
      const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 15000); });
      let pos: any = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null), timeout]);
      clearTimeout(timer);
      if (!pos) pos = await Location.getLastKnownPositionAsync().catch(() => null);
      if (!pos) { setLocError(t('locationUnavailable')); setLoading(false); return; }
      setOrigin({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      setLocError(t('locationUnavailable'));
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void locate(); }, [locate]);

  useEffect(() => {
    if (!origin) return;
    const mine = ++ticket.current;
    setLoading(true);
    Promise.all([getRoute(origin, to, mode), getRoutePath([origin, to], mode)]).then(([r, p]) => {
      if (mine !== ticket.current) return;
      setRoute(r);
      setPath(p);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, params.lat, params.lng]);

  const distanceText = route
    ? route.distanceKm < 1 && formatDistance(1000).endsWith('km') ? `${Math.round(route.distanceKm * 1000)} m` : formatDistance(route.distanceKm * 1000)
    : '';

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('directions')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.place} numberOfLines={2}>{name}</Text>
        {!!destinationName && <Text style={styles.sub}>{destinationName}</Text>}

        <View style={{ height: 12 }} />

        {locError ? (
          <ErrorState message={locError} onRetry={locate} retryLabel={t('tryAgain')} />
        ) : (
          <>
            <OsmMap
              markers={[
                ...(origin ? [{ ...origin, label: t('youAreHere'), color: Colors.teal, number: '•' }] : []),
                { ...to, label: name, number: '★' },
              ]}
              path={path}
              height={260}
              singleZoom={15}
              onPress={() => Linking.openURL(osmRouteUrl(origin ? [origin, to] : [to]))}
            />
            {loading ? <Loading style={{ marginTop: 16 }} /> : route && (
              <View style={styles.summary}>
                <Text style={styles.summaryTime}>{route.estimated ? '~' : ''}{formatDuration(route.durationMin)}</Text>
                <Text style={styles.summaryDist}>{distanceText}{route.estimated ? ` · ${t('routeEstimated')}` : ''}</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  place: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: Colors.brown900 },
  sub: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600, marginBottom: 6 },
  modeRow: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.cream2 },
  modeChipActive: { backgroundColor: Colors.brown900 },
  modeText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.brown900 },
  summary: { marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line },
  summaryTime: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: Colors.brown900 },
  summaryDist: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 2 },
});
