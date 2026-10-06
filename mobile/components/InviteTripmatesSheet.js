import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, Share, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/theme';
import { WEB_URL } from '../constants/config';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import { addCrewMember, fetchCrew, getShareToken, leaveTrip, removeCrewMember } from '../services/tripService';
import { fullName, searchUsers } from '../services/userService';
import { Avatar } from './ui';

// Parehong InviteCrewPage ng web:
//  - totoong invite link (POST /api/trips/:id/share-link) — parehong link ng web
//  - hanapin at idagdag ang kapwa estudyante bilang crew
//  - listahan ng crew; ang may-ari lang ang puwedeng mag-alis
export default function InviteTripmatesSheet({ visible, onClose, tripId, onChanged = null, onLeft = null }) {
  const { t, user } = useApp();
  const { confirm, toast } = useDialog();
  const [shareToken, setShareToken] = useState(null);
  const [linkError, setLinkError] = useState(false);
  const [crew, setCrew] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const shareLink = shareToken ? `${WEB_URL}/trip-plan/join/${shareToken}` : '';
  const isOwner = crew.some((m) => m.isOwner && user && m.userId === user.userId);

  async function loadCrew() {
    try {
      setCrew(await fetchCrew(tripId));
    } catch {
      setCrew([]);
    }
  }

  useEffect(() => {
    if (!visible || !tripId) return;
    setShareToken(null);
    setLinkError(false);
    setQuery('');
    setResults([]);
    getShareToken(tripId).then(setShareToken).catch(() => setLinkError(true));
    loadCrew();
  }, [visible, tripId]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(() => {
      searchUsers(term)
        .then((data) => alive && setResults(data))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setSearching(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  async function copyLink() {
    if (!shareLink) return;
    await Clipboard.setStringAsync(shareLink);
    toast(t('linkCopied'));
  }

  async function shareVia() {
    if (!shareLink) return;
    try {
      await Share.share({ message: `${t('joinMyTripMessage')}\n${shareLink}` });
    } catch {
      // kinansela
    }
  }

  async function add(person) {
    setBusyId(person.id);
    try {
      await addCrewMember(tripId, person.id);
      toast(`${fullName(person)} ${t('addedToTrip')}`);
      setQuery('');
      setResults([]);
      await loadCrew();
      onChanged && onChanged();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(member) {
    const ok = await confirm({
      title: t('removeCrewMemberTitle'),
      message: `${t('confirmRemoveCrewMember')} ${fullName(member)}`,
      confirmLabel: t('remove'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await removeCrewMember(tripId, member.id);
      await loadCrew();
      onChanged && onChanged();
    } catch (e) {
      toast(e.message);
    }
  }

  async function leave() {
    const ok = await confirm({
      title: t('leaveTrip'),
      message: t('confirmLeaveTrip'),
      confirmLabel: t('leaveTrip'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await leaveTrip(tripId);
      onClose();
      onLeft && onLeft();
    } catch (e) {
      toast(e.message || t('leaveTripFailed'));
    }
  }

  const crewIds = new Set(crew.map((m) => m.userId));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t('inviteYourCrew')}</Text>

            <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
              {/* Invite link */}
              <Text style={styles.label}>{t('inviteLinkLabel')}</Text>
              <View style={styles.linkBox}>
                {shareLink ? (
                  <Text style={styles.linkText} numberOfLines={1}>{shareLink}</Text>
                ) : linkError ? (
                  <Text style={styles.linkText}>{t('linkUnavailable')}</Text>
                ) : (
                  <ActivityIndicator size="small" color={Colors.brown600} />
                )}
              </View>

              <View style={styles.shareRow}>
                <TouchableOpacity style={styles.shareItem} onPress={copyLink} disabled={!shareLink}>
                  <View style={styles.shareIconBadge}><Text style={{ fontSize: 18 }}>🔗</Text></View>
                  <Text style={styles.shareLabel}>{t('copy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareItem} onPress={shareVia} disabled={!shareLink}>
                  <View style={styles.shareIconBadge}><Text style={{ fontSize: 18 }}>💬</Text></View>
                  <Text style={styles.shareLabel}>{t('sendViaApps')}</Text>
                </TouchableOpacity>
              </View>

              {/* Search */}
              <Text style={styles.label}>{t('searchForAStudent')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('searchByName')}
                placeholderTextColor={Colors.placeholder}
                value={query}
                onChangeText={setQuery}
              />
              {searching && <ActivityIndicator size="small" color={Colors.brown600} style={{ marginBottom: 10 }} />}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <Text style={styles.muted}>{t('noStudentsFound')}</Text>
              )}
              {results.map((p) => {
                const already = crewIds.has(p.id);
                return (
                  <View key={p.id} style={styles.personRow}>
                    <Avatar person={p} size={34} />
                    <Text style={styles.personName} numberOfLines={1}>{fullName(p)}</Text>
                    <TouchableOpacity
                      style={[styles.smallButton, already && { opacity: 0.5 }]}
                      onPress={() => add(p)}
                      disabled={already || busyId === p.id}
                    >
                      {busyId === p.id ? (
                        <ActivityIndicator size="small" color={Colors.mint} />
                      ) : (
                        <Text style={styles.smallButtonText}>{already ? '✓' : t('add')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Crew */}
              <Text style={[styles.label, { marginTop: 18 }]}>{t('crewOnThisTrip')}</Text>
              {crew.length <= 1 && <Text style={styles.muted}>{t('noCrewYet')}</Text>}
              {crew.map((m) => (
                <View key={`${m.isOwner ? 'owner' : m.id}`} style={styles.personRow}>
                  <Avatar person={m} size={34} />
                  <Text style={styles.personName} numberOfLines={1}>
                    {fullName(m)}
                    {m.isOwner ? `  · ${t('tripOwner')}` : ''}
                    {user && m.userId === user.userId ? `  (${t('historyYouTag')})` : ''}
                  </Text>
                  {isOwner && !m.isOwner && (
                    <TouchableOpacity onPress={() => remove(m)} hitSlop={8}>
                      <Text style={styles.removeText}>{t('remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {!isOwner && crew.length > 0 && (
                <TouchableOpacity style={styles.leaveRow} onPress={leave}>
                  <Text style={styles.leaveText}>🚪 {t('leaveTrip')}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(46,27,14,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900, textAlign: 'center', marginBottom: 14 },
  label: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900, marginBottom: 8 },
  muted: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600, marginBottom: 8 },
  linkBox: {
    backgroundColor: Colors.cream2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: Colors.line, marginBottom: 14, minHeight: 46, justifyContent: 'center',
  },
  linkText: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown900 },
  shareRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 18 },
  shareItem: { alignItems: 'center', gap: 6 },
  shareIconBadge: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },
  shareLabel: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  input: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.line, marginBottom: 10,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  personName: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900 },
  smallButton: {
    minWidth: 58, height: 32, borderRadius: 10, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  smallButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },
  removeText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.error },
  leaveRow: { borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 16, marginTop: 12 },
  leaveText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.error },
});
