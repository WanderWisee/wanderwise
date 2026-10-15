import AppIcon from '../components/AppIcon';
import { Text, TextInput } from '../components/Typography';
import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { register, sendRegisterOtp } from '../services/authService';
import { consumePendingJoin } from '../services/pendingJoin';
import { useApp } from '../context/AppContext';
import Backdrop from '../components/Backdrop';
import { Wordmark } from '../components/ui';
import BirthdayPicker from '../components/BirthdayPicker';
import {
  dobBounds,
  fromMdy,
  keepDigits,
  keepEmail,
  keepNameChars,
  liveErrors,
  registrationErrors,
  toMdy,
} from '../utils/validation';

// Parehong daloy ng web: (1) punan ang form → magpapadala ng 6-digit code
// sa SCHOOL email (Outlook) → (2) ilagay ang code → gagawin ang account.
// Ang personal email ay pang-recovery lang (forgot password).

// Bawat field ay sinusuri: letra lang sa pangalan, 11-digit na 09 number,
// kalendaryo para sa birthday, at password na may letra at numero.
const FILTERS = {
  firstName: keepNameChars,
  lastName: keepNameChars,
  schoolEmail: keepEmail,
  recoveryEmail: keepEmail,
  cellphone: (v) => keepDigits(v, 11),
};

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
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dobOpen, setDobOpen] = useState(false);
  const bounds = dobBounds();

  // Sinusuri agad ang bawat pagbabago (hindi lang kapag pinindot ang
  // Register), kaya lumalabas agad ang mali sa birthday, number, atbp.
  const set = (key) => (value) => {
    const filter = FILTERS[key];
    const nextForm = { ...form, [key]: filter ? filter(value) : value };
    const nextTouched: Record<string, boolean> = { ...touched, [key]: true };
    if (key === 'password' && form.confirmPassword) nextTouched.confirmPassword = true;
    setForm(nextForm);
    setTouched(nextTouched);
    setErrors(liveErrors(nextForm, nextTouched));
    setError(null);
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const inputStyle = (key, extra = null) => [styles.input, extra, errors[key] && styles.inputError];
  const fieldError = (key) => (errors[key] ? <Text style={styles.fieldError}>{t(errors[key])}</Text> : null);

  async function handleSendCode() {
    setError(null);
    setInfo(null);
    const found = registrationErrors(form);
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setError(t('valFixFields'));
      return;
    }
    setLoading(true);
    try {
      await sendRegisterOtp({ schoolEmail: form.schoolEmail, recoveryEmail: form.recoveryEmail });
      setStep('otp');
      setInfo(`${t('otpSentTo')} ${form.schoolEmail.trim()}. ${t('otpCheckJunk')}`);
    } catch (e) {
      setError(e.message || t('registerErrSendOtp'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError(t('valOtp'));
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, otpCode });
      await signIn();
      const joinedTripId = await consumePendingJoin();
      router.replace(joinedTripId === 'retry' ? '/join' : joinedTripId ? `/trip/${joinedTripId}` : '/(tabs)/home');
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
      setInfo(`${t('otpResendSuccess')} ${t('otpCheckJunk')}`);
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
        <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <TouchableOpacity onPress={goBack} style={styles.backButton} hitSlop={10}>
              <AppIcon name="arrow-left" style={styles.backText} />
            </TouchableOpacity>

            {step === 'form' ? (
              <>
                <Text style={styles.cardTitle}>{t('registerTitle')}</Text>

                <View style={styles.nameRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.fieldLabel}>{t('firstName')}</Text>
                    <TextInput
                      accessibilityLabel={t('firstName')}
                      style={inputStyle('firstName')}
                      placeholder={t('firstName')}
                      placeholderTextColor={Colors.brown600}
                      value={form.firstName}
                      onChangeText={set('firstName')}
                      autoComplete="given-name"
                      maxLength={50}
                    />
                    {fieldError('firstName')}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.fieldLabel}>{t('lastName')}</Text>
                    <TextInput
                      accessibilityLabel={t('lastName')}
                      style={inputStyle('lastName')}
                      placeholder={t('lastName')}
                      placeholderTextColor={Colors.brown600}
                      value={form.lastName}
                      onChangeText={set('lastName')}
                      autoComplete="family-name"
                      maxLength={50}
                    />
                    {fieldError('lastName')}
                  </View>
                </View>
                <Text style={styles.fieldLabel}>{t('schoolEmail')}</Text>
                <TextInput
                  accessibilityLabel={t('schoolEmail')}
                  style={inputStyle('schoolEmail')}
                  placeholder={t('studentEmailPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={form.schoolEmail}
                  onChangeText={set('schoolEmail')}
                />
                {fieldError('schoolEmail')}
                <Text style={styles.fieldLabel}>{t('recoveryEmailLabel')}</Text>
                <TextInput
                  accessibilityLabel={t('recoveryEmailLabel')}
                  style={inputStyle('recoveryEmail')}
                  placeholder={t('recoveryEmailPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={form.recoveryEmail}
                  onChangeText={set('recoveryEmail')}
                />
                {fieldError('recoveryEmail')}
                <Text style={styles.fieldLabel}>{t('dobLabel')}</Text>
                <TouchableOpacity
                  style={[...inputStyle('dob'), styles.dateField]}
                  onPress={() => setDobOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('dobPick')}
                >
                  <Text style={[styles.dateText, !form.dob && { color: Colors.brown600 }]}>
                    {form.dob || t('dobPick')}
                  </Text>
                  <AppIcon name="calendar" style={styles.dateIcon} />
                </TouchableOpacity>
                {fieldError('dob')}
                <Text style={styles.fieldLabel}>{t('cellphoneNumber')}</Text>
                <TextInput
                  accessibilityLabel={t('cellphoneNumber')}
                  style={inputStyle('cellphone')}
                  placeholder={t('valPhonePlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  keyboardType="number-pad"
                  value={form.cellphone}
                  onChangeText={set('cellphone')}
                  maxLength={11}
                />
                {fieldError('cellphone')}
                <Text style={styles.fieldLabel}>{t('password')}</Text>
                <TextInput
                  accessibilityLabel={t('password')}
                  style={inputStyle('password')}
                  placeholder={t('createPasswordLabel')}
                  placeholderTextColor={Colors.brown600}
                  secureTextEntry
                  value={form.password}
                  onChangeText={set('password')}
                  textContentType="newPassword"
                  maxLength={100}
                />
                {fieldError('password') || <Text style={styles.fieldHint}>{t('valPasswordHint')}</Text>}
                <Text style={styles.fieldLabel}>{t('confirmPassword')}</Text>
                <TextInput
                  accessibilityLabel={t('confirmPassword')}
                  style={inputStyle('confirmPassword')}
                  placeholder={t('confirmPassword')}
                  placeholderTextColor={Colors.brown600}
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={set('confirmPassword')}
                  maxLength={100}
                />
                {fieldError('confirmPassword')}

                <BirthdayPicker
                  visible={dobOpen}
                  value={fromMdy(form.dob)}
                  min={bounds.min}
                  max={bounds.max}
                  onClose={() => setDobOpen(false)}
                  onConfirm={(date) => {
                    set('dob')(toMdy(date));
                    setDobOpen(false);
                  }}
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity style={[styles.primaryButton, hasErrors && { opacity: 0.5 }]} onPress={handleSendCode} disabled={loading || hasErrors}>
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  centerWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.line },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 20, color: Colors.brown900 },
  cardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 24, lineHeight: 34, letterSpacing: -0.5, color: Colors.brown900, marginBottom: 24 },
  nameRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 20, color: Colors.brown600, marginBottom: 8 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown900, backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.line, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18 },
  inputError: { borderColor: Colors.error, borderWidth: 1.5 },
  fieldError: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.error, marginTop: -12, marginBottom: 14 },
  fieldHint: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600, marginTop: -12, marginBottom: 14 },
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontFamily: 'Poppins_400Regular', fontSize: 14.5, color: Colors.brown900 },
  dateIcon: { fontSize: 18, color: Colors.brown900 },
  otpInput: { fontSize: 26, letterSpacing: 10, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
  errorText: {
    fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12,
  },
  infoText: {
    fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: Colors.brown800,
    textAlign: 'center', marginBottom: 18,
  },
  primaryButton: { minHeight: 52, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.mint },
  linkText: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: Colors.brown600, textDecorationLine: 'underline' },
});
