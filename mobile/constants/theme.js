export const Colors = {
  // Same palette as the web app
  card: '#C8AC82',
  cream: '#F7F4EA',
  cream2: '#EFE9D8',
  brown900: '#331C08',
  brown800: '#3D2814',
  brown600: '#5F4E3A',
  // Text on every button (buttons are brown900 #331C08).
  onButton: '#FEFCF3',
  // Match the mint sampled from the supplied logo (buttons, tabs, badges).
  mint: '#89D4D0',
  // Teal = links and highlights on light backgrounds
  teal: '#2F6F5F',
  line: 'rgba(51, 28, 8, 0.14)',
  error: '#B3261E',
  white: '#FFFFFF',
  placeholder: '#A8A29B',
  // Mga kulay ng icon badge na gamit na sa buong app
  tintSand: '#F4D9A8',
  tintSage: '#C9D9C4',
  tintMauve: '#D9C4D0',
  tintSky: '#B8D4D9',
};

export const Fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  bold: 'Poppins_700Bold',
  semibold: 'Poppins_600SemiBold',
};

export const Layout = {
  gutter: 20,
  contentWidth: 560,
  controlHeight: 52,
  touchTarget: 44,
};

export const Radius = { control: 14, card: 20 };

// Parehong anino ng mga puting card sa app
export const cardShadow = {
  shadowColor: Colors.brown900,
  shadowOpacity: 0.045,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
};
