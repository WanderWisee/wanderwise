import AppIcon from './AppIcon';
import { Text, TextInput } from './Typography';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Image as SvgImage } from 'react-native-svg';
import { Image as RemoteImage } from 'expo-image';
import { Colors, Fonts, Layout, Radius, cardShadow } from '../constants/theme';
import { initials } from '../services/userService';
import { fetchDestinationImage } from '../services/geoService';
import { localImageFor } from '../constants/destinations';

// Maliliit na piraso ng UI na paulit-ulit sa mga screen — pareho ang
// itsura ng dati (cream/brown/mint, Poppins), pinag-isa lang para consistent.

export function Wordmark() {
  return (
    <View style={styles.wordmarkRow} accessible accessibilityRole="image" accessibilityLabel="WanderWise">
      {/* Frame the artwork within the transparent 3000px source canvases. */}
      <Svg width={34} height={42} viewBox="795 637 1410 1726" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })}>
        <SvgImage href={require('../assets/brand/logo.png')} width={3000} height={3000} />
      </Svg>
      <Svg width={156} height={18} viewBox="617 1425 1758 165" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })}>
        <SvgImage href={require('../assets/brand/wordmark.png')} width={3000} height={3000} />
      </Svg>
    </View>
  );
}

// Header na may back button sa kaliwa, pamagat sa gitna, at opsyonal na aksyon sa kanan.
export function ScreenHeader({ title, onBack, right = null, titleSize = 20 }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.squareButton} hitSlop={8} accessibilityLabel="Back">
          <AppIcon name="arrow-left" style={styles.backText} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: Layout.touchTarget }} />
      )}
      <Text style={[styles.headerTitle, { fontSize: titleSize }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: Layout.touchTarget, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function SquareButton({ children, onPress, style = null, accessibilityLabel = undefined }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.squareButton, style]} hitSlop={6} accessibilityLabel={accessibilityLabel}>
      {typeof children === 'string' ? <AppIcon name={children} size={18} /> : children}
    </TouchableOpacity>
  );
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false, style = null, small = false }) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, small && styles.primaryButtonSmall, (disabled || loading) && { opacity: 0.6 }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      accessibilityLabel={label}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={Colors.onButton} />
      ) : (
        <Text style={[styles.primaryButtonText, small && { fontSize: 13 }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function OutlineButton({ label, onPress, disabled = false, style = null, small = false, danger = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.outlineButton,
        small && styles.primaryButtonSmall,
        danger && { borderColor: Colors.error },
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      activeOpacity={0.7}
    >
      <Text style={[styles.outlineButtonText, small && { fontSize: 13 }, danger && { color: Colors.error }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Label + input na may parehong istilo ng Account screen.
export function Field({ label, style = null, inputStyle = null, hint = null, editable = true, error = '', onFocus = undefined, onBlur = undefined, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        style={[styles.fieldInput, !editable && styles.fieldInputLocked, focused && styles.fieldInputFocused, !!error && { borderColor: Colors.error }, inputStyle]}
        placeholderTextColor={Colors.placeholder}
        accessibilityLabel={label}
        editable={editable}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        {...inputProps}
      />
      {!!(error || hint) && <Text accessibilityRole={error ? 'alert' : undefined} style={[styles.fieldHint, !!error && { color: Colors.error }]}>{error || hint}</Text>}
    </View>
  );
}

export function SectionTitle({ icon = null, tint = Colors.tintSand, children, right = null, style = null }) {
  return (
    <View style={[styles.sectionRow, style]}>
      {!!icon && (
        <View style={[styles.sectionIconBadge, { backgroundColor: tint }]}>
          <AppIcon name={icon} size={18} />
        </View>
      )}
      <Text style={styles.sectionTitle} numberOfLines={2}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle = null, action = null, style = null }) {
  return (
    <View style={[styles.empty, style]}>
      <AppIcon name={icon} size={38} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action}
    </View>
  );
}

// Error na may "Try again" — para hindi tahimik na walang laman ang screen.
export function ErrorState({ message, onRetry, retryLabel = 'Try again' }) {
  return (
    <View style={styles.empty}>
      <AppIcon name="radio" style={{ fontSize: 34 }} />
      <Text style={styles.emptySubtitle}>{message}</Text>
      {onRetry && <OutlineButton label={retryLabel} onPress={onRetry} small style={{ marginTop: 14, paddingHorizontal: 22 }} />}
    </View>
  );
}

export function Loading({ style = null }) {
  return (
    <View style={[styles.loading, style]}>
      <ActivityIndicator color={Colors.brown900} />
    </View>
  );
}

// Larawan ng profile, o initials kapag wala.
export function Avatar({ person = null, uri = null, size = 40, style = null }) {
  const src = uri || person?.avatarUrl;
  const radius = size / 2;
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[{ width: size, height: size, borderRadius: radius, backgroundColor: Colors.cream2 }, style]}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: Math.max(10, size * 0.36) }]}>{initials(person)}</Text>
    </View>
  );
}

// Larawan ng isang destination: lokal na larawan muna (parehong assets ng
// web), tapos Wikipedia sa pamamagitan ng backend, tapos vector icon.
export function DestinationImage({ name, style, icon = 'map', iconSize = 34 }) {
  const local = localImageFor(name);
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!local && name) {
      fetchDestinationImage(name).then((url) => {
        if (alive && url) setRemote({ name, url });
      });
    }
    return () => {
      alive = false;
    };
  }, [name, local]);

  if (local) return <Image source={local} style={[{ backgroundColor: Colors.cream2 }, style]} resizeMode="cover" />;
  if (remote?.name === name) {
    // Wikimedia rejects images requested without a proper User-Agent (the APK
    // on Android would show an empty box), so send one with expo-image.
    return (
      <RemoteImage
        source={{ uri: remote.url, headers: { 'User-Agent': 'WanderWise-Mobile/1.0 (capstone project)' } }}
        style={[{ backgroundColor: Colors.cream2 }, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }
  return (
    <View style={[{ backgroundColor: Colors.cream2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <AppIcon name={icon} size={iconSize} />
    </View>
  );
}

// Pill-style na pagpili (gamit sa Preferences, Budget categories, atbp.)
export function ChoiceChips({ options, value, onChange, style = null }) {
  return (
    <View style={[styles.chipsRow, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.chip, { flexDirection: 'row', gap: 6 }, active && styles.chipActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {!!opt.icon && <AppIcon name={opt.icon} size={16} color={active ? Colors.mint : Colors.brown900} />}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const ui = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 16, ...cardShadow },
  screenPad: { paddingHorizontal: 20 },
  muted: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.brown600 },
  body: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.brown900 },
  strong: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.brown900 },
  error: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.error, marginBottom: 12 },
  link: { fontFamily: Fonts.regular, fontSize: 12.5, color: Colors.brown600, textDecorationLine: 'underline' },
});

const styles = StyleSheet.create({
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: Layout.gutter, paddingTop: 12, paddingBottom: 20,
  },
  squareButton: {
    width: Layout.touchTarget, height: Layout.touchTarget, borderRadius: Radius.control, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: Fonts.semibold, color: Colors.brown900, letterSpacing: -0.4 },
  primaryButton: {
    minHeight: Layout.controlHeight, paddingVertical: 14, borderRadius: Radius.control, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  primaryButtonSmall: { minHeight: Layout.touchTarget, paddingVertical: 10, borderRadius: 12, paddingHorizontal: 14 },
  primaryButtonText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.onButton },
  outlineButton: {
    minHeight: Layout.controlHeight, paddingVertical: 14, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.line,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  outlineButtonText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.brown900 },
  fieldLabel: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 20, color: Colors.brown600, marginBottom: 8 },
  fieldInput: {
    fontFamily: Fonts.regular, fontSize: 15, color: Colors.brown900,
    minHeight: Layout.controlHeight, backgroundColor: Colors.cream, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingVertical: 14, lineHeight: 22,
  },
  fieldInputFocused: { borderColor: Colors.teal, backgroundColor: Colors.white },
  fieldInputLocked: { opacity: 0.65 },
  fieldHint: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 18, color: Colors.brown600, marginTop: 6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 26, color: Colors.brown900, letterSpacing: -0.3 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 4 },
  emptyTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.brown900, marginTop: 14, textAlign: 'center' },
  emptySubtitle: {
    fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, color: Colors.brown600, marginTop: 6, textAlign: 'center',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  avatarFallback: {
    backgroundColor: Colors.cream2, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: Fonts.semibold, color: Colors.brown600 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, minHeight: Layout.touchTarget, borderRadius: Radius.control, backgroundColor: Colors.cream,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  chipText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.brown900 },
  chipTextActive: { color: Colors.mint },
});
