import AppIcon, { IconLabel } from '../../components/AppIcon';
import { Text } from '../../components/Typography';
import { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Image, Share, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { WEB_URL } from '../../constants/config';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';
import MenuSheet from '../../components/MenuSheet';
import TripListItem from '../../components/TripListItem';
import TripActionsSheet from '../../components/TripActionsSheet';
import InviteTripmatesSheet from '../../components/InviteTripmatesSheet';
import { Avatar, EmptyState, ErrorState, Loading } from '../../components/ui';
import { fetchTrips, deleteTrip, leaveTrip } from '../../services/tripService';
import { fetchMyJournal } from '../../services/journalService';
import { fullName } from '../../services/userService';

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, user, refreshUser } = useApp();
  const { confirm, toast } = useDialog();
  const [activeTab, setActiveTab] = useState(params.tab === 'journal' ? 'journal' : 'trips');
  const [menuOpen, setMenuOpen] = useState(false);

  const [trips, setTrips] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [actionsTrip, setActionsTrip] = useState(null);
  const [inviteTripId, setInviteTripId] = useState(null);

  const load = useCallback(async () => {
    refreshUser();
    try {
      const [tripData, journalData] = await Promise.all([fetchTrips(), fetchMyJournal()]);
      setTrips(tripData);
      setJournal(journalData);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      if (params.tab === 'trips' || params.tab === 'journal') setActiveTab(params.tab);
      load().finally(() => setLoading(false));
    }, [params.tab, load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function confirmDelete(trip) {
    const ok = await confirm({
      title: t('deleteTripTitle'),
      message: t('confirmDeleteTrip'),
      confirmLabel: t('dialogDelete'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTrip(trip.id);
      toast(t('tripDeleted'));
      load();
    } catch (e) {
      // 404 = hindi ikaw ang may-ari (crew ka lang) — umalis na lang sa trip.
      if (e.status === 404) {
        const leave = await confirm({
          title: t('leaveTrip'),
          message: t('notOwnerLeaveInstead'),
          confirmLabel: t('leaveTrip'),
          cancelLabel: t('cancel'),
          danger: true,
        });
        if (!leave) return;
        try {
          await leaveTrip(trip.id);
          load();
        } catch (err) {
          toast(err.message || t('leaveTripFailed'));
        }
      } else {
        toast(e.message);
      }
    }
  }

  async function shareProfile() {
    const name = fullName(user, t('student'));
    try {
      await Share.share({
        message: `${WEB_URL}/profile/view/${user?.userId}\n${name} — WanderWise\n${user?.bio || ''}\n${trips.length} ${t('trips')} · ${journal.length} ${t('journalPosts')}`.trim(),
      });
    } catch {
      // kinansela ng user
    }
  }

  const placesVisited = new Set(
    trips.map((tr) => (tr.destination || '').trim().toLowerCase()).filter(Boolean)
  ).size;

  return (
    <LinearGradient colors={['#F7F4EA', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/search')} style={styles.menuButton} accessibilityLabel={t('searchForAStudent')}>
            <AppIcon name="search" style={{ fontSize: 15 }} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuButton} accessibilityLabel={t('menu')}>
            <AppIcon name="menu" style={{ fontSize: 18 }} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.identitySection}>
            <Avatar person={user} size={88} style={{ marginBottom: 12 }} />

            <Text style={styles.username}>{user ? fullName(user, t('student')) : ' '}</Text>
            {!!user?.email && <Text style={styles.email}>{user.email}</Text>}
            <Text style={styles.bio}>{user?.bio || t('noBioYet')}</Text>
            <IconLabel name="pin" textStyle={styles.location}>{user?.location || t('locationNotSet')}</IconLabel>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{trips.length}</Text>
                <Text style={styles.statLabel}>{t('trips')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{journal.length}</Text>
                <Text style={styles.statLabel}>{t('journalPosts')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{placesVisited}</Text>
                <Text style={styles.statLabel}>{t('placesVisited')}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editButton} onPress={() => router.push('/settings/account')}>
                <IconLabel name="pencil" textStyle={styles.editButtonText}>{t('edit')}</IconLabel>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={shareProfile}>
                <IconLabel name="external" textStyle={styles.shareButtonText}>{t('share')}</IconLabel>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tabRow}>
            <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('trips')}>
              <IconLabel name="pin" textStyle={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>{capitalize(t('trips'))}</IconLabel>
              {activeTab === 'trips' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('journal')}>
              <IconLabel name="book" textStyle={[styles.tabText, activeTab === 'journal' && styles.tabTextActive]}>{t('journal')}</IconLabel>
              {activeTab === 'journal' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'trips' ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('yourTravels')}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-trip')}>
                    <IconLabel name="plus" textStyle={styles.addButtonText}>{t('addNewPlan')}</IconLabel>
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <Loading />
                ) : error ? (
                  <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
                ) : trips.length === 0 ? (
                  <EmptyState icon="suitcase" title={t('noTripsYetPlanOne')} />
                ) : (
                  trips.map((trip, index) => (
                    <View key={trip.id} style={index !== trips.length - 1 ? styles.tripRowDivider : null}>
                      <TripListItem
                        trip={trip}
                        onPress={() => router.push(`/trip/${trip.id}`)}
                        onShare={() => setInviteTripId(trip.id)}
                        onMenu={() => setActionsTrip(trip)}
                      />
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('yourTravelStories')}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-post')}>
                    <IconLabel name="plus" textStyle={styles.addButtonText}>{t('newPost')}</IconLabel>
                  </TouchableOpacity>
                </View>
                {loading ? (
                  <Loading />
                ) : error ? (
                  <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
                ) : journal.length === 0 ? (
                  <EmptyState icon="book" title={t('noJournalPostsYet')} subtitle={t('journalEmptyHint')} />
                ) : (
                  <View style={styles.grid}>
                    {journal.map((j) => (
                      <TouchableOpacity key={j.id} style={styles.gridCard} onPress={() => router.push(`/journal/${j.id}`)} activeOpacity={0.85}>
                        {j.coverImage ? (
                          <Image source={{ uri: j.coverImage }} style={styles.gridImage} />
                        ) : (
                          <View style={[styles.gridImage, { alignItems: 'center', justifyContent: 'center' }]}>
                            <AppIcon name="book" style={{ fontSize: 30 }} />
                          </View>
                        )}
                        <Text style={styles.gridTitle} numberOfLines={2}>{j.title || t('untitled')}</Text>
                        <IconLabel name="pin" textStyle={styles.gridMeta}>{j.entries.length} {t('storyPlacesCount')}</IconLabel>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />

        <TripActionsSheet
          visible={!!actionsTrip}
          onClose={() => setActionsTrip(null)}
          onShare={() => setInviteTripId(actionsTrip?.id)}
          onEdit={() => router.push(`/trip/${actionsTrip?.id}`)}
          onDelete={() => actionsTrip && confirmDelete(actionsTrip)}
        />

        <InviteTripmatesSheet
          visible={!!inviteTripId}
          onClose={() => setInviteTripId(null)}
          tripId={inviteTripId}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  menuButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },

  identitySection: { alignItems: 'center', marginBottom: 24 },
  username: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: Colors.brown900, textAlign: 'center' },
  email: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600, marginTop: 2 },
  bio: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 6, textAlign: 'center' },
  location: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 20, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: Colors.brown900 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.brown600, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.line },

  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  editButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  editButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.mint },
  shareButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: 'transparent',
    borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  shareButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.brown900 },

  divider: { height: 1, backgroundColor: Colors.line, marginBottom: 4 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.line, marginBottom: 20 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown600 },
  tabTextActive: { fontFamily: 'Poppins_600SemiBold', color: Colors.brown900 },
  tabUnderline: {
    position: 'absolute', bottom: -1, height: 2, width: '55%', backgroundColor: Colors.brown900,
  },

  tabContent: { paddingHorizontal: 2 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10,
  },
  sectionTitle: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 19, color: Colors.brown900 },
  addButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, paddingHorizontal: 14, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: Colors.mint },
  tripRowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: 8 },
  gridCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.line,
  },
  gridImage: { width: '100%', height: 120, backgroundColor: Colors.cream2 },
  gridTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.brown900, paddingHorizontal: 10, paddingTop: 10 },
  gridMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.brown600, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 10 },
});
