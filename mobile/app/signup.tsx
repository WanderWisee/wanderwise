import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { register, sendRegisterOtp, SCHOOL_EMAIL_REGEX } from '../services/authService';
import { consumePendingJoin } from '../services/pendingJoin';
import { useApp } from '../context/AppContext';
import Backdrop from '../components/Backdrop';
import { Wordmark } from '../components/ui';

// Parehong daloy ng web: (1) punan ang form → magpapadala ng 6-digit code
// sa personal/recovery email → (2) ilagay ang code → gagawin ang account.

// "01172004" -> "01/17/2004" habang nagta-type
function formatDobInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDob(dob) {
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day &&
    year > 1900 && d < new Date()
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const { t, signIn } = useApp();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    schoolEmail: '',
    recoveryEmail: '',
    dob: '',
    cellphone: '',
    password: '',
    confirmPassword: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  function validate() {
    const f = form;
    if (!f.firstName.trim() || !f.lastName.trim() || !f.schoolEmail.trim() || !f.recoveryEmail.trim() ||
        !f.dob || !f.cellphone.trim() || !f.password || !f.confirmPassword) {
      return t('registerErrFillAll');
    }
    if (!SCHOOL_EMAIL_REGEX.test(f.schoolEmail.trim())) return t('registerErrSchoolEmail');
    if (!/^\S+@\S+\.\S+$/.test(f.recoveryEmail.trim())) return t('registerErrRecoveryEmail');
    if (!isValidDob(f.dob)) return t('registerErrDob');
    if (f.password.length < 8) return t('registerErrPasswordLength');
    if (f.password !== f.confirmPassword) return t('registerErrPasswordMismatch');
    return null;
  }

  async function handleSendCode() {
    setError(null);
    setInfo(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    try {
      await sendRegisterOtp({ schoolEmail: form.schoolEmail, recoveryEmail: form.recoveryEmail });
      setStep('otp');
      setInfo(`${t('otpSentTo')} ${form.recoveryEmail.trim()}`);
    } catch (e) {
      setError(e.message || t('registerErrSendOtp'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError(t('otpErrEmpty'));
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, otpCode });
      await signIn();
      const joinedTripId = await consumePendingJoin();
      router.replace(joinedTripId ? `/trip/${joinedTripId}` : '/(tabs)/home');
    } catch (e) {
      setError(e.message || t('otpErrVerifyFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      await sendRegisterOtp({ schoolEmail: form.schoolEmail, recoveryEmail: form.recoveryEmail });
      setInfo(t('otpResendRecoverySuccess'));
    } catch (e) {
      setError(e.message || t('otpErrResendFailed'));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (step === 'otp') {
      setStep('form');
      setError(null);
      setInfo(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
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
            <TouchableOpacity onPress={goBack} style={styles.backButton} hitSlop={10}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>

            {step === 'form' ? (
              <>
                <Text style={styles.cardTitle}>{t('registerTitle')}</Text>

                <View style={styles.nameRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, minWidth: 0 }]}
                    placeholder={t('firstName')}
                    placeholderTextColor={Colors.brown600}
                    value={form.firstName}
                    onChangeText={set('firstName')}
                    autoComplete="given-name"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, minWidth: 0 }]}
                    placeholder={t('lastName')}
                    placeholderTextColor={Colors.brown600}
                    value={form.lastName}
                    onChangeText={set('lastName')}
                    autoComplete="family-name"
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('studentEmailPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={form.schoolEmail}
                  onChangeText={set('schoolEmail')}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('recoveryEmailPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={form.recoveryEmail}
                  onChangeText={set('recoveryEmail')}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('dobPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  keyboardType="number-pad"
                  value={form.dob}
                  onChangeText={(text) => set('dob')(formatDobInput(text))}
                  maxLength={10}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('cellphoneNumber')}
                  placeholderTextColor={Colors.brown600}
                  keyboardType="phone-pad"
                  value={form.cellphone}
                  onChangeText={set('cellphone')}
                  maxLength={15}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('createPasswordLabel')}
                  placeholderTextColor={Colors.brown600}
                  secureTextEntry
                  value={form.password}
                  onChangeText={set('password')}
                  textContentType="newPassword"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('confirmPassword')}
                  placeholderTextColor={Colors.brown600}
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={set('confirmPassword')}
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity style={styles.primaryButton} onPress={handleSendCode} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={Colors.mint} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('register')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace('/login')} style={{ marginTop: 16, alignSelf: 'center' }}>
                  <Text style={styles.linkText}>{t('alreadyHaveAccount')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>{t('verifyEmailTitle')}</Text>
                {info && <Text style={styles.infoText}>{info}</Text>}

                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="••••••"
                  placeholderTextColor={Colors.brown600}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={(v) => setOtpCode(v.replace(/\D/g, ''))}
                  autoFocus
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={Colors.mint} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('verifyAndCreate')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResend} disabled={loading} style={{ marginTop: 16, alignSelf: 'center' }}>
                  <Text style={styles.linkText}>{t('resendCode')}</Text>
                </TouchableOpacity>
              </>
            )}
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
  nameRow: { flexDirection: 'row', gap: 14 },
  input: {
    fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900,
    borderBottomWidth: 1, borderBottomColor: Colors.brown900,
    paddingVertical: 8, marginBottom: 18,
  },
  otpInput: { fontSize: 26, letterSpacing: 10, textAlign: 'center', fontFamily: 'Lora_600SemiBold' },
  errorText: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12,
  },
  infoText: {
    fontFamily: 'Lora_400Regular', fontSize: 13, lineHeight: 19, color: Colors.brown800,
    textAlign: 'center', marginBottom: 18,
  },
  primaryButton: {
    height: 48, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  primaryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
  linkText: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600, textDecorationLine: 'underline' },
});
