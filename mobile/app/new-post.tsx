import AppIcon, { IconLabel } from '../components/AppIcon';
import { Text, TextInput } from '../components/Typography';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreventRemove } from 'expo-router/react-navigation';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '../components/ui';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { createJournalEntry } from '../services/journalService';
import { fetchTrips, fetchTripById } from '../services/tripService';
import { fetchDestinationImage } from '../services/geoService';
import { journalEntryHasContent, journalEntriesMissingPhotos } from '../utils/journalValidation';

// Draft na walang base64 (masyadong malaki para sa AsyncStorage); photoUri lang ang itatabi.
function draftJson(place, entries, hotels, hotelName, hotelDesc) {
  return JSON.stringify({ place, entries: entries.map(({ photoData, ...rest }) => rest), hotels, hotelName, hotelDesc });
}

function makeEmptyEntry() {
  return {
    id: `entry_${Date.now()}_${Math.random()}`,
    photoUri: null,
    photoData: null, // data URL na ipapadala sa backend (parehong format ng web)
    placeName: '',
    rating: 0,
    description: '',
    pros: [],
    prosInput: '',
    cons: [],
    consInput: '',
  };
}

export default function NewPostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, user, isLoggedIn } = useApp();
  const { alert, toast, confirm } = useDialog();
  const [place, setPlace] = useState(String(params.place || ''));
  const [entries, setEntries] = useState([makeEmptyEntry()]);
  const [hotels, setHotels] = useState([]);
  const [hotelName, setHotelName] = useState('');
  const [hotelDesc, setHotelDesc] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [reviewEntries, setReviewEntries] = useState<string[]>([]);
  const [hotelsOpen, setHotelsOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const postingRef = useRef(false);

  // ---- Fill in from a trip ----
  // From the "trip is over" notification or the trip menu (?tripId=), or by
  // tapping one of the student's trips: its places are added below (each
  // only needs a photo) and the trip's photo becomes the cover.
  const [myTrips, setMyTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [tripCover, setTripCover] = useState(null);
  const [tripPlaces, setTripPlaces] = useState([]);
  const tripParamApplied = useRef(false);
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchTrips().then((list) => setMyTrips(Array.isArray(list) ? list : [])).catch(() => setMyTrips([]));
  }, [isLoggedIn]);

  // Trip na hindi pa nagsisimula (hal. sa December pa): hindi pa puwedeng
  // isulat ang kwento nito. (Walang petsa = hindi masabi, kaya puwede.)
  // Sinusuri rin ito ng server.
  const todayIso = (() => {
    const d = new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  })();
  const tripStarted = (trip) => !trip?.startDate || String(trip.startDate).slice(0, 10) <= todayIso;
  const startedTrips = myTrips.filter(tripStarted);
  const notStartedTripFor = (text) => {
    const typed = String(text || '').trim().toLowerCase();
    if (!typed) return null;
    const same = myTrips.filter((trip) => String(trip.destination || '').trim().toLowerCase() === typed);
    return same.length > 0 && !same.some(tripStarted) ? same[0] : null;
  };
  const notYetText = (trip) => t('journalTripNotStarted').replace('{place}', String(trip.destination || '').trim()).replace('{date}', String(trip.startDate).slice(0, 10));
  const futureTrip = notStartedTripFor(place);

  function clearTrip() {
    setSelectedTripId('');
    setTripCover(null);
    setTripPlaces([]);
  }

  async function applyTrip(tripId) {
    const key = String(tripId || '');
    if (!key) return;
    setSelectedTripId(key);
    try {
      const trip = await fetchTripById(key);
      if (!tripStarted(trip)) { clearTrip(); return; }
      const names = [];
      (trip?.sections || []).forEach((sec) => (sec.places || []).forEach((pl) => {
        // Napuntahan na, o dumating na ang araw nito sa itinerary.
        const day = pl.itineraryDate ? String(pl.itineraryDate).slice(0, 10) : '';
        if (!pl.visited && day && day > todayIso) return;
        const name = String(pl.name || '').trim();
        if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) names.push(name);
      }));
      const destination = String(trip?.destination || '').trim();
      if (destination) setPlace((prev) => (prev.trim() ? prev : destination));
      // The itinerary's places are offered under "Spot name" to pick from.
      setTripPlaces(names);
      setTripCover(destination ? await fetchDestinationImage(destination) : null);
    } catch {
      setTripCover(null);
    }
  }

  // Typing the place: if it is the destination of one of the student's
  // trips, that trip's places and photo are used.
  function handlePlaceChange(text) {
    setPlace(text);
    const typed = text.trim().toLowerCase();
    const match = startedTrips.find((trip) => String(trip.destination || '').trim().toLowerCase() === typed);
    if (match && typed) {
      if (String(match.id) !== selectedTripId) void applyTrip(match.id);
      return;
    }
    const current = myTrips.find((trip) => String(trip.id) === selectedTripId);
    if (current && !typed.includes(String(current.destination || '').trim().toLowerCase())) clearTrip();
  }

  const tripDestinations = [];
  startedTrips.forEach((trip) => {
    const d = String(trip.destination || '').trim();
    if (d && !tripDestinations.some((x) => x.dest.toLowerCase() === d.toLowerCase())) tripDestinations.push({ dest: d, id: trip.id });
  });
  const placeSuggestions = tripDestinations.filter((x) => {
    const typed = place.trim().toLowerCase();
    return x.dest.toLowerCase() !== typed && (!typed || x.dest.toLowerCase().includes(typed));
  }).slice(0, 6);

  useEffect(() => {
    if (!draftReady || tripParamApplied.current || !params.tripId) return;
    tripParamApplied.current = true;
    void applyTrip(String(params.tripId));
  }, [draftReady, params.tripId]); // eslint-disable-line react-hooks/exhaustive-deps
  const navigation = useNavigation();
  const draftKey = `wanderwise_journal_draft_${user?.userId}`;
  const hasContent = entries.some(journalEntryHasContent) || !!place.trim() || hotels.length > 0 || !!hotelName.trim() || !!hotelDesc.trim();
  const restoredNotice = useEffectEvent(() => toast(t('draftRestored')));
  useEffect(() => {
    if (!user?.userId) return;
    let alive = true;
    AsyncStorage.getItem(draftKey).then((raw) => {
      if (!alive || !raw) return;
      try {
        const draft = JSON.parse(raw);
        if (!Array.isArray(draft.entries) || !draft.entries.length) return;
        setPlace(draft.place || ''); setEntries(draft.entries.map((e) => ({ ...makeEmptyEntry(), ...e, photoData: e.photoData || null }))); setHotels(draft.hotels || []);
        setHotelName(draft.hotelName || ''); setHotelDesc(draft.hotelDesc || '');
        restoredNotice();
      } catch { /* Ignore an invalid draft. */ }
    }).catch(() => {}).finally(() => { if (alive) setDraftReady(true); });
    return () => { alive = false; };
  }, [draftKey, user?.userId]);
  useEffect(() => {
    if (!draftReady || leaving) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(draftKey, draftJson(place, entries, hotels, hotelName, hotelDesc)).then(() => setDraftError('')).catch(() => setDraftError(t('draftSaveFailed')));
    }, 400);
    return () => clearTimeout(timer);
  }, [draftReady, leaving, draftKey, place, entries, hotels, hotelName, hotelDesc, t]);
  usePreventRemove(isLoggedIn && !leaving && hasContent, ({ data }) => {
    if (postingRef.current) return;
    void confirm({ title: t('leaveDraft'), message: t('draftKept'), confirmLabel: t('leave'), cancelLabel: t('keepEditing') }).then(async (ok) => {
      if (!ok) return;
      // Kahit hindi ma-save ang draft, tuloy pa rin ang pag-alis.
      try { await AsyncStorage.setItem(draftKey, draftJson(place, entries, hotels, hotelName, hotelDesc)); }
      catch { await alert(t('draftSaveFailed')); }
      setLeaving(true); setTimeout(() => navigation.dispatch(data.action), 0);
    });
  });

  function updateEntry(id, changes) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }

  async function pickPhotoFor(id) {
    try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert(t('photoPermissionTitle'), t('photoPermissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      // Mababang quality para hindi lumaki nang husto ang base64 sa database.
      quality: 0.35,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      alert(t('couldntReadPhoto'));
      return;
    }

    const resized = await manipulateAsync(asset.uri, [{ resize: asset.width > asset.height ? { width: 1280 } : { height: 1280 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
    updateEntry(id, { photoUri: resized.uri, photoData: `data:image/jpeg;base64,${resized.base64}` });

    } catch (e) { await alert(t('couldntReadPhoto'), e.message); }
  }

  function removeEntry(id) {
    setEntries((prev) => (prev.length === 1 ? prev : prev.filter((e) => e.id !== id)));
    if (activeEntryId === id) setActiveEntryId(null);
  }

  function addPro(entry) {
    if (!entry.prosInput.trim()) return;
    updateEntry(entry.id, { pros: [...entry.pros, entry.prosInput.trim()], prosInput: '' });
  }
  function removePro(entry, index) {
    updateEntry(entry.id, { pros: entry.pros.filter((_, i) => i !== index) });
  }

  function addCon(entry) {
    if (!entry.consInput.trim()) return;
    updateEntry(entry.id, { cons: [...entry.cons, entry.consInput.trim()], consInput: '' });
  }
  function removeCon(entry, index) {
    updateEntry(entry.id, { cons: entry.cons.filter((_, i) => i !== index) });
  }

  function addHotel() {
    if (!hotelName.trim()) return;
    setHotels((h) => [...h, { name: hotelName.trim(), description: hotelDesc.trim() }]);
    setHotelName('');
    setHotelDesc('');
  }
  function removeHotel(index) {
    setHotels((h) => h.filter((_, i) => i !== index));
  }

  async function handlePost() {
    if (postingRef.current || !draftReady) return;
    const where = place.trim();
    if (!where) {
      alert(t('missingPlaceTitle'), t('missingPlaceMessage'));
      return;
    }
    if (futureTrip) {
      alert(t('journalTripNotStartedTitle'), notYetText(futureTrip));
      return;
    }
    const missingPhotos = journalEntriesMissingPhotos(entries);
    if (missingPhotos.length) {
      setActiveEntryId(missingPhotos[0].id);
      alert(t('journalPhotoRequiredTitle'), t('journalPhotoRequiredMessage'));
      return;
    }
    const withPhoto = entries.filter((e) => e.photoData || e.photoUri);
    if (withPhoto.length === 0) {
      alert(t('chooseAPhotoFirst'));
      return;
    }
    postingRef.current = true;
    setPosting(true);
    // Galing sa draft (photoUri lang): gawing base64 ulit bago ipadala.
    let filledEntries;
    try {
      filledEntries = await Promise.all(withPhoto.map(async (e) => {
        if (e.photoData) return e;
        const img = await manipulateAsync(e.photoUri, [], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
        return { ...e, photoData: `data:image/jpeg;base64,${img.base64}` };
      }));
    } catch (e) {
      postingRef.current = false;
      setPosting(false);
      alert(t('couldntReadPhoto'), e.message);
      return;
    }
    // Isama ang hotel na naka-type pero hindi pa na-"+ add".
    const allHotels = hotelName.trim()
      ? [...hotels, { name: hotelName.trim(), description: hotelDesc.trim() }]
      : hotels;

    // Parehong hugis ng CreateJournalEntryRequest na ipinapadala ng web.
    // Laging "<lugar> Travel Story" ang title para mag-grupo nang tama sa Guides.
    const payload = {
      title: `${where} Travel Story`,
      // Trip's photo first; the first photo added if the trip has none.
      coverImage: tripCover || filledEntries[0].photoData,
      places: filledEntries.map((e, idx) => ({
        placeName: e.placeName.trim() || where,
        imageUrl: e.photoData,
        rating: e.rating,
        description: e.description.trim(),
        sortOrder: idx,
        pros: e.prosInput.trim() ? [...e.pros, e.prosInput.trim()] : e.pros,
        cons: e.consInput.trim() ? [...e.cons, e.consInput.trim()] : e.cons,
        hotels: idx === 0 ? allHotels.map((h) => ({ name: h.name, description: h.description || null })) : [],
      })),
    };

    try {
      const created = await createJournalEntry(payload);
      toast(t('postedBanner'));
      setLeaving(true);
      await AsyncStorage.removeItem(draftKey).catch(() => {});
      setTimeout(() => { if (created?.id) router.replace(`/journal/${created.id}`); else router.back(); }, 0);
    } catch (e) {
      alert(t('journalSaveError'), e.message);
    } finally {
      postingRef.current = false;
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>

      <ScreenHeader title={t('newPost')} onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <View pointerEvents={posting || !draftReady ? 'none' : 'auto'}>
        <Text style={styles.composerTitle}>{t('journalComposerTitle')}</Text>
        <Text style={styles.intro}>{t('journalComposerIntro')}</Text>
        <View style={styles.destinationBlock}>
        {!!draftError && <Text accessibilityRole="alert" style={{ color: Colors.error, marginBottom: 12 }}>{draftError}</Text>}
        <Text style={styles.destinationLabel}>{t('whereWasThisTrip')}</Text>
        <TextInput
          accessibilityLabel={t('whereWasThisTrip')}
          style={styles.destinationInput}
          placeholder={t('egBoracay')}
          placeholderTextColor={Colors.brown600}
          value={place}
          onChangeText={handlePlaceChange}
        />
        {!!futureTrip && <Text accessibilityRole="alert" style={{ color: Colors.error, fontSize: 13, marginTop: 6 }}>{notYetText(futureTrip)}</Text>}

        {placeSuggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }} keyboardShouldPersistTaps="handled">
            {placeSuggestions.map((x) => (
              <TouchableOpacity
                key={x.dest}
                accessibilityRole="button"
                onPress={() => { setPlace(x.dest); void applyTrip(x.id); }}
                style={styles.tripChip}
              >
                <IconLabel name="pin" size={14} textStyle={styles.tripChipText}>{x.dest}</IconLabel>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        </View>
        <View style={styles.placesHeading}><Text style={styles.sectionTitle}>{t('journalYourPlaces')}</Text><Text style={styles.entryCount}>{entries.length}</Text></View>
        {entries.map((entry, index) => {
          const expanded = activeEntryId === null ? index === 0 : activeEntryId === entry.id;
          const reviewOpen = reviewEntries.includes(entry.id);
          return (
            <View key={entry.id} style={styles.entryCard}>
              <TouchableOpacity style={styles.entryHeading} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setActiveEntryId(expanded ? '' : entry.id)}>
                <View style={styles.entryNumber}><Text style={styles.entryNumberText}>{index + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{entry.placeName || `${t('journalPlace')} ${index + 1}`}</Text>
                  <Text style={styles.entrySummary}>{t(entry.photoUri ? 'journalPhotoAdded' : 'journalPhotoNeeded')}</Text>
                </View>
                <AppIcon name={expanded ? 'chevron-down' : 'chevron-right'} size={18} color={Colors.brown600} />
                {entries.length > 1 && (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('remove')} ${t('journalPlace')} ${index + 1}`} onPress={(event) => { event.stopPropagation(); removeEntry(entry.id); }} style={styles.removePageButton}>
                    <AppIcon name="trash" size={18} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {expanded && <View style={styles.entryBody}>
              <TouchableOpacity
                onPress={() => pickPhotoFor(entry.id)}
                activeOpacity={0.85}
                style={styles.photoWrap}
                accessibilityRole="button"
                accessibilityLabel={t(entry.photoUri ? 'changePhoto' : 'tapToAddPhoto')}
              >
                {entry.photoUri ? (
                  <View>
                    <Image source={{ uri: entry.photoUri }} style={styles.photo} />
                    <View style={styles.changePhoto}><IconLabel name="camera" textStyle={styles.changePhotoText}>{t('changePhoto')}</IconLabel></View>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <AppIcon name="camera" style={{ fontSize: 30 }} />
                    <Text style={styles.photoPlaceholderText}>{t('tapToAddPhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.photoHint}>{t(index === 0 && !tripCover ? 'journalCoverHint' : 'journalPhotoHint')}</Text>
              <Text style={styles.fieldLabel}>{t('spotName')}</Text>
              <TextInput
                style={[styles.input, { marginBottom: 18 }]}
                placeholder={place.trim() || t('addAPlace')}
                placeholderTextColor={Colors.brown600}
                value={entry.placeName}
                onChangeText={(text) => updateEntry(entry.id, { placeName: text })}
              />
              {(() => {
                // Places from the trip's itinerary: pick the one this photo is of.
                const usedElsewhere = entries.filter((o) => o.id !== entry.id).map((o) => o.placeName.trim().toLowerCase());
                const choices = tripPlaces.filter((n) => !usedElsewhere.includes(n.toLowerCase()) && n.toLowerCase() !== entry.placeName.trim().toLowerCase());
                if (!choices.length) return null;
                return (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingBottom: 14, marginTop: -8 }}>
                    {choices.map((n) => (
                      <TouchableOpacity key={n} accessibilityRole="button" onPress={() => updateEntry(entry.id, { placeName: n })} style={styles.tripChip}>
                        <IconLabel name="pin" size={14} textStyle={styles.tripChipText}>{n}</IconLabel>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                );
              })()}

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('yourStory')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('writeShortDescription')}
                placeholderTextColor={Colors.brown600}
                value={entry.description}
                onChangeText={(text) => updateEntry(entry.id, { description: text })}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.optionalHeading} accessibilityRole="button" accessibilityState={{ expanded: reviewOpen }} onPress={() => setReviewEntries((current) => reviewOpen ? current.filter((key) => key !== entry.id) : [...current, entry.id])}>
                <IconLabel name="star" textStyle={styles.optionalTitle}>{t('journalAddReview')}</IconLabel>
                <AppIcon name={reviewOpen ? 'chevron-down' : 'plus'} size={18} color={Colors.teal} />
              </TouchableOpacity>
              {reviewOpen && <View style={styles.reviewBody}>
              <Text style={styles.fieldLabel}>{t('rateYourExperience')}</Text>
              <View style={styles.starsRow} accessibilityRole="radiogroup" accessibilityLabel={t('rateYourExperience')}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} style={styles.ratingButton} accessibilityRole="radio" accessibilityState={{ selected: n === entry.rating }} accessibilityLabel={`${n} / 5`} onPress={() => updateEntry(entry.id, { rating: n })}>
                    <AppIcon name="star" size={26} color={n <= entry.rating ? Colors.brown900 : Colors.placeholder} filled={n <= entry.rating} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 24 }]}>{t('pros')}</Text>
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={t('addAProPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  value={entry.prosInput}
                  onChangeText={(text) => updateEntry(entry.id, { prosInput: text })}
                  onSubmitEditing={() => addPro(entry)}
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('addAProPlaceholder')} disabled={!entry.prosInput.trim()} onPress={() => addPro(entry)} style={[styles.addMark, !entry.prosInput.trim() && { opacity: 0.45 }]}>
                  <AppIcon name="plus" style={styles.addMarkText} />
                </TouchableOpacity>
              </View>
              {entry.pros.length > 0 && (
                <View style={styles.chipsWrap}>
                  {entry.pros.map((p, i) => (
                    <TouchableOpacity key={i} onPress={() => removePro(entry, i)} style={styles.chip}>
                      <IconLabel trailing name="x" textStyle={styles.chipText}>{p}</IconLabel>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('cons')}</Text>
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={t('addAConPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  value={entry.consInput}
                  onChangeText={(text) => updateEntry(entry.id, { consInput: text })}
                  onSubmitEditing={() => addCon(entry)}
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('addAConPlaceholder')} disabled={!entry.consInput.trim()} onPress={() => addCon(entry)} style={[styles.addMark, !entry.consInput.trim() && { opacity: 0.45 }]}>
                  <AppIcon name="plus" style={styles.addMarkText} />
                </TouchableOpacity>
              </View>
              {entry.cons.length > 0 && (
                <View style={styles.chipsWrap}>
                  {entry.cons.map((c, i) => (
                    <TouchableOpacity key={i} onPress={() => removeCon(entry, i)} style={styles.chip}>
                      <IconLabel trailing name="x" textStyle={styles.chipText}>{c}</IconLabel>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              </View>}
              </View>}
            </View>
          );
        })}

        <TouchableOpacity accessibilityRole="button" style={styles.addEntryButton} onPress={() => { const entry = makeEmptyEntry(); setEntries((previous) => [...previous, entry]); setActiveEntryId(entry.id); }}>
          <IconLabel name="plus" textStyle={styles.addEntryText}>{t('journalAddPlace')}</IconLabel>
        </TouchableOpacity>

        <View style={styles.hotelCard}>
        <TouchableOpacity style={styles.optionalHeading} accessibilityRole="button" accessibilityState={{ expanded: hotelsOpen }} onPress={() => setHotelsOpen((open) => !open)}>
          <IconLabel name="hotel" textStyle={styles.optionalTitle}>{t('hotelOptions')}{hotels.length > 0 ? ` (${hotels.length})` : ''}</IconLabel>
          <AppIcon name={hotelsOpen ? 'chevron-down' : 'plus'} size={18} color={Colors.teal} />
        </TouchableOpacity>
        {hotelsOpen && <View>
        <Text style={styles.photoHint}>{t('journalHotelsHint')}</Text>
        <Text style={styles.fieldLabel}>{t('hotelName')}</Text>
        <TextInput
          style={styles.hotelInput}
          placeholder={t('hotelName')}
          placeholderTextColor={Colors.brown600}
          value={hotelName}
          onChangeText={setHotelName}
        />
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('shortHotelDescription')}</Text>
        <TextInput
          style={styles.hotelInput}
          placeholder={t('shortHotelDescription')}
          placeholderTextColor={Colors.brown600}
          value={hotelDesc}
          onChangeText={setHotelDesc}
        />
        <TouchableOpacity accessibilityRole="button" disabled={!hotelName.trim()} onPress={addHotel} style={[styles.addHotelLink, !hotelName.trim() && { opacity: 0.45 }]}>
          <IconLabel name="plus" textStyle={styles.addHotelLinkText}>{t('addHotel')}</IconLabel>
        </TouchableOpacity>

        {hotels.map((h, i) => (
          <View key={i} style={styles.hotelEntry}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotelEntryName}>{h.name}</Text>
              {!!h.description && <Text style={styles.hotelEntryDesc}>{h.description}</Text>}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('remove')} ${h.name}`} onPress={() => removeHotel(i)} style={styles.removePageButton}>
              <AppIcon name="trash" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        </View>}
        </View>
        </View>
      </ScrollView>
      <View style={styles.publishBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ busy: posting, disabled: posting || !draftReady }} style={[styles.postButton, (posting || !draftReady) && { opacity: 0.6 }]} onPress={handlePost} disabled={posting || !draftReady} activeOpacity={0.85}>
          {posting ? (
            <ActivityIndicator color={Colors.onButton} />
          ) : (
            <Text style={styles.postButtonText}>{t('postToJournal')}</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  composerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 28, lineHeight: 37, letterSpacing: -0.7, color: Colors.brown900 },
  destinationBlock: { backgroundColor: Colors.cream, borderRadius: 18, padding: 16 },
  tripChip: { maxWidth: 220, minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.white },
  tripChipActive: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  tripChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.brown900 },
  tripChipTextActive: { color: Colors.onButton },
  tripHint: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 19, color: Colors.brown600, marginTop: 8 },
  tripCoverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  tripCoverImage: { width: 64, height: 44, borderRadius: 8, backgroundColor: Colors.cream2 },
  placesHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 4 },
  entryCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.teal, backgroundColor: Colors.cream, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  entryNumber: { width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center' },
  entryNumberText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.mint },
  entrySummary: { fontSize: 12, lineHeight: 19, color: Colors.brown600, marginTop: 2 },
  entryBody: { paddingHorizontal: 16, paddingBottom: 16 },
  optionalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56, paddingVertical: 16 },
  optionalTitle: { fontFamily: 'Poppins_500Medium', fontSize: 14, lineHeight: 22, color: Colors.teal, flex: 1 },
  reviewBody: { paddingTop: 4 },
  intro: { fontSize: 14, lineHeight: 22, color: Colors.brown600, marginTop: 8, marginBottom: 24 },
  destinationLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, lineHeight: 24, color: Colors.brown900, marginBottom: 10 },
  destinationInput: { minHeight: 52, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, lineHeight: 23, color: Colors.brown900, marginBottom: 4 },
  entryCard: { backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden', marginTop: 12 },
  entryHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, minHeight: 76 },
  entryTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 23, color: Colors.brown900 },
  removePageButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  photoWrap: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.line },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoPlaceholder: { width: '100%', height: 168, alignItems: 'center', justifyContent: 'center', gap: 10 },
  photoPlaceholderText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: Colors.brown600 },
  photoHint: { fontSize: 12, lineHeight: 19, color: Colors.brown600, marginTop: 8, marginBottom: 16 },
  changePhoto: { position: 'absolute', bottom: 10, right: 10, backgroundColor: Colors.white, padding: 10, borderRadius: 10 },
  changePhotoText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: Colors.brown900 },
  fieldLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 20, color: Colors.brown600, marginBottom: 8 },
  input: { minWidth: 0, minHeight: 52, fontSize: 14, lineHeight: 22, color: Colors.brown900, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, backgroundColor: Colors.cream, paddingHorizontal: 14, paddingVertical: 14 },
  textArea: { minHeight: 128, textAlignVertical: 'top' },
  starsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  ratingButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addMark: { width: 44, height: 52, borderRadius: 12, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center' },
  addMarkText: { fontSize: 18, color: Colors.onButton },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { minHeight: 44, justifyContent: 'center', backgroundColor: Colors.cream, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  chipText: { fontSize: 12, lineHeight: 20, color: Colors.brown900 },
  addEntryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line, borderRadius: 14, marginTop: 16 },
  addEntryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.teal },
  hotelCard: { backgroundColor: Colors.cream, borderRadius: 16, paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 26, color: Colors.brown900 },
  hotelInput: { minHeight: 52, backgroundColor: Colors.cream, borderRadius: 12, borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, lineHeight: 22, color: Colors.brown900 },
  addHotelLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 12 },
  addHotelLinkText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, lineHeight: 21, color: Colors.teal },
  hotelEntry: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.cream, borderRadius: 12, padding: 14, marginTop: 10, minHeight: 44 },
  hotelEntryName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, lineHeight: 22, color: Colors.brown900 },
  hotelEntryDesc: { fontSize: 12, lineHeight: 19, color: Colors.brown600, marginTop: 4 },
  publishBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.line, paddingHorizontal: 20, paddingVertical: 12 },
  postButton: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: Colors.brown900, borderRadius: 14, minHeight: 52, padding: 14, alignItems: 'center', justifyContent: 'center' },
  postButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.onButton },
});
