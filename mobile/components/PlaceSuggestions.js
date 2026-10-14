import { IconLabel } from './AppIcon';
import { Text } from './Typography';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { fetchSuggestedPlaces } from '../services/tripService';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../constants/theme';

const requests = new Map();
function suggestions(destination, category) {
  const key = `${destination}|${category}`;
  if (!requests.has(key)) {
    const request = fetchSuggestedPlaces(destination, category).then((items) => {
      if (!items.length) requests.delete(key);
      return items;
    }).catch((error) => { requests.delete(key); throw error; });
    requests.set(key, request);
  }
  return requests.get(key);
}

export default function PlaceSuggestions({ destination, sectionName = '', query = '', onSelect }) {
  const { t } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const name = sectionName.toLowerCase();
  const category = /food|eat|restaurant|cafe|kain|lamon/.test(name) ? 'food' : /hotel|stay|lodg|tuluy/.test(name) ? 'hotel' : /shop|mall|pasalubong/.test(name) ? 'shopping' : /beach|dagat/.test(name) ? 'beach' : /nature|park|hike|bundok/.test(name) ? 'nature' : /heritage|museum|church|simbahan/.test(name) ? 'heritage' : '';
  useEffect(() => {
    let alive = true;
    suggestions(destination, category).then((data) => { if (alive) { setItems(data); setError(''); } })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [destination, category, attempt]);
  const shown = items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);
  return <View style={{ gap: 8, marginBottom: 14 }}>
    <Text style={{ fontFamily: Fonts.semibold, color: Colors.brown600, fontSize: 13 }}>{t('suggestedPlaces')}</Text>
    {loading ? <ActivityIndicator color={Colors.brown600} /> : error ? <TouchableOpacity accessibilityRole="button" onPress={() => { setLoading(true); setAttempt((n) => n + 1); }}><Text style={{ color: Colors.error }}>{t('tryAgain')}</Text></TouchableOpacity> : !shown.length ? <Text style={{ color: Colors.brown600, fontSize: 12 }}>{t('noSuggestions')}</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {shown.map((item) => <TouchableOpacity accessibilityRole="button" key={`${item.name}-${item.lat}-${item.lon}`} onPress={() => onSelect(item)} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.cream2, borderRadius: 14, borderWidth: 1, borderColor: Colors.line }}><IconLabel name="plus" textStyle={{ fontFamily: Fonts.regular, color: Colors.brown900 }}>{item.name}</IconLabel></TouchableOpacity>)}
    </ScrollView>}
  </View>;
}
