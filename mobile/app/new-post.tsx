import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { createJournalEntry } from '../services/journalService';
import Backdrop from '../components/Backdrop';
import MeshBlobs from '../components/MeshBlobs';

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
  const { t } = useApp();
  const { alert, toast } = useDialog();
  const [place, setPlace] = useState(String(params.place || ''));
  const [entries, setEntries] = useState([makeEmptyEntry()]);
  const [hotels, setHotels] = useState([]);
  const [hotelName, setHotelName] = useState('');
  const [hotelDesc, setHotelDesc] = useState('');
  const [posting, setPosting] = useState(false);

  function updateEntry(id, changes) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }

  async function pickPhotoFor(id, isLastEntry) {
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

    updateEntry(id, { photoUri: asset.uri, photoData: `data:image/jpeg;base64,${asset.base64}` });

    if (isLastEntry) {
      setEntries((prev) => [...prev, makeEmptyEntry()]);
    }
  }

  function removeEntry(id) {
    setEntries((prev) => (prev.length === 1 ? prev : prev.filter((e) => e.id !== id)));
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
    const where = place.trim();
    if (!where) {
      alert(t('missingPlaceTitle'), t('missingPlaceMessage'));
      return;
    }
    const filledEntries = entries.filter((e) => e.photoData);
    if (filledEntries.length === 0) {
      alert(t('chooseAPhotoFirst'));
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
      coverImage: filledEntries[0].photoData,
      places: filledEntries.map((e, idx) => ({
        placeName: e.placeName.trim() || where,
        imageUrl: e.photoData,
        rating: e.rating,
        description: e.description.trim(),
        sortOrder: idx,
        pros: e.pros,
        cons: e.cons,
        hotels: idx === 0 ? allHotels.map((h) => ({ name: h.name, description: h.description || null })) : [],
      })),
    };

    setPosting(true);
    try {
      const created = await createJournalEntry(payload);
      toast(t('postedBanner'));
      if (created && created.id) router.replace(`/journal/${created.id}`);
      else router.back();
    } catch (e) {
      alert(t('journalSaveError'), e.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <MeshBlobs height={900} style={styles.backdrop} />
      <Backdrop height={220} style={styles.backdrop} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('newJournalEntry')}</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.handLabelOutside}>{t('whereWasThisTrip')}</Text>
        <TextInput
          style={styles.destinationInputOutside}
          placeholder={t('egBoracay')}
          placeholderTextColor={Colors.brown600}
          value={place}
          onChangeText={setPlace}
        />

        {entries.map((entry, index) => {
          const isLastEntry = index === entries.length - 1;
          return (
            <View key={entry.id} style={styles.page}>
              <View style={styles.tape} />

              {entries.length > 1 && (
                <TouchableOpacity onPress={() => removeEntry(entry.id)} style={styles.removePageButton}>
                  <Text style={styles.removePageText}>✕</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => pickPhotoFor(entry.id, isLastEntry)}
                activeOpacity={0.85}
                style={styles.photoWrap}
              >
                {entry.photoUri ? (
                  <Image source={{ uri: entry.photoUri }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={{ fontSize: 30 }}>📷</Text>
                    <Text style={styles.photoPlaceholderText}>{t('tapToAddPhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.handLabel}>{t('spotName')}</Text>
              <TextInput
                style={[styles.lineInput, { marginBottom: 18 }]}
                placeholder={place.trim() || t('addAPlace')}
                placeholderTextColor={Colors.brown600}
                value={entry.placeName}
                onChangeText={(text) => updateEntry(entry.id, { placeName: text })}
              />

              <Text style={styles.handLabel}>{t('rateYourExperience')}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => updateEntry(entry.id, { rating: n })}>
                    <Text style={styles.star}>{n <= entry.rating ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.handLabel, { marginTop: 20 }]}>{t('yourStory')}</Text>
              <TextInput
                style={[styles.lineInput, styles.lineTextArea]}
                                placeholder={t('writeShortDescription')}
                placeholderTextColor={Colors.brown600}
                value={entry.description}
                onChangeText={(text) => updateEntry(entry.id, { description: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.sectionHandLabel, { marginTop: 24 }]}>{t('pros')}</Text>
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.lineInput, { flex: 1 }]}
                  placeholder={t('addAProPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  value={entry.prosInput}
                  onChangeText={(text) => updateEntry(entry.id, { prosInput: text })}
                  onSubmitEditing={() => addPro(entry)}
                />
                <TouchableOpacity onPress={() => addPro(entry)} style={styles.addMark}>
                  <Text style={styles.addMarkText}>+</Text>
                </TouchableOpacity>
              </View>
              {entry.pros.length > 0 && (
                <View style={styles.chipsWrap}>
                  {entry.pros.map((p, i) => (
                    <TouchableOpacity key={i} onPress={() => removePro(entry, i)} style={styles.chip}>
                      <Text style={styles.chipText}>{p} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.sectionHandLabel, { marginTop: 20 }]}>{t('cons')}</Text>
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.lineInput, { flex: 1 }]}
                  placeholder={t('addAConPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  value={entry.consInput}
                  onChangeText={(text) => updateEntry(entry.id, { consInput: text })}
                  onSubmitEditing={() => addCon(entry)}
                />
                <TouchableOpacity onPress={() => addCon(entry)} style={styles.addMark}>
                  <Text style={styles.addMarkText}>+</Text>
                </TouchableOpacity>
              </View>
              {entry.cons.length > 0 && (
                <View style={styles.chipsWrap}>
                  {entry.cons.map((c, i) => (
                    <TouchableOpacity key={i} onPress={() => removeCon(entry, i)} style={styles.chip}>
                      <Text style={styles.chipText}>{c} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text style={[styles.handLabelOutside, { marginTop: 24 }]}>{t('hotelOptions')}</Text>
        <TextInput
          style={styles.lineInputOutside}
          placeholder={t('hotelName')}
          placeholderTextColor={Colors.brown600}
          value={hotelName}
          onChangeText={setHotelName}
        />
        <TextInput
          style={[styles.lineInputOutside, { marginTop: 8 }]}
          placeholder={t('shortHotelDescription')}
          placeholderTextColor={Colors.brown600}
          value={hotelDesc}
          onChangeText={setHotelDesc}
        />
        <TouchableOpacity onPress={addHotel} style={styles.addHotelLink}>
          <Text style={styles.addHotelLinkText}>+ {t('addHotel')}</Text>
        </TouchableOpacity>

        {hotels.map((h, i) => (
          <TouchableOpacity key={i} onPress={() => removeHotel(i)} style={styles.hotelEntry}>
            <Text style={styles.hotelEntryName}>· {h.name}</Text>
            {!!h.description && <Text style={styles.hotelEntryDesc}>{h.description}</Text>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={posting} activeOpacity={0.85}>
          {posting ? (
            <ActivityIndicator color={Colors.mint} />
          ) : (
            <Text style={styles.postButtonText}>{t('postToJournal')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E7DEBC' },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900 },
  content: { paddingHorizontal: 20, paddingBottom: 50 },

  handLabelOutside: {
    fontFamily: 'Lora_400Regular', fontStyle: 'italic', fontSize: 13.5,
    color: Colors.brown600, marginBottom: 6,
  },
  destinationInputOutside: {
    fontFamily: 'Lora_600SemiBold', fontSize: 22, color: Colors.brown900,
    borderBottomWidth: 1, borderBottomColor: Colors.brown900, borderStyle: 'dotted',
    paddingVertical: 6, marginBottom: 8,
  },
  lineInputOutside: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    borderBottomWidth: 1, borderBottomColor: Colors.brown600, borderStyle: 'dotted',
    paddingVertical: 8,
  },

  page: {
    backgroundColor: '#FAF3E3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(200,172,130,0.4)',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    marginTop: 20,
    position: 'relative',
    shadowColor: Colors.brown900,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tape: {
    position: 'absolute',
    top: -10,
    left: '32%',
    width: 70,
    height: 22,
    backgroundColor: 'rgba(200,172,130,0.55)',
    transform: [{ rotate: '-3deg' }],
  },
  removePageButton: {
    position: 'absolute', top: 10, right: 10, zIndex: 2,
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  removePageText: { fontSize: 12, color: Colors.brown900 },

  photoWrap: {
    marginBottom: 20,
    alignSelf: 'center',
    transform: [{ rotate: '-1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 3 },
    elevation: 3,
  },
  photo: { width: 220, height: 160, borderRadius: 3 },
  photoPlaceholder: {
    width: 220, height: 160, borderRadius: 3, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoPlaceholderText: { fontFamily: 'Lora_400Regular', fontSize: 11, color: Colors.brown900 },

  handLabel: {
    fontFamily: 'Lora_400Regular',
    fontStyle: 'italic',
    fontSize: 13.5,
    color: Colors.brown600,
    marginBottom: 6,
  },
  sectionHandLabel: {
    fontFamily: 'Lora_400Regular',
    fontStyle: 'italic',
    fontSize: 14.5,
    color: Colors.brown900,
    marginBottom: 8,
  },
  lineInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    borderBottomWidth: 1, borderBottomColor: Colors.brown600, borderStyle: 'dotted',
    paddingVertical: 6,
  },
  lineTextArea: { minHeight: 80, textAlignVertical: 'top', borderStyle: 'solid', borderWidth: 0, borderBottomWidth: 1 },

  starsRow: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 24, color: Colors.brown900 },

  chipInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  addMark: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  addMarkText: { fontFamily: 'Lora_600SemiBold', fontSize: 16, color: Colors.mint },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    backgroundColor: Colors.cream2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown900 },

  addHotelLink: { marginTop: 8, alignSelf: 'flex-start' },
  addHotelLinkText: {
    fontFamily: 'Lora_400Regular', fontStyle: 'italic', fontSize: 12.5,
    color: Colors.brown600, textDecorationLine: 'underline',
  },
  hotelEntry: { marginTop: 8 },
  hotelEntryName: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.brown900 },
  hotelEntryDesc: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600, marginTop: 2 },

  postButton: {
    backgroundColor: Colors.brown900, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: Colors.brown900, shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  postButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
});