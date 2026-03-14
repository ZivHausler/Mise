import React, { useEffect } from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { useCartStore, useUIStore } from '../../stores';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingCartButtonProps {
  onPress: () => void;
}

export function FloatingCartButton({ onPress }: FloatingCartButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { direction } = useDirection();
  const insets = useSafeAreaInsets();
  const itemCount = useCartStore((s) => s.getItemCount());
  const subtotal = useCartStore((s) => s.getSubtotal());
  const sheetOpen = useUIStore((s) => s.openSheetCount > 0);

  const translateY = useSharedValue(0);
  const badgeScale = useSharedValue(1);

  // Bounce when item count changes
  useEffect(() => {
    if (itemCount > 0) {
      translateY.value = withSequence(
        withSpring(-6, { damping: 8, stiffness: 200 }),
        withSpring(0, { damping: 12 }),
      );
      badgeScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1, { damping: 8 }),
      );
    }
  }, [itemCount]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (itemCount === 0 || sheetOpen) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.wrapper,
        { bottom: 8, paddingHorizontal: 20 },
      ]}
    >
      {/* Button */}
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            height: theme.sizing.floatingCartButtonHeight,
            shadowColor: theme.colors.primary,
          },
          containerStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('cart.itemsCount', { count: itemCount })}
      >
        {/* Left side: cart label + count badge */}
        <View style={styles.leftSection}>
          <Text style={styles.cartIcon}>{'\u{1F6D2}'}</Text>
          <Animated.View
            style={[
              styles.badge,
              { backgroundColor: 'rgba(255,255,255,0.25)' },
              badgeStyle,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: theme.colors.onPrimary,
                  fontFamily: theme.font('700'),
                  writingDirection: direction,
                },
              ]}
            >
              {itemCount}
            </Text>
          </Animated.View>
          <Text
            style={[
              styles.viewCart,
              {
                color: theme.colors.onPrimary,
                fontFamily: theme.font('600'),
                writingDirection: direction,
              },
            ]}
          >
            {t('cart.title')}
          </Text>
        </View>

        {/* Right side: price */}
        <Text
          style={[
            styles.total,
            {
              color: theme.colors.onPrimary,
              fontFamily: theme.font('700'),
              writingDirection: 'ltr',
            },
          ]}
        >
          {subtotal} ₪
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartIcon: {
    fontSize: 18,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewCart: {
    fontSize: 15,
    fontWeight: '600',
  },
  total: {
    fontSize: 17,
    fontWeight: '700',
  },
});
