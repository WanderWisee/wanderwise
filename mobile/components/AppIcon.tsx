import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, BookOpen, Bus, CalendarDays,
  Camera, Car, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, ClipboardList, Clock, Compass, DoorOpen, ExternalLink, Eye,
  Fuel, Globe, GraduationCap, Hand, Home, Hotel, Info, Link, LockKeyhole, LogOut,
  Map, MapPin, Menu, MessageCircle, Minus, MoreHorizontal, Pencil, Plane,
  Plus, Radio, Receipt, Search, Send, Settings, ShoppingBag, Sparkles,
  SquareCheck, Star, Luggage as Suitcase, Ticket, Trash2, TriangleAlert, User, Users,
  Utensils, Wallet, X, Ban, Maximize2, Briefcase, Bed, Banknote, Megaphone, CircleAlert,
  UserPlus, type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View, type ColorValue, type StyleProp, type TextStyle } from 'react-native';
import { Colors } from '../constants/theme';
import { Text } from './Typography';

const icons: Record<string, LucideIcon> = {
  'arrow-down': ArrowDown, 'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'arrow-up': ArrowUp,
  bell: Bell, book: BookOpen, bus: Bus, calendar: CalendarDays, camera: Camera,
  car: Car, check: Check, 'check-all': CheckCheck, 'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, clipboard: ClipboardList,
  home: Home, clock: Clock, compass: Compass, door: DoorOpen, external: ExternalLink, eye: Eye,
  fuel: Fuel, globe: Globe, graduation: GraduationCap, hand: Hand, hotel: Hotel,
  info: Info, link: Link, lock: LockKeyhole, logout: LogOut, map: Map, pin: MapPin,
  menu: Menu, message: MessageCircle, minus: Minus, more: MoreHorizontal, pencil: Pencil,
  plane: Plane, plus: Plus, radio: Radio, receipt: Receipt, search: Search, send: Send,
  settings: Settings, shopping: ShoppingBag, sparkles: Sparkles, 'square-check': SquareCheck,
  star: Star, suitcase: Suitcase, ticket: Ticket, trash: Trash2, warning: TriangleAlert,
  user: User, users: Users, utensils: Utensils, wallet: Wallet, ban: Ban, expand: Maximize2, x: X,
  // Same icons as the web's notifications list
  briefcase: Briefcase, bed: Bed, banknote: Banknote, megaphone: Megaphone,
  'alert-circle': CircleAlert, 'user-plus': UserPlus,
};

export default function AppIcon({ name, size = 22, color = Colors.brown900, style, filled = false }: {
  name: string; size?: number; color?: ColorValue; style?: StyleProp<TextStyle>; filled?: boolean;
}) {
  const Icon = icons[name] || CircleHelp;
  const textStyle = StyleSheet.flatten(style);
  return <Icon size={textStyle?.fontSize || size} color={textStyle?.color as string || color}
    strokeWidth={2} fill={filled ? color : 'none'} accessible={false} />;
}

export function IconLabel({ name, children, textStyle, size = 18, color, trailing = false }: {
  name: string; children?: React.ReactNode; textStyle?: StyleProp<TextStyle>;
  size?: number; color?: string; trailing?: boolean;
}) {
  const flattened = StyleSheet.flatten(textStyle);
  const {
    margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical,
    alignSelf, flex, ...typography
  } = flattened || {};
  const icon = <AppIcon name={name} size={size} color={color || flattened?.color as string || Colors.brown900} />;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, margin, marginTop, marginBottom,
    marginLeft, marginRight, marginHorizontal, marginVertical, alignSelf, flex,
    justifyContent: flattened?.textAlign === 'center' ? 'center' : 'flex-start' }}>
    {!trailing && icon}<Text style={[{ flexShrink: 1 }, typography]}>{children}</Text>{trailing && icon}
  </View>;
}

export function RatingStars({ rating, size = 18 }: { rating: number; size?: number }) {
  return <View accessible accessibilityLabel={`${rating} / 5`} style={{ flexDirection: 'row', gap: 3 }}>
    {[1, 2, 3, 4, 5].map((value) => <AppIcon key={value} name="star" size={size} color={value <= rating ? Colors.brown900 : Colors.placeholder} filled={value <= rating} />)}
  </View>;
}
