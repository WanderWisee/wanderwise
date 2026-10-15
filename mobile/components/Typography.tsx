import { forwardRef, type ComponentRef } from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
} from 'react-native';
import { Fonts } from '../constants/theme';

function fontStyle(style: TextProps['style']) {
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight;
  const family = weight === 'bold' || Number(weight) >= 700 ? Fonts.bold
    : Number(weight) >= 600 ? Fonts.semibold
    : Number(weight) >= 500 ? Fonts.medium
    : flattened?.fontFamily || Fonts.regular;
  return [{ fontFamily: Fonts.regular }, style, { fontFamily: family, fontWeight: 'normal' as const }];
}

export const Text = forwardRef<ComponentRef<typeof NativeText>, TextProps>(function Text({ style, ...props }, ref) {
  return <NativeText ref={ref} {...props} style={fontStyle(style)} />;
});

export const TextInput = forwardRef<ComponentRef<typeof NativeTextInput>, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={fontStyle(style)} />;
});
