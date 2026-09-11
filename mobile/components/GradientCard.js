import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

// Banayad na gradient card — parehong kulay palette, pero may
// direksyon ng liwanag (light to slightly-darker) imbes na solid fill,
// para may "richness" kahit hindi bumabago ng kulay.
export default function GradientCard({ children, style, colors, ...props }) {
  return (
    <LinearGradient
      colors={colors || [Colors.cream2, '#E7DCB8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.line,
    shadowColor: Colors.brown900,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
});