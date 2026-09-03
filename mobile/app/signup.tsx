import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { register } from '../services/authService.js';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleRegister() {
    setError(null);
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password });
      router.replace('/login');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
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

          <Text style={styles.cardTitle}>Register Your Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={Colors.brown600}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.brown600}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Create a Password (at least 8 characters)"
            placeholderTextColor={Colors.brown600}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={Colors.brown600}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.mint} />
            ) : (
              <Text style={styles.primaryButtonText}>Register</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
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
    paddingVertical: 8, marginBottom: 18,
  },
  errorText: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.error, marginBottom: 12,
  },
  primaryButton: {
    height: 48, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  primaryButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.mint },
});