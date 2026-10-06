import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { fullName, updateAvatar, updateProfile } from '../../services/userService';
import { Avatar, Field, PrimaryButton, ScreenHeader } from '../../components/ui';

// Parehong Settings → Account ng web. Ang pangalan at email ay galing sa
// registration at hindi pa nababago sa backend, kaya naka-lock dito;
// ang larawan, bio at location ay nase-save sa account.
export default function AccountScreen() {
  const router = useRouter();
  const { t, user, setUser, refreshUser } = useApp();
  const { toast, alert } = useDialog();
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Kapag dumating ang /api/me pagkatapos magbukas ang screen.
  useEffect(() => {
    setBio(user?.bio || '');
    setLocation(user?.location || '');
  }, [user?.userId]);

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
              {uploading ? <ActivityIndicator size="small" color={Colors.brown900} /> : <Text style={{ fontSize: 12 }}>✎</Text>}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },
  avatarWrap: { marginBottom: 8 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  changePhoto: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600, marginBottom: 22 },
  field: { alignSelf: 'stretch' },
});
