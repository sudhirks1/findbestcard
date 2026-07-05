import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../utils/constants';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  border?: boolean;
}

export default function GlassContainer({ children, style, intensity = 20, border = true }: Props) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.blur, border && styles.border, style]}>
      <View style={styles.inner}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  border: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  inner: {
    flex: 1,
  },
});
