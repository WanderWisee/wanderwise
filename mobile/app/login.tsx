import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { login } from '../services/authService';
import Backdrop from '../components/Backdrop';

export default function LoginScreen() {
  const router = useRouter();
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    setError(null);
    if (!studentNumber || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setLoading(true);
    try {
      await login({ studentNumber, password });
      router.replace('/(tabs)/home');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Backdrop height={180} style={styles.backdrop} />

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={{ fontSize: 16 }}>🧭</Text>
        </View>
        <Text style={styles.wordmark}>
          Wander<Text style={styles.wordmarkLight}>Wise</Text>
        </Text>
      </View>

      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.cardTitle}>Let's get you in</Text>

          <TextInput
            style={styles.input}
            placeholder="Student Number"
            placeholderTextColor={Colors.brown600}
            autoCapitalize="none"
            value={studentNumber}
            onChangeText={setStudentNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.brown600}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.mint} />
            ) : (
              <Text style={styles.primaryButtonText}>Log in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linkRow}>
            <TouchableOpacity>
              <Text style={styles.linkText}>Forgot Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.linkText}>Register Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingTop: 10,
  },
  logoBadge: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  wordmarkLight: { fontFamily: 'Lora_400Regular', color: Colors.brown600 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  card: {
    width: '100%', backgroundColor: Colors.card, borderRadius: 22,
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28,
  },
  backButton: { marginBottom: 12 },
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