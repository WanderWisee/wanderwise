import { IconLabel } from './AppIcon';
import { Text } from './Typography';
import { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSuggestedPlaces } from '../services/tripService';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../constants/theme';

// Parehong salita ng web (TripPlanBuilderPage): ang pangalan ng list ang
// nagsasabi kung anong klaseng lugar ang imumungkahi. Tinitingnan ang
// simula ng bawat salita, kaya "kainan" o "beaches" ay pasok din.
const SECTION_CATEGORY_KEYWORDS = {
  food: ['food', 'lamon', 'lamunan', 'kain', 'pagkain', 'eat', 'resto', 'restaurant', 'cafe', 'coffee', 'kape', 'kapihan', 'snack', 'merienda', 'meryenda', 'ulam', 'dining', 'breakfast', 'lunch', 'dinner', 'almusal', 'tanghalian', 'hapunan'],
  hotel: ['hotel', 'stay', 'tulugan', 'matutuluyan', 'tutuluyan', 'accommodation', 'lodging', 'hostel', 'resort', 'inn', 'transient'],
  shopping: ['shop', 'pasalubong', 'mall', 'market', 'palengke', 'tiangge', 'souvenir', 'bilihan', 'pamilihan'],
  beach: ['beach', 'dagat', 'swim', 'langoy', 'island', 'isla', 'snorkel', 'dive', 'diving'],
  nature: ['nature', 'hike', 'hiking', 'falls', 'talon', 'bundok', 'mountain', 'park', 'trek', 'kalikasan', 'cave', 'kweba', 'view'],
  heritage: ['church', 'simbahan', 'heritage', 'histor', 'museum', 'kasaysayan', 'landmark', 'pamana', 'culture', 'kultura'],
};
const LABEL_KEYS = {
  food: 'sectionSuggestFood', hotel: 'sectionSuggestHotel', shopping: 'sectionSuggestShopping',
  beach: 'sectionSuggestBeach', nature: 'sectionSuggestNature', heritage: 'sectionSuggestHeritage',
};

export function detectSectionCategory(sectionName) {
  const words = String(sectionName || '').toLowerCase().split(/[^a-zñ]+/).filter(Boolean);
  for (const [category, keywords] of Object.entries(SECTION_CATEGORY_KEYWORDS)) {
    if (words.some((w) => keywords.some((k) => w.startsWith(k)))) return category;
  }
  return null;
}

// Isang request lang bawat destinasyon + kategorya, at naka-save sa phone
// nang 6 na oras para mabilis na lumabas sa susunod na bukas.
const CACHE_MS = 6 * 60 * 60 * 1000;
const requests = new Map();
function suggestions(destination, category) {
  const key = `${String(destination).trim().toLowerCase()}|${category}`;
  if (!requests.has(key)) {
    const storageKey = `ww_suggest_${key}`;
    const request = (async () => {
      try {
        const saved = JSON.parse((await AsyncStorage.getItem(storageKey)) || 'null');
        if (saved && Date.now() - saved.at < CACHE_MS && saved.items?.length) return saved.items;
      } catch {}
      const items = await fetchSuggestedPlaces(destination, category);
      if (items.length) AsyncStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), items })).catch(() => {});
      return items;
    })().then((items) => {
      if (!items.length) requests.delete(key);
      return items;
    }).catch((error) => { requests.delete(key); throw error; });
    requests.set(key, request);
  }
  return requests.get(key);
}

export default function PlaceSuggestions({ destination, isDefault = false, sectionName = '', query = '', exclude = [], onSelect }) {
  const { t } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showAll, setShowAll] = useState(false);
  // "Where to go": pangkalahatang mungkahi. Ibang list: ayon sa pangalan;
  // walang mungkahi kapag walang tugmang salita (parehong web).
  const category = isDefault ? '' : detectSectionCategory(sectionName);
  const enabled = !!String(destination || '').trim() && (isDefault || !!category);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    setLoading(true);
    suggestions(destination, category || '')
      .then((data) => { if (alive) { setItems(data); setFailed(false); } })
      .catch(() => { if (alive) { setItems([]); setFailed(true); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [destination, category, attempt, enabled]);
  if (!enabled) return null;

  const retry = () => setAttempt((n) => n + 1);
  const added = new Set(exclude.map((n) => String(n || '').trim().toLowerCase()));
  const list = items.filter((item) => !added.has(item.name.trim().toLowerCase()) && item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const shown = showAll ? list : list.slice(0, 12);
  const label = category ? `${t(LABEL_KEYS[category])} ${destination}:` : `${t('suggestedPlacesIn')} ${destination}:`;

  return <View style={{ gap: 8, marginBottom: 14 }}>
    {loading ? (
      <Text style={{ fontFamily: Fonts.regular, color: Colors.brown600, fontSize: 12.5 }}>{t('loadingSuggestedPlaces')}</Text>
    ) : failed || items.length === 0 ? (
      <TouchableOpacity accessibilityRole="button" onPress={retry}>
        <Text style={{ fontFamily: Fonts.regular, color: Colors.brown600, fontSize: 12.5 }}>
          {t(isDefault ? 'noSuggestedPlacesYet' : 'noSectionSuggestions')} <Text style={{ fontFamily: Fonts.semibold, color: Colors.teal }}>↻ {t('tryAgain')}</Text>
        </Text>
      </TouchableOpacity>
    ) : list.length === 0 ? null : (
      <>
        <Text style={{ fontFamily: Fonts.semibold, color: Colors.brown600, fontSize: 13 }}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {shown.map((item) => (
            <TouchableOpacity accessibilityRole="button" key={`${item.name}-${item.lat}-${item.lon}`} onPress={() => onSelect(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.cream2, borderRadius: 14, borderWidth: 1, borderColor: Colors.line }}>
              <IconLabel name="plus" textStyle={{ fontFamily: Fonts.regular, color: Colors.brown900 }}>{item.name}</IconLabel>
              {item.isFree && <Text style={{ fontFamily: Fonts.semibold, fontSize: 11, color: Colors.teal, backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, overflow: 'hidden' }}>{t('freeEntry')}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
        {list.length > 12 && (
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowAll((v) => !v)}>
            <Text style={{ fontFamily: Fonts.semibold, color: Colors.teal, fontSize: 12.5 }}>
              {showAll ? `${t('showFewerPlaces')} ▴` : `${t('showMorePlaces')} (+${list.length - 12}) ▾`}
            </Text>
          </TouchableOpacity>
        )}
      </>
    )}
  </View>;
}
