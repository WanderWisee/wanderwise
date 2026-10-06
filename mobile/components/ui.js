import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors, Fonts, cardShadow } from '../constants/theme';
import { initials } from '../services/userService';
import { fetchDestinationImage } from '../services/geoService';
import { localImageFor } from '../constants/destinations';

// Maliliit na piraso ng UI na paulit-ulit sa mga screen — pareho ang
// itsura ng dati (cream/brown/mint, Lora), pinag-isa lang para consistent.

export function Wordmark() {
  return (
    <View style={styles.wordmarkRow}>
      <View style={styles.logo}>
        <Text style={{ fontSize: 16 }}>🧭</Text>
      </View>
      <Text style={styles.wordmark}>
        Wander<Text style={styles.wordmarkLight}>Wise</Text>
      </Text>
    </View>
  );
}

// Header na may back button sa kaliwa, pamagat sa gitna, at opsyonal na aksyon sa kanan.
export function ScreenHeader({ title, onBack, right = null, titleSize = 20 }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.squareButton} hitSlop={8} accessibilityLabel="Back">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 34 }} />
      )}
      <Text style={[styles.headerTitle, { fontSize: titleSize }]} numberOfLines={1}>
        {title}
      </Text>
      {right || <View style={{ width: 34 }} />}
    </View>
  );
}

export function SquareButton({ children, onPress, style = null, accessibilityLabel = undefined }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.squareButton, style]} hitSlop={6} accessibilityLabel={accessibilityLabel}>
      {typeof children === 'string' ? <Text style={styles.backText}>{children}</Text> : children}
    </TouchableOpacity>
  );
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false, style = null, small = false }) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, small && styles.primaryButtonSmall, (disabled || loading) && { opacity: 0.6 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={Colors.mint} />
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
      activeOpacity={0.7}
    >
      <Text style={[styles.outlineButtonText, small && { fontSize: 13 }, danger && { color: Colors.error }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Label + input na may parehong istilo ng Account screen.
export function Field({ label, style = null, inputStyle = null, hint = null, editable = true, ...inputProps }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        style={[styles.fieldInput, !editable && styles.fieldInputLocked, inputStyle]}
        placeholderTextColor={Colors.placeholder}
        editable={editable}
        {...inputProps}
      />
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

export function SectionTitle({ icon = null, tint = Colors.tintSand, children, right = null, style = null }) {
  return (
    <View style={[styles.sectionRow, style]}>
      {!!icon && (
        <View style={[styles.sectionIconBadge, { backgroundColor: tint }]}>
          <Text style={{ fontSize: 14 }}>{icon}</Text>
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
      <Text style={{ fontSize: 38 }}>{icon}</Text>
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
      <Text style={{ fontSize: 34 }}>📡</Text>
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
// web), tapos Wikipedia sa pamamagitan ng backend, tapos emoji.
export function DestinationImage({ name, style, emoji = '🏝️', emojiSize = 34 }) {
  const local = localImageFor(name);
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    let alive = true;
    setRemote(null);
    if (!local && name) {
      fetchDestinationImage(name).then((url) => {
        if (alive && url) setRemote(url);
      });
    }
    return () => {
      alive = false;
    };
  }, [name, local]);

  const source = local || (remote ? { uri: remote } : null);
  if (source) return <Image source={source} style={[{ backgroundColor: Colors.cream2 }, style]} resizeMode="cover" />;
  return (
    <View style={[{ backgroundColor: Colors.cream2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
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
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
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
  logo: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { fontFamily: Fonts.semibold, fontSize: 19, color: Colors.brown900 },
  wordmarkLight: { fontFamily: Fonts.regular, color: Colors.brown600 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  squareButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: Colors.brown900 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: Fonts.semibold, color: Colors.brown900 },
  primaryButton: {
    height: 48, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  primaryButtonSmall: { height: 38, borderRadius: 10, paddingHorizontal: 14 },
  primaryButtonText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.mint },
  outlineButton: {
    height: 48, borderRadius: 12, borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  outlineButtonText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.brown900 },
  fieldLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.brown600, marginBottom: 6 },
  fieldInput: {
    fontFamily: Fonts.regular, fontSize: 15, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  fieldInputLocked: { opacity: 0.65 },
  fieldHint: { fontFamily: Fonts.regular, fontSize: 11.5, color: Colors.placeholder, marginTop: 5 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontFamily: Fonts.semibold, fontSize: 19, color: Colors.brown900 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 30 },
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
    paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: Colors.cream2,
    borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  chipText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.brown900 },
  chipTextActive: { color: Colors.mint },
});
