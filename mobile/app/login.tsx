import AppIcon from '../components/AppIcon';
import { Text, TextInput } from '../components/Typography';
import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { login } from '../services/authService';
import { consumePendingJoin } from '../services/pendingJoin';
import { useApp } from '../context/AppContext';
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
      router.replace(joinedTripId === 'retry' ? '/join' : joinedTripId ? `/trip/${joinedTripId}` : '/(tabs)/home');
    } catch (e) {
      const code = e?.data?.code;
      setError(code === 'use_teacher_login' || code === 'use_admin_login' ? t('webOnlyAccount') : e.message || t('loginErrFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>

      <View style={styles.header}>
        <Wordmark />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.backButton}
              hitSlop={10}
            >
              <AppIcon name="arrow-left" style={styles.backText} />
            </TouchableOpacity>

            <Text style={styles.cardTitle}>{t('loginTitle')}</Text>

            <Text style={styles.fieldLabel}>{t('loginIdPlaceholder')}</Text>
            <TextInput
              accessibilityLabel={t('loginIdPlaceholder')}
              style={styles.input}
              placeholder={t('loginIdPlaceholder')}
              placeholderTextColor={Colors.brown600}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
            <Text style={styles.fieldLabel}>{t('password')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                accessibilityLabel={t('password')}
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
                <ActivityIndicator color={Colors.onButton} />
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  centerWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.line },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 20, color: Colors.brown900 },
  cardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 24, lineHeight: 34, letterSpacing: -0.5, color: Colors.brown900, marginBottom: 24 },
  fieldLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 20, color: Colors.brown600, marginBottom: 8 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown900, backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.line, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  eye: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  eyeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.brown600 },
  errorText: {
    fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12,
  },
  primaryButton: { minHeight: 52, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.onButton },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 20 },
  linkText: { fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 20, color: Colors.teal, paddingVertical: 12 },
});
