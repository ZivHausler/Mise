import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { SkeletonRect } from '../ui/SkeletonRect';
import { useDirection } from '../../contexts/DirectionContext';
import { useTheme } from '../../theme';

export const OrderCardSkeleton = React.memo(function OrderCardSkeleton() {
  const { isRTL } = useDirection();
  const theme = useTheme();
  const shimmerTranslate = useSharedValue(isRTL ? 200 : -200);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(isRTL ? -200 : 200, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(shimmerTranslate);
  }, [shimmerTranslate]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.colors.card }]}>
      {/* Accent strip placeholder */}
      <View style={styles.stripPlaceholder} />

      <View style={styles.contentArea}>
        {/* Zone 1: Avatar + text + badge */}
        <View style={styles.zone1}>
          <View style={styles.avatarWrapper}>
            <SkeletonRect width={44} height={44} borderRadius={12} />
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
          </View>

          <View style={styles.infoColumn}>
            <View style={[styles.shimmerBlock, { width: 120, height: 16, borderRadius: 4 }]}>
              <SkeletonRect width={120} height={16} borderRadius={4} />
              <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
            </View>
            <View style={[styles.shimmerBlock, { width: 80, height: 13, borderRadius: 4 }]}>
              <SkeletonRect width={80} height={13} borderRadius={4} />
              <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
            </View>
          </View>

          <View style={[styles.shimmerBlock, { width: 90, height: 24, borderRadius: 999 }]}>
            <SkeletonRect width={90} height={24} borderRadius={999} />
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
          </View>
        </View>

        {/* Zone 2: Mini progress placeholder */}
        <View style={styles.zone2}>
          <View style={[styles.shimmerBlock, { width: '80%', height: 14, borderRadius: 4 }]}>
            <SkeletonRect width="80%" height={14} borderRadius={4} />
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
          </View>
        </View>

        {/* Zone 3: Footer */}
        <View style={styles.zone3}>
          <View style={[styles.shimmerBlock, { width: 60, height: 13, borderRadius: 4 }]}>
            <SkeletonRect width={60} height={13} borderRadius={4} />
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
          </View>
          <View style={[styles.shimmerBlock, { width: 50, height: 13, borderRadius: 4 }]}>
            <SkeletonRect width={50} height={13} borderRadius={4} />
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
          </View>
          <View style={[styles.shimmerBlock, { width: 50, height: 17, borderRadius: 4 }]}>
            <SkeletonRect width={50} height={17} borderRadius={4} />
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  stripPlaceholder: {
    width: 4,
    borderTopStartRadius: 16,
    borderBottomStartRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  contentArea: {
    flex: 1,
    paddingVertical: 14,
    paddingStart: 14,
    paddingEnd: 16,
  },
  zone1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shimmerBlock: {
    overflow: 'hidden',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.65)',
    width: 40,
  },
  infoColumn: {
    flex: 1,
    gap: 6,
  },
  zone2: {
    marginTop: 10,
    paddingStart: 54,
  },
  zone3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
});
