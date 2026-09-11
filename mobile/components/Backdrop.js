import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Multi-layer na "horizon" disenyo — katamtamang lakas ng kulay
// (hindi matapang, hindi rin halos-mawala), mahabang gradient fade
// papuntang transparent para makinis ang transition.
export default function Backdrop({ height = 220, style }) {
  return (
    <Svg
      style={style}
      width="100%"
      height={height}
      viewBox="0 0 375 220"
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="layer1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#DFCE9A" stopOpacity="1" />
          <Stop offset="0.5" stopColor="#DFCE9A" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#DFCE9A" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="layer2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D3BE84" stopOpacity="0.95" />
          <Stop offset="0.5" stopColor="#D3BE84" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#D3BE84" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="layer3" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C2A968" stopOpacity="0.85" />
          <Stop offset="0.5" stopColor="#C2A968" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#C2A968" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Path
        d="M0,60 C70,20 130,95 200,55 C260,22 320,70 375,40 L375,220 L0,220 Z"
        fill="url(#layer1)"
      />
      <Path
        d="M0,110 C80,75 150,135 230,95 C290,68 335,115 375,90 L375,220 L0,220 Z"
        fill="url(#layer2)"
      />
      <Path
        d="M0,150 C90,125 180,175 260,140 C310,120 345,155 375,140 L375,220 L0,220 Z"
        fill="url(#layer3)"
      />
    </Svg>
  );
}