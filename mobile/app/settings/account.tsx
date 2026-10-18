import AppIcon from '../../components/AppIcon';
import { Text } from '../../components/Typography';
import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { deleteMyAccount, fullName, updateAvatar, updateProfile } from '../../services/userService';
import { Avatar, Field, OutlineButton, PrimaryButton, ScreenHeader } from '../../components/ui';

// Parehong Settings → Account ng web. Ang pangalan at email ay galing sa
// registration at hindi pa nababago sa backend, kaya naka-lock dito;
// ang larawan, bio at location ay nase-save sa account.
export default function AccountScreen() {
  const { user } = useApp();
  return <AccountContent key={user?.userId || 'loading'} />;
}

function AccountContent() {
  const router = useRouter();
  const { t, user, setUser, refreshUser, signOut } = useApp();
  const { toast, alert, confirm } = useDialog();
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deletePassword) { alert(t('deleteAccountNeedPassword')); return; }
    const ok = await confirm({ title: t('deleteAccountTitle'), message: t('deleteAccountConfirm'), confirmLabel: t('deleteAccountBtn'), cancelLabel: t('cancel'), danger: true });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMyAccount(deletePassword);
      await signOut();
      toast(t('deleteAccountDone'));
      router.replace('/');
    } catch (e) {
      alert(t('deleteAccountFailed'), e.message);
    } finally {
      setDeleting(false);
    }
  }
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert(t('photoPermissionTitle'), t('photoPermissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setUploading(true);
    try {
      await updateAvatar(dataUrl);
      setUser((u) => ({ ...u, avatarUrl: dataUrl }));
      toast(t('photoUpdated'));
    } catch (e) {
      alert(t('saveFailed'), e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await updateProfile({ bio: bio.trim(), location: location.trim() });
      setUser((u) => ({ ...u, bio: saved?.bio ?? bio.trim(), location: saved?.location ?? location.trim() }));
      toast(t('settingSaved'));
      refreshUser();
    } catch (e) {
      alert(t('saveFailed'), e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('settingsAccount')} onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} disabled={uploading} activeOpacity={0.8}>
            <Avatar person={user} size={100} />
            <View style={styles.avatarEditBadge}>
              {uploading ? <ActivityIndicator size="small" color={Colors.brown900} /> : <AppIcon name="pencil" style={{ fontSize: 12 }} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhoto}>{t('changePhoto')}</Text>

          <Field label={t('accountName')} value={fullName(user)} editable={false} hint={t('nameLockedHint')} style={styles.field} />
          <Field label={t('accountEmail')} value={user?.email || ''} editable={false} style={styles.field} />
          <Field
            label={t('accountBio')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('bioPlaceholder')}
            multiline
            numberOfLines={3}
            maxLength={300}
            inputStyle={{ minHeight: 84, textAlignVertical: 'top' }}
            style={styles.field}
          />
          <Field
            label={t('accountLocation')}
            value={location}
            onChangeText={setLocation}
            placeholder={t('locationPlaceholder')}
            maxLength={150}
            style={styles.field}
          />

          <PrimaryButton label={t('save')} onPress={handleSave} loading={saving} style={{ alignSelf: 'stretch', marginTop: 8 }} />

          {/* Burahin ang account (Data Privacy Act) */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>{t('deleteAccountTitle')}</Text>
            <Text style={styles.dangerHint}>{t('deleteAccountHint')}</Text>
            <Field
              label={t('deleteAccountPassword')}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <OutlineButton danger label={deleting ? t('saving') : t('deleteAccountBtn')} onPress={handleDelete} disabled={deleting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dangerZone: { alignSelf: 'stretch', marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: Colors.line },
  dangerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.error, marginBottom: 6 },
  dangerHint: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: Colors.brown600, marginBottom: 14 },
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center' },
  avatarWrap: { marginBottom: 8 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  changePhoto: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: Colors.brown600, marginBottom: 22 },
  field: { alignSelf: 'stretch' },
});
