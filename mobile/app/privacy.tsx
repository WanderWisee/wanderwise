import { Text } from '../components/Typography';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { ScreenHeader } from '../components/ui';
import { useApp } from '../context/AppContext';

// Privacy Notice (Data Privacy Act of 2012, RA 10173) — same text as the web.
const SECTIONS = [
  ['Who we are', 'WanderWise is a capstone project of Manuel S. Enverga University Foundation (MSEUF) tourism students. It helps students and teachers plan educational trips and field activities.'],
  ['What we collect', 'Name, school email, personal (recovery) email, date of birth, mobile number, student number or employee ID, profile photo and bio (optional), your trips, budgets and expenses, travel stories and comments, and — only on Tour Day check-in — your location and a photo.'],
  ['Why we collect it', 'To create and secure your account (email code, password reset), to let you plan and share trips with your crew, to send trip reminders and announcements, and to let your teacher monitor class trips and attendance.'],
  ['Who can see it', 'Your crew sees the trips you share with them. Teachers see only the students who joined their class with the class code: their trips, budgets, attendance and check-in photos/locations. Teachers do not see your mobile number. Other students only see your public profile (name, photo, bio, stories). The admin can manage accounts and hide inappropriate posts.'],
  ['How we protect it', 'Passwords and email codes are stored encrypted (hashed), all connections use HTTPS, accounts lock after repeated wrong passwords, and only signed-in users can open private data.'],
  ['How long we keep it', 'We keep your data while your account exists. When you delete your account, your profile, trips, stories and check-ins are permanently removed.'],
  ['Your rights', 'Under RA 10173 you can access and correct your data (Settings → Account), withdraw consent and delete your account at any time (Settings → Delete my account), and ask us questions or file a concern.'],
  ['Contact', 'WanderWise Team — wanderwise.mseuf@gmail.com'],
];

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useApp();
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('privacyNotice')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: October 2026</Text>
        {SECTIONS.map(([title, body]) => (
          <Text key={title} style={styles.body}>
            <Text style={styles.title}>{title}{'\n'}</Text>
            {body}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  updated: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.brown600 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.brown900 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 13.5, lineHeight: 21, color: Colors.brown600 },
});
