import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

// Mga malabong "mesh" blobs gamit ang radial gradient (fade papuntang
// transparent sa gilid, para may soft-blur na itsura kahit walang
// tunay na blur filter). Idinisenyo para mailagay sa likod ng buong
// screen, kasama ang Backdrop curves sa itaas.
export default function MeshBlobs({ height = 900, style }) {
  return (
    <Svg style={style} width="100%" height={height} viewBox={`0 0 375 ${height}`}>
      <Defs>
        <RadialGradient id="blob1" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#E3D7A8" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#E3D7A8" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="blob2" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#D4C182" stopOpacity="0.8" />
          <Stop offset="1" stopColor="#D4C182" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="blob3" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#C7B074" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#C7B074" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Circle cx="30" cy={height * 0.32} r="130" fill="url(#blob1)" />
      <Circle cx="345" cy={height * 0.48} r="110" fill="url(#blob2)" />
      <Circle cx="20" cy={height * 0.65} r="120" fill="url(#blob3)" />
      <Circle cx="355" cy={height * 0.85} r="100" fill="url(#blob1)" />
    </Svg>
  );
}