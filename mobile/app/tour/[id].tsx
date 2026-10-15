import { IconLabel } from '../../components/AppIcon';
import { Text } from '../../components/Typography';
import { useCallback, useRef, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { fetchTripById } from '../../services/tripService';
import { checkIn, createActivity, deleteActivity, deleteAnnouncement, fetchTourDay, markAttendance, postAnnouncement, saveMeetingPoint } from '../../services/studentService';
import { fullName } from '../../services/userService';
import StudentScreen, { StudentCard, studentStyles as styles } from '../../components/StudentScreen';
import { Avatar, EmptyState, ErrorState, Field, Loading, OutlineButton, PrimaryButton } from '../../components/ui';
import OsmMap from '../../components/OsmMap';
import TimePickerSheet from '../../components/TimePickerSheet';
import { Colors } from '../../constants/theme';
import { partsToISO } from '../../utils/dates';

function tripDays(trip: any) {
  if (!trip?.startDate || !trip?.endDate) return [];
  const cursor = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T00:00:00`);
  const days: string[] = [];
  while (cursor <= end && days.length < 60) {
    days.push(partsToISO({ year: cursor.getFullYear(), month: cursor.getMonth(), day: cursor.getDate() }));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function TourScreen() {
  const { id, date: requestedDate } = useLocalSearchParams();
  const { t, formatDate, formatTime, timeAgo } = useApp();
  const { confirm, toast } = useDialog();
  const [trip, setTrip] = useState<any>(null);
  const [date, setDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [permissionError, setPermissionError] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [radius, setRadius] = useState('200');
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState({ title: '', placeName: '', notes: '', time: '' });
  const [timeOpen, setTimeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);
  const load = useCallback(async (selected?: string) => {
    const ticket = ++requestRef.current;
    setLoading(true);
    try {
      const detail = await fetchTripById(id);
      const available = tripDays(detail);
      const today = partsToISO({ year: new Date().getFullYear(), month: new Date().getMonth(), day: new Date().getDate() });
      const next = selected || (available.includes(String(requestedDate)) ? String(requestedDate) : available.includes(today) ? today : available[0]);
      const result = next ? await fetchTourDay(id, next) : null;
      if (ticket !== requestRef.current) return;
      setTrip(detail); setDate(next || ''); setData(result); setError('');
      setMeetingName(result?.meetingPoint?.name || ''); setRadius(String(result?.meetingPoint?.radiusMeters || 200));
    } catch (e: any) { if (ticket === requestRef.current) setError(e.message); }
    finally { if (ticket === requestRef.current) { setLoading(false); setRefreshing(false); } }
  }, [id, requestedDate]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestRef.current += 1; }; }, [load]));

  async function run(action: () => Promise<any>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setActionError(''); setPermissionError(false);
    try { await action(); await load(date); }
    catch (e: any) {
      const code = e.data?.error;
      setActionError(code === 'outside_geofence'
        ? `${t('meetingPoint')}: ${e.data.distanceMeters} m / ${e.data.radiusMeters} m. ${t('checkInHint')}`
        : e.message);
    } finally { busyRef.current = false; setBusy(false); }
  }
  async function position() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) { setPermissionError(true); throw new Error(t('locationNeeded')); }
    return (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords;
  }
  async function takeCheckIn() {
    if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) { setPermissionError(true); throw new Error(t('cameraNeeded')); }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const photo = await manipulateAsync(asset.uri, [{ resize: asset.width > asset.height ? { width: 1024 } : { height: 1024 } }], { compress: 0.65, format: SaveFormat.JPEG, base64: true });
    if (!photo.base64) throw new Error(t('couldntReadPhoto'));
    const coords = await position();
    await checkIn(id, { date, latitude: coords.latitude, longitude: coords.longitude, photo: `data:image/jpeg;base64,${photo.base64}` });
    toast(t('checkedIn'));
  }
  async function remove(kind: 'activity' | 'announcement', item: number) {
    if (!(await confirm({ title: t('deleteItem'), confirmLabel: t('dialogDelete'), cancelLabel: t('cancel'), danger: true }))) return;
    await run(() => kind === 'activity' ? deleteActivity(id, item) : deleteAnnouncement(id, item));
  }
  const meeting = data?.meetingPoint;
  const canManage = !!data?.canManage;
  const days = tripDays(trip);
  const myAttendance = data?.roster?.find((person: any) => person.isMe);
  return (
    <StudentScreen title={t('tourDay')} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(date); }} />}>
      {!!trip && <Text style={styles.title}>{trip.destination}</Text>}
      {error ? <ErrorState message={error} onRetry={() => load(date)} retryLabel={t('tryAgain')} /> : <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((day) => <TouchableOpacity key={day} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: date === day }} onPress={() => { setData(null); void load(day); }} style={{ backgroundColor: day === date ? Colors.brown900 : Colors.cream2, padding: 12, borderRadius: 16 }}>
            <Text style={[styles.text, { color: day === date ? Colors.mint : Colors.brown900 }]}>{formatDate(day, 'short')}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        {loading ? <Loading /> : !days.length ? <EmptyState icon="calendar" title={t('noTripDates')} /> : data && <>
          {!!actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
          <StudentCard title={t('meetingPoint')}>
            {meeting?.latitude != null ? <>
              <Text style={styles.text}>{meeting.name} · {meeting.radiusMeters} m</Text>
              <OsmMap markers={[{ ...meeting, label: meeting.name }]} height={180} />
              <Text style={styles.text}>{t('checkInHint')}</Text>
              {myAttendance?.checkedInAt && <IconLabel name="check" textStyle={styles.text}>{t('checkedIn')} · {timeAgo(myAttendance.checkedInAt)}</IconLabel>}
              {data.canCheckIn && <PrimaryButton label={t('checkInNow')} loading={busy} onPress={() => run(takeCheckIn)} />}
            </> : <Text style={styles.text}>{t('meetingMissing')}</Text>}
            {canManage && <>
              <Field label={t('meetingName')} value={meetingName} onChangeText={setMeetingName} maxLength={200} />
              <Field label={t('radiusMeters')} value={radius} onChangeText={setRadius} keyboardType="number-pad" />
              <OutlineButton label={t('useMyLocation')} disabled={busy || !meetingName.trim() || !Number.isFinite(Number(radius)) || Number(radius) < 20 || Number(radius) > 5000} onPress={() => run(async () => {
                const coords = await position();
                await saveMeetingPoint(id, { date, meetingPlaceName: meetingName.trim(), latitude: coords.latitude, longitude: coords.longitude, radiusMeters: Number(radius) });
              })} />
              <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                {(trip.sections || []).flatMap((section: any) => section.places || []).filter((place: any) => place.latitude != null && place.longitude != null).map((place: any, index: number) => <OutlineButton key={`${place.id}-${index}`} small label={place.name} disabled={busy || !Number.isFinite(Number(radius)) || Number(radius) < 20 || Number(radius) > 5000} onPress={() => run(() => saveMeetingPoint(id, { date, meetingPlaceName: place.name, latitude: place.latitude, longitude: place.longitude, radiusMeters: Number(radius) }))} />)}
              </ScrollView>
            </>}
          </StudentCard>
          <StudentCard title={t('attendance')}>
            {(data.roster || []).map((person: any) => <View key={person.userId} style={{ gap: 8 }}>
              <View style={styles.row}><Avatar person={person} size={36} /><View style={{ flex: 1 }}><Text style={styles.text}>{fullName(person)}</Text><Text style={styles.text}>{person.present ? t('present') : t('absent')}</Text></View>
                {canManage && <Switch accessibilityLabel={`${t('attendance')}: ${fullName(person)}`} value={person.present} disabled={busy} trackColor={{ true: Colors.brown900 }} onValueChange={(present) => run(() => markAttendance(id, { date, userId: person.userId, present }))} />}
              </View>
              {!!person.photo && <Image source={{ uri: person.photo }} accessibilityLabel={t('checkedIn')} style={{ height: 140, borderRadius: 12 }} />}
            </View>)}
          </StudentCard>
          <StudentCard title={t('activities')}>
            {!data.activities.length && <Text style={styles.text}>{t('noActivities')}</Text>}
            {data.activities.map((item: any) => <View key={item.id} style={{ gap: 6 }}>
              <Text style={styles.title}>{item.title}</Text><Text style={styles.text}>{[formatTime(item.time), item.placeName, item.notes].filter(Boolean).join(' · ')}</Text>
              {canManage && <OutlineButton small danger label={t('dialogDelete')} disabled={busy} onPress={() => remove('activity', item.id)} />}
            </View>)}
            {canManage && <>
              <Field label={t('activityTitle')} value={activity.title} onChangeText={(title: string) => setActivity({ ...activity, title })} maxLength={200} />
              <Field label={t('activityPlace')} value={activity.placeName} onChangeText={(placeName: string) => setActivity({ ...activity, placeName })} maxLength={200} />
              <Field label={t('activityNotes')} value={activity.notes} onChangeText={(notes: string) => setActivity({ ...activity, notes })} multiline maxLength={1000} />
              <OutlineButton label={activity.time ? formatTime(activity.time) : t('activityTime')} disabled={busy} onPress={() => setTimeOpen(true)} />
              <PrimaryButton label={t('add')} loading={busy} disabled={!activity.title.trim()} onPress={() => run(async () => { await createActivity(id, { ...activity, title: activity.title.trim(), time: activity.time || null, date }); setActivity({ title: '', notes: '', placeName: '', time: '' }); })} />
            </>}
          </StudentCard>
          <StudentCard title={t('announcements')}>
            {canManage && <><Field label={t('announcementMessage')} multiline value={message} onChangeText={setMessage} maxLength={1000} /><PrimaryButton label={t('add')} loading={busy} disabled={!message.trim()} onPress={() => run(async () => { await postAnnouncement(id, message.trim()); setMessage(''); })} /></>}
            {!data.announcements.length && <Text style={styles.text}>{t('noAnnouncements')}</Text>}
            {data.announcements.map((item: any) => <View key={item.id} style={{ gap: 8 }}><Text style={styles.text}>{item.message}</Text><Text style={styles.text}>{item.authorName} · {timeAgo(item.createdAt)}</Text>{canManage && <OutlineButton small danger disabled={busy} label={t('dialogDelete')} onPress={() => remove('announcement', item.id)} />}</View>)}
          </StudentCard>
          {permissionError && <OutlineButton label={t('settingsTitle')} onPress={() => Linking.openSettings()} />}
        </>}
      </>}
      <TimePickerSheet visible={timeOpen} initial={activity.time} onClose={() => setTimeOpen(false)} onSave={(time: string) => { setActivity({ ...activity, time }); setTimeOpen(false); }} />
    </StudentScreen>
  );
}
