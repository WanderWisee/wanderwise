import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { extractShareToken } from '../../services/pendingJoin';
import { Field, OutlineButton, PrimaryButton, ScreenHeader } from '../../components/ui';

// I-paste ang invite link na galing sa web o sa ibang phone para sumali sa trip.
export default function JoinWithLinkScreen() {
  const router = useRouter();
  const { t } = useApp();
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  function join(text = link) {
    const token = extractShareToken(text);
    if (!token) {
      setError(t('inviteLinkInvalid'));
      return;
    }
    setError('');
    router.replace(`/join/${token}`);
  }

  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    setLink(text || '');
    if (text) join(text);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('joinWithLink')} onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🔗</Text>
        <Text style={styles.subtitle}>{t('joinWithLinkHint')}</Text>
        <Field
          label={t('inviteLink')}
          value={link}
          onChangeText={setLink}
          placeholder="https://…/trip-plan/join/…"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => join()}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton label={t('joinTripTitle')} onPress={() => join()} />
        <OutlineButton label={t('pasteFromClipboard')} onPress={pasteFromClipboard} style={{ marginTop: 12 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  subtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 13.5, lineHeight: 20, color: Colors.brown600,
    textAlign: 'center', marginBottom: 22,
  },
  error: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12 },
});
