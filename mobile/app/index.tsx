import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function LandingScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Background curves — parehong disenyo ng Flutter version natin */}
      <Svg
        style={styles.backdrop}
        width="100%"
        height={220}
        viewBox="0 0 375 220"
        preserveAspectRatio="none"
      >
        <Path
          d="M0,90 C90,40 180,140 375,70 L375,220 L0,220 Z"
          fill={Colors.cream2}
          opacity={0.9}
        />
        <Path
          d="M0,140 C110,110 250,190 375,120 L375,220 L0,220 Z"
          fill="#E7DEBC"
          opacity={0.7}
        />
      </Svg>

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={{ fontSize: 16 }}>🧭</Text>
        </View>
        <Text style={styles.wordmark}>
          Wander<Text style={styles.wordmarkLight}>Wise</Text>
        </Text>
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.heroBadge}>
          <Text style={{ fontSize: 32 }}>✈️</Text>
        </View>

        <Text style={styles.heading}>
          {t('landingTitle')}
        </Text>
        <Text style={styles.subtitle}>
          {t('landingSubtitle')}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.outlineButtonText}>{t('logIn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.primaryButtonText}>{t('signUp')}</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity onPress={() => router.push('/about')}>
          <Text style={styles.footerLink}>{t('aboutUs')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLanguage(language === 'en' ? 'fil' : 'en')} style={{ marginTop: 10 }}>
          <Text style={styles.footerLink}>{language === 'en' ? 'Filipino' : 'English'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.cream2,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 19,
    color: Colors.brown900,
  },
  wordmarkLight: {
    fontFamily: 'Lora_400Regular',
    color: Colors.brown600,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  heroBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.cream2,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  heading: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 26,
    lineHeight: 34,
    color: Colors.brown900,
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: 'Lora_400Regular',
    fontSize: 14.5,
    lineHeight: 23,
    color: Colors.brown600,
    textAlign: 'center',
    marginBottom: 34,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.brown900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 15.5,
    color: Colors.mint,
  },
  outlineButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: Colors.brown900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontFamily: 'Lora_600SemiBold',
    fontSize: 15.5,
    color: Colors.brown900,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 26,
    paddingTop: 18,
  },
  divider: {
    width: 36,
    height: 1.4,
    backgroundColor: Colors.line,
    marginBottom: 14,
  },
  footerLink: {
    fontFamily: 'Lora_400Regular',
    fontSize: 12.5,
    color: Colors.brown600,
    textDecorationLine: 'underline',
  },
});