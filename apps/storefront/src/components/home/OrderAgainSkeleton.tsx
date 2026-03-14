/**
 * OrderAgainSkeleton — Loading placeholder for the Order Again section.
 * Shows 2 pulsing skeleton cards that match the real card dimensions.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '../../theme';
import { CARD_WIDTH, CARD_GAP } from './OrderAgainCard';

interface OrderAgainSkeletonProps {
  count?: number;
}

function SkeletonCard() {
  const theme = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const blockColor = theme.colors.surfaceSecondary;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
        animatedStyle,
      ]}
    >
      {/* Zone A skeleton */}
      <View style={styles.headerRow}>
        <View style={[styles.avatarBlock, { backgroundColor: blockColor }]} />
        <View style={styles.headerTextColumn}>
          <View style={[styles.textBlock, styles.nameBlock, { backgroundColor: blockColor }]} />
          <View style={[styles.textBlock, styles.previewBlock, { backgroundColor: blockColor }]} />
        </View>
        <View style={[styles.textBlock, styles.dateBlock, { backgroundColor: blockColor }]} />
      </View>

      {/* Zone B skeleton */}
      <View style={styles.photoRow}>
        <View style={[styles.photoBlock, { backgroundColor: blockColor }]} />
        <View style={[styles.photoBlock, { backgroundColor: blockColor }]} />
      </View>

      {/* Zone C skeleton */}
      <View style={[styles.buttonBlock, { backgroundColor: blockColor }]} />
    </Animated.View>
  );
}

export function OrderAgainSkeleton({ count = 2 }: OrderAgainSkeletonProps) {
  return (
    <View style={[styles.container, { gap: CARD_GAP }]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingStart: 20,
    paddingEnd: 20,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBlock: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  headerTextColumn: {
    flex: 1,
    gap: 6,
  },
  textBlock: {
    borderRadius: 6,
  },
  nameBlock: {
    height: 14,
    width: '70%',
  },
  previewBlock: {
    height: 12,
    width: '90%',
  },
  dateBlock: {
    height: 12,
    width: 40,
    marginStart: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  photoBlock: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  buttonBlock: {
    height: 40,
    borderRadius: 10,
    marginTop: 12,
  },
});
