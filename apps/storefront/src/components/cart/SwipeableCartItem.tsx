import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { useHaptics } from '../../hooks/useHaptics';
import { CartItemRow } from './CartItemRow';
import type { CartItem } from '../../stores/cartStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DELETE_THRESHOLD = 80;
const AUTO_DELETE_THRESHOLD = 160;

interface SwipeableCartItemProps {
  item: CartItem;
  onDelete: () => void;
  onUpdateQuantity: (quantity: number) => void;
}

export function SwipeableCartItem({ item, onDelete, onUpdateQuantity }: SwipeableCartItemProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const haptics = useHaptics();
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(96);
  const rowOpacity = useSharedValue(1);
  const hasTriggeredHaptic = useSharedValue(false);

  const handleDelete = useCallback(() => {
    haptics.notificationSuccess();
    rowOpacity.value = withTiming(0, { duration: 200 });
    rowHeight.value = withTiming(0, { duration: 300 });
    const dismissDirection = isRTL ? SCREEN_WIDTH : -SCREEN_WIDTH;
    translateX.value = withTiming(dismissDirection, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(onDelete)();
      }
    });
  }, [onDelete]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      const x = isRTL
        ? Math.max(0, event.translationX)
        : Math.min(0, event.translationX);
      translateX.value = x;

      if (Math.abs(x) >= DELETE_THRESHOLD && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(haptics.notificationWarning)();
      }
    })
    .onEnd((event) => {
      hasTriggeredHaptic.value = false;

      if (Math.abs(event.translationX) >= AUTO_DELETE_THRESHOLD) {
        runOnJS(handleDelete)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    height: rowHeight.value,
    opacity: rowOpacity.value,
    overflow: 'hidden' as const,
  }));

  const deleteStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const opacity = interpolate(absX, [0, DELETE_THRESHOLD * 0.5, DELETE_THRESHOLD], [0, 0.5, 1], Extrapolation.CLAMP);
    const scale = interpolate(absX, [0, DELETE_THRESHOLD], [0.6, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const deleteBackgroundStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const opacity = interpolate(absX, [0, DELETE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  return (
    <Animated.View style={containerStyle}>
      {/* Delete background — red gradient feel */}
      <Animated.View
        style={[
          styles.deleteBackground,
          deleteBackgroundStyle,
        ]}
      >
        <View style={[styles.deleteGradient, { backgroundColor: '#FEE2E2', alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
          <Animated.View style={[styles.deleteIconWrapper, deleteStyle]}>
            <View
              style={[
                styles.deleteCircle,
                { backgroundColor: theme.colors.error },
              ]}
            >
              <Text style={styles.deleteIcon}>{'\u{1F5D1}'}</Text>
            </View>
            <Text
              style={[
                styles.deleteLabel,
                {
                  color: theme.colors.error,
                  fontFamily: theme.font('600'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('cart.delete')}
            </Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Swipeable row */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.row, { backgroundColor: theme.colors.card }, rowStyle]}>
          <CartItemRow item={item} onUpdateQuantity={onUpdateQuantity} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  deleteGradient: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  deleteIconWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  deleteCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  deleteLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    width: '100%',
  },
});
