import AppIcon from './AppIcon';
import { Text } from './Typography';
import { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Colors } from '../constants/theme';
import { getRoute, directionsUrl, hasCoords } from '../services/geoService';
import { useApp } from '../context/AppContext';

const MODE_ICONS = { walking: 'user', driving: 'car' };

function formatDuration(mins) {
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}


export default function DirectionsConnector({ from, to, destination }) {
  const { t, formatDistance } = useApp();
  const [mode, setMode] = useState('walking');
  const [result, setResult] = useState(null);
  const routeKey = `${from.latitude},${from.longitude}:${to.latitude},${to.longitude}:${mode}`;
  const route = result?.key === routeKey ? result.route : null;
  const bothLocated = hasCoords(from) && hasCoords(to);

  useEffect(() => {
    let cancelled = false;
    if (!bothLocated) return undefined;
    getRoute(from, to, mode).then((result) => {
      if (!cancelled) setResult({ key: routeKey, route: result });
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, mode, routeKey, bothLocated]);

  let summary = null;
  if (route) {
    summary = `${route.estimated ? '~' : ''}${formatDuration(route.durationMin)} • ${route.distanceKm < 1 && formatDistance(1000).endsWith('km') ? `${Math.round(route.distanceKm * 1000)} m` : formatDistance(route.distanceKm * 1000)}`;
  } else if (bothLocated) {
    summary = t('directionsLoadingRoute');
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.modeButton}
        onPress={() => setMode(mode === 'walking' ? 'driving' : 'walking')}
      >
        <AppIcon name={MODE_ICONS[mode]} size={20} />
        <AppIcon name="chevron-down" style={styles.caret} />
      </TouchableOpacity>

      {summary && <Text style={styles.summary}>{summary}</Text>}

      <TouchableOpacity onPress={() => Linking.openURL(directionsUrl(from, to, mode, destination))}>
        <Text style={styles.directionsLink}>{t('directions')}</Text>
      </TouchableOpacity>

      <View style={styles.dashedLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 8, marginBottom: 12 },
  modeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 52, minHeight: 44, borderRadius: 12, backgroundColor: Colors.cream2 },
  modeIcon: { fontSize: 14 },
  caret: { fontSize: 10, color: Colors.brown600 },
  summary: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 20, color: Colors.brown600, flexShrink: 1 },
  directionsLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 20, color: Colors.teal, paddingVertical: 12 },
  dashedLine: {
    flex: 1, height: 1, marginLeft: 4,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 1, borderColor: Colors.line,
  },
});