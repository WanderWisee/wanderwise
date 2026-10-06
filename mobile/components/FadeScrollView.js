import { View, ScrollView } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

// ScrollView na may fade sa itaas: unti-unting naglalaho ang content
// malapit sa itaas na gilid, kaya walang matigas na hiwa sa ilalim ng header.
export default function FadeScrollView({ fadeHeight = 28, style = null, children, ...props }) {
  return (
    <MaskedView
      style={[{ flex: 1 }, style]}
      maskElement={
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
            style={{ height: fadeHeight }}
          />
          <View style={{ flex: 1, backgroundColor: '#000' }} />
        </View>
      }
    >
      <ScrollView {...props}>{children}</ScrollView>
    </MaskedView>
  );
}