import { Text } from './Typography';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Fonts, cardShadow } from '../constants/theme';
import Backdrop from './Backdrop';
import MeshBlobs from './MeshBlobs';
import { ScreenHeader } from './ui';

export default function StudentScreen({ title, children, refreshControl = undefined }) {
  const router = useRouter();
  return (
    <LinearGradient colors={[Colors.cream, '#E6D9AE']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <MeshBlobs height={900} style={StyleSheet.absoluteFill} />
        <Backdrop height={220} style={StyleSheet.absoluteFill} />
        <ScreenHeader title={title} onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')} />
        <ScrollView refreshControl={refreshControl} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function StudentCard({ title = '', children }) {
  return <View style={studentStyles.card}>{!!title && <Text style={studentStyles.title}>{title}</Text>}{children}</View>;
}

export const studentStyles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 18, gap: 12, ...cardShadow },
  title: { fontFamily: Fonts.semibold, fontSize: 19, color: Colors.brown900 },
  text: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21, color: Colors.brown600 },
  error: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21, color: Colors.error },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
