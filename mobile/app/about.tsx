import AppIcon from '../components/AppIcon';
import { Text } from '../components/Typography';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Image as SvgImage } from 'react-native-svg';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { aboutTranslations } from '../i18n/aboutStrings';
import { ScreenHeader } from '../components/ui';
import FadeScrollView from '../components/FadeScrollView';
import Backdrop from '../components/Backdrop';
import MeshBlobs from '../components/MeshBlobs';

const FEATURES = [
  ['calendar', 'Itinerary'], ['map', 'Map'], ['wallet', 'Budget'],
  ['users', 'Crew'], ['pin', 'Tour'], ['book', 'Journal'],
];
const AUDIENCE = [['user', 'Students'], ['graduation', 'Teachers'], ['settings', 'Admin']];

export default function AboutScreen() {
  const router = useRouter();
  const { t, language } = useApp();
  const copy = (key) => aboutTranslations[language]?.[key] ?? aboutTranslations.en[key] ?? key;

  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <MeshBlobs height={900} style={StyleSheet.absoluteFill} />
        <Backdrop height={220} style={StyleSheet.absoluteFill} />
      </View>
      <ScreenHeader title={t('aboutUs')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />

      <FadeScrollView fadeHeight={24} contentContainerStyle={styles.content}>
        <View style={styles.brand} accessible accessibilityRole="image" accessibilityLabel="WanderWise">
          <Svg width={80} height={98} viewBox="795 637 1410 1726" accessible={false}>
            <SvgImage href={require('../assets/brand/logo.png')} width={3000} height={3000} />
          </Svg>
          <Svg width={220} height={24} viewBox="617 1425 1758 165" accessible={false}>
            <SvgImage href={require('../assets/brand/wordmark.png')} width={3000} height={3000} />
          </Svg>
        </View>
        <Text style={styles.tagline}>Your travel companion for smarter trips</Text>

        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.groupTitle}>{copy('lpNavFeatures')}</Text>
          <Text style={styles.paragraph}>{copy('lpFeaturesSub')}</Text>
          {FEATURES.map(([icon, key]) => (
            <View key={key} style={styles.card}>
              <View style={styles.cardHeading}>
                <AppIcon name={icon} size={22} color={Colors.teal} />
                <Text style={styles.cardTitle}>{copy(`lpFeat${key}`)}</Text>
              </View>
              <Text style={styles.paragraph}>{copy(`lpFeat${key}Text`)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.groupTitle}>{copy('lpNavWho')}</Text>
          <Text style={styles.paragraph}>{copy('lpWhoTitle')}</Text>
          {AUDIENCE.map(([icon, key]) => (
            <View key={key} style={styles.card}>
              <View style={styles.cardHeading}>
                <AppIcon name={icon} size={22} color={Colors.teal} />
                <Text style={styles.cardTitle}>{copy(`lpFor${key}`)}</Text>
              </View>
              <Text style={styles.paragraph}>{copy(`lpFor${key}Text`)}</Text>
              {key !== 'Students' && <Text style={styles.webOnly}>{copy('webOnly')}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.groupTitle}>{copy('lpNavHow')}</Text>
          <Text style={styles.paragraph}>{copy('lpHowTitle')}</Text>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>{step}</Text></View>
                <Text style={styles.cardTitle}>{copy(`lpStep${step}`)}</Text>
              </View>
              <Text style={styles.paragraph}>{copy(`lpStep${step}Text`)}</Text>
            </View>
          ))}
        </View>

        <Text accessibilityRole="header" style={[styles.groupTitle, { alignSelf: 'stretch', marginBottom: 20 }]}>{t('aboutUs')}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is WanderWise?</Text>
          <Text style={styles.paragraph}>
            WanderWise is a synchronized web and mobile travel itinerary management system built for
            Tourism Management students and faculty. It helps you plan academic tours and field
            activities with day-by-day scheduling, map-based route visualization, and group
            collaboration.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            We built WanderWise to take the stress out of planning student travel — replacing
            scattered spreadsheets and group chats with one shared space where everyone stays on the
            same page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Project</Text>
          <Text style={styles.paragraph}>
            WanderWise is a capstone project developed for the Tourism Management program, 2026.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Team</Text>
          <Text style={styles.paragraph}>Reuven Reyes{'\n'}Geilonn Romulo{'\n'}Niel Deo Villaverde</Text>
        </View>
      </FadeScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: Colors.brown900 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, alignItems: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' },
  brand: { alignItems: 'center', gap: 24, marginBottom: 16 },
  tagline: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.brown600,
    marginTop: 6, marginBottom: 34, textAlign: 'center',
  },
  group: { width: '100%', gap: 12, marginBottom: 32 },
  groupTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, lineHeight: 32, color: Colors.brown900 },
  card: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line, borderRadius: 20, padding: 20, gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 23, color: Colors.brown900 },
  webOnly: { fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 19, color: Colors.teal },
  stepBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.brown900, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.mint },
  section: { width: '100%', marginBottom: 26 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: Colors.brown900, marginBottom: 8 },
  paragraph: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, color: Colors.brown600 },
});
