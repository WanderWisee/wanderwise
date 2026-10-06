import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { login } from '../services/authService';
import { consumePendingJoin } from '../services/pendingJoin';
import { useApp } from '../context/AppContext';
import Backdrop from '../components/Backdrop';
import { Wordmark } from '../components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { t, signIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('loginErrEmpty'));
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      await signIn();
      // Kung may invite link na binuksan bago mag-login, ituloy ito.
      const joinedTripId = await consumePendingJoin();
      router.replace(joinedTripId ? `/trip/${joinedTripId}` : '/(tabs)/home');
    } catch (e) {
      setError(e.message || t('loginErrFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />

      <View style={styles.header}>
        <Wordmark />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.backButton}
              hitSlop={10}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>{t('loginTitle')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('studentEmailPlaceholder')}
              placeholderTextColor={Colors.brown600}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={t('password')}
                placeholderTextColor={Colors.brown600}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10} style={styles.eye}>
                <Text style={styles.eyeText}>{showPassword ? t('hide') : t('show')}</Text>
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.mint} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('logIn')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={styles.linkText}>{t('forgotPassword')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/signup')}>
                <Text style={styles.linkText}>{t('registerAccount')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: { paddingHorizontal: 24, paddingTop: 10 },
  centerWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 24 },
  card: {
    width: '100%', backgroundColor: Colors.card, borderRadius: 22,
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28,
  },
  backButton: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { fontSize: 20, color: Colors.brown900 },
  cardTitle: {
    fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900,
    textAlign: 'center', marginBottom: 24,
  },
  input: {
    fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900,
    borderBottomWidth: 1, borderBottomColor: Colors.brown900,
    paddingVertical: 8, marginBottom: 20,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 20 },
  eye: { paddingBottom: 9 },
  eyeText: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.brown600 },
  errorText: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12,
  },
  primaryButton: {
    height: 48, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
  linkRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 16,
  },
  linkText: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600 },
});
