import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { joinTripByToken } from '../../services/tripService';
import { savePendingJoin } from '../../services/pendingJoin';
import Backdrop from '../../components/Backdrop';
import { Loading, OutlineButton, PrimaryButton } from '../../components/ui';

// Binubuksan ng invite link (wanderwise://join/<token>) o ng "Join with
// a link" sa Profile. Kapareho ng JoinTripPage ng web.
export default function JoinTripScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const shareToken = String(token || '');
  const { t, isLoggedIn } = useApp();
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!shareToken) {
      setError(t('inviteLinkInvalid'));
      return;
    }
    if (!isLoggedIn) {
      savePendingJoin(shareToken);
      return;
    }
    joinTripByToken(shareToken)
      .then((data) => {
        if (!alive) return;
        if (data && data.tripId) router.replace(`/trip/${data.tripId}`);
        else setError(t('inviteLinkInvalid'));
      })
      .catch((e) => alive && setError(e.status === 404 ? t('tripNotFoundOrLinkInvalid') : e.message));
    return () => {
      alive = false;
    };
  }, [shareToken, isLoggedIn]);

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={200} style={styles.backdrop} />
      <View style={styles.center}>
        <Text style={{ fontSize: 44 }}>🧳</Text>
        {!isLoggedIn ? (
          <>
            <Text style={styles.title}>{t('joinTripTitle')}</Text>
            <Text style={styles.subtitle}>{t('signUpToJoinBanner')}</Text>
            <PrimaryButton label={t('logIn')} onPress={() => router.replace('/login')} style={styles.button} />
            <OutlineButton label={t('signUp')} onPress={() => router.replace('/signup')} style={styles.button} />
          </>
        ) : error ? (
          <>
            <Text style={styles.title}>{error}</Text>
            <OutlineButton label={t('goHome')} onPress={() => router.replace('/(tabs)/home')} style={styles.button} />
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('joiningTrip')}</Text>
            <Loading style={{ flex: 0 }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  title: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900, textAlign: 'center', marginTop: 16 },
  subtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 14, lineHeight: 21, color: Colors.brown600,
    textAlign: 'center', marginTop: 8, marginBottom: 20,
  },
  button: { alignSelf: 'stretch', marginTop: 12 },
});
