import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

// Consistent na "hero badge" na icon container — ginagamit sa landing page
// at sa lahat ng bagong screens para may parehong visual signature.
export default function IconBadge({ emoji, size = 84 }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.4 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.cream2,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});