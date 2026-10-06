import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '../constants/theme';
import { AppProvider, useApp } from '../context/AppContext';
import { DialogProvider } from '../context/DialogContext';

SplashScreen.preventAutoHideAsync();

// Mga screen na puwedeng buksan kahit hindi naka-login.
const PUBLIC_ROUTES = ['index', 'login', 'signup', 'forgot-password', 'about', 'join'];
// Sa mga ito, kapag naka-login na, diretso na sa Home.
const AUTH_ONLY_ROUTES = ['index', 'login', 'signup', 'forgot-password'];

function AuthGate() {
  const { ready, isLoggedIn } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const first = (segments[0] as string) || 'index';

    if (!isLoggedIn && !PUBLIC_ROUTES.includes(first)) {
      // Walang token, o nag-expire ito (401) — balik sa Login.
      router.replace('/login');
    } else if (isLoggedIn && AUTH_ONLY_ROUTES.includes(first)) {
      router.replace('/(tabs)/home');
    }
  }, [ready, isLoggedIn, segments, router]);

  // Takpan ang protektadong screen habang inililipat pa sa Login, para
  // hindi ito sumilip. (Kailangang naka-mount ang Stack para gumana ang redirect.)
  const first = (segments[0] as string) || 'index';
  const redirecting = !isLoggedIn && !PUBLIC_ROUTES.includes(first);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {redirecting && <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.cream }]} />}
    </View>
  );
}

function Root() {
  const { ready } = useApp();
  const [fontsLoaded] = useFonts({ Lora_400Regular, Lora_600SemiBold });

  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;
  return <AuthGate />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <DialogProvider>
          <Root />
        </DialogProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
