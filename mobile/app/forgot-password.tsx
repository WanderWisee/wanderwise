import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { resetPassword, sendForgotPasswordOtp, SCHOOL_EMAIL_REGEX } from '../services/authService';
import { useApp } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import Backdrop from '../components/Backdrop';
import { Wordmark } from '../components/ui';

// Parehong daloy ng web: school email → code sa recovery email → bagong password.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useApp();
  const { alert } = useDialog();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [schoolEmail, setSchoolEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function handleSend() {
    setError(null);
    if (!schoolEmail.trim()) {
      setError(t('forgotErrEmpty'));
      return;
    }
    if (!SCHOOL_EMAIL_REGEX.test(schoolEmail.trim())) {
      setError(t('registerErrSchoolEmail'));
      return;
    }
    setLoading(true);
    try {
      const data = await sendForgotPasswordOtp(schoolEmail);
      setInfo((data && data.message) || t('verifyResetSubtitle'));
      setStep('reset');
    } catch (e) {
      setError(e.message || t('forgotErrSendFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setError(null);
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError(t('otpErrEmpty'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('registerErrPasswordLength'));
      return;
    }
    if (newPassword !== confirm) {
      setError(t('registerErrPasswordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ schoolEmail, otpCode, newPassword });
      await alert(t('passwordUpdatedTitle'), t('passwordUpdatedMessage'));
      router.replace('/login');
    } catch (e) {
      setError(e.message || t('resetErrFailed'));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (step === 'reset') {
      setStep('email');
      setError(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/login');
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

            <Text style={styles.cardTitle}>
              {step === 'email' ? t('forgotPasswordTitle') : t('resetPasswordTitle')}
            </Text>

            {step === 'email' ? (
              <>
                <Text style={styles.infoText}>{t('forgotPasswordSubtitle')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('studentEmailPlaceholder')}
                  placeholderTextColor={Colors.brown600}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={schoolEmail}
                  onChangeText={setSchoolEmail}
                  onSubmitEditing={handleSend}
                />
              </>
            ) : (
              <>
                {info && <Text style={styles.infoText}>{info}</Text>}
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="••••••"
                  placeholderTextColor={Colors.brown600}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={(v) => setOtpCode(v.replace(/\D/g, ''))}
                  textContentType="oneTimeCode"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('newPassword')}
                  placeholderTextColor={Colors.brown600}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  textContentType="newPassword"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('reenterPassword')}
                  placeholderTextColor={Colors.brown600}
                  secureTextEntry
                  value={confirm}
                  onChangeText={setConfirm}
                />
              </>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={step === 'email' ? handleSend : handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.mint} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 'email' ? t('continueBtn') : t('resetPasswordTitle')}
                </Text>
              )}
            </TouchableOpacity>

            {step === 'reset' && (
              <TouchableOpacity onPress={handleSend} disabled={loading} style={{ marginTop: 16, alignSelf: 'center' }}>
                <Text style={styles.linkText}>{t('resendCode')}</Text>
              </TouchableOpacity>
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
    textAlign: 'center', marginBottom: 18,
  },
  infoText: {
    fontFamily: 'Lora_400Regular', fontSize: 13, lineHeight: 19, color: Colors.brown800,
    textAlign: 'center', marginBottom: 18,
  },
  input: {
    fontFamily: 'Lora_400Regular', fontSize: 14.5, color: Colors.brown900,
    borderBottomWidth: 1, borderBottomColor: Colors.brown900,
    paddingVertical: 8, marginBottom: 18,
  },
  otpInput: { fontSize: 26, letterSpacing: 10, textAlign: 'center', fontFamily: 'Lora_600SemiBold' },
  errorText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12 },
  primaryButton: {
    height: 48, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  primaryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
  linkText: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: Colors.brown600, textDecorationLine: 'underline' },
});
