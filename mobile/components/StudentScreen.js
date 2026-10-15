import { Text } from './Typography';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Layout, Radius, cardShadow } from '../constants/theme';
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView refreshControl={refreshControl} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Layout.gutter, paddingTop: 4, paddingBottom: 40, gap: 20, width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center' }}>
          {children}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function StudentCard({ title = '', children }) {
  return <View style={studentStyles.card}>{!!title && <Text style={studentStyles.title}>{title}</Text>}{children}</View>;
}

export const studentStyles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.card, padding: 20, gap: 12, borderWidth: 1, borderColor: Colors.line, ...cardShadow },
  title: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 26, letterSpacing: -0.3, color: Colors.brown900 },
  text: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21, color: Colors.brown600 },
  error: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21, color: Colors.error },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
