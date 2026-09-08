import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/theme';

// Parehong layered-curve na disenyo na ginamit natin sa landing page —
// reusable na ngayon sa lahat ng screens, para consistent ang "signature look"
// ng buong app.
export default function Backdrop({ height = 220, style }) {
  return (
    <Svg
      style={style}
      width="100%"
      height={height}
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
  );
}