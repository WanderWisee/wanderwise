import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Share, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { t, user, refreshUser } = useApp();
  const { confirm, toast } = useDialog();
  const [activeTab, setActiveTab] = useState('trips');
  const [menuOpen, setMenuOpen] = useState(false);

  const [trips, setTrips] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [actionsTrip, setActionsTrip] = useState(null);
  const [inviteTripId, setInviteTripId] = useState(null);

  async function load() {
    refreshUser();
    try {
      const [tripData, journalData] = await Promise.all([fetchTrips(), fetchMyJournal().catch(() => [])]);
      setTrips(tripData);
      setJournal(journalData);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [])
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
        message: `${name} — WanderWise\n${user?.bio || ''}\n${trips.length} ${t('trips')} · ${journal.length} ${t('journalPosts')}`.trim(),
      });
    } catch {
      // kinansela ng user
    }
  }

  const placesVisited = new Set(
    trips.map((tr) => (tr.destination || '').trim().toLowerCase()).filter(Boolean)
  ).size;

  return (
    <LinearGradient colors={['#F6F1DC', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/search')} style={styles.menuButton} accessibilityLabel={t('searchForAStudent')}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuButton} accessibilityLabel={t('menu')}>
            <Text style={{ fontSize: 18 }}>☰</Text>
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
            <Text style={styles.location}>📍 {user?.location || t('locationNotSet')}</Text>

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
                <Text style={styles.editButtonText}>✎ {t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={shareProfile}>
                <Text style={styles.shareButtonText}>⇱ {t('share')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tabRow}>
            <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('trips')}>
              <Text style={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>📍 {capitalize(t('trips'))}</Text>
              {activeTab === 'trips' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('journal')}>
              <Text style={[styles.tabText, activeTab === 'journal' && styles.tabTextActive]}>📖 {t('journal')}</Text>
              {activeTab === 'journal' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'trips' ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('yourTravels')}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => router.push('/new-trip')}>
                    <Text style={styles.addButtonText}>+ {t('addNewPlan')}</Text>
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <Loading />
                ) : error ? (
                  <ErrorState message={error} onRetry={onRefresh} retryLabel={t('tryAgain')} />
                ) : trips.length === 0 ? (
                  <EmptyState icon="🧳" title={t('noTripsYetPlanOne')} />
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
                    <Text style={styles.addButtonText}>+ {t('newPost')}</Text>
                  </TouchableOpacity>
                </View>
                {loading ? (
                  <Loading />
                ) : journal.length === 0 ? (
                  <EmptyState icon="📖" title={t('noJournalPostsYet')} subtitle={t('journalEmptyHint')} />
                ) : (
                  <View style={styles.grid}>
                    {journal.map((j) => (
                      <TouchableOpacity key={j.id} style={styles.gridCard} onPress={() => router.push(`/journal/${j.id}`)} activeOpacity={0.85}>
                        {j.coverImage ? (
                          <Image source={{ uri: j.coverImage }} style={styles.gridImage} />
                        ) : (
                          <View style={[styles.gridImage, { alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ fontSize: 30 }}>📖</Text>
                          </View>
                        )}
                        <Text style={styles.gridTitle} numberOfLines={2}>{j.title || t('untitled')}</Text>
                        <Text style={styles.gridMeta}>📍 {j.entries.length} {t('storyPlacesCount')}</Text>
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
  username: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900, textAlign: 'center' },
  email: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginTop: 2 },
  bio: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 6, textAlign: 'center' },
  location: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 20, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  statLabel: { fontFamily: 'Lora_400Regular', fontSize: 11, color: Colors.brown600, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.line },

  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  editButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  editButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },
  shareButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: 'transparent',
    borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  shareButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },

  divider: { height: 1, backgroundColor: Colors.line, marginBottom: 4 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.line, marginBottom: 20 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600 },
  tabTextActive: { fontFamily: 'Lora_600SemiBold', color: Colors.brown900 },
  tabUnderline: {
    position: 'absolute', bottom: -1, height: 2, width: '55%', backgroundColor: Colors.brown900,
  },

  tabContent: { paddingHorizontal: 2 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10,
  },
  sectionTitle: { flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  addButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, paddingHorizontal: 14, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },
  tripRowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: 8 },
  gridCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.line,
  },
  gridImage: { width: '100%', height: 120, backgroundColor: Colors.cream2 },
  gridTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900, paddingHorizontal: 10, paddingTop: 10 },
  gridMeta: { fontFamily: 'Lora_400Regular', fontSize: 11, color: Colors.brown600, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 10 },
});
