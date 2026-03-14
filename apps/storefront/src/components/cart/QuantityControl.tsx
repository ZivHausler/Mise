import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Plus, Minus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useHaptics } from '../../hooks/useHaptics';
import { useTranslation } from 'react-i18next';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuantityControlProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  /** 'compact' for cart rows, 'large' for detail sheet */
  size?: 'compact' | 'large';
}

export function QuantityControl({
  quantity,
  onIncrease,
  onDecrease,
  size = 'compact',
}: QuantityControlProps) {
  const theme = useTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();

  const scaleDecrease = useSharedValue(1);
  const scaleIncrease = useSharedValue(1);
  const qtyTranslateY = useSharedValue(0);
  const qtyOpacity = useSharedValue(1);
  const qtyScale = useSharedValue(1);

  const isLarge = size === 'large';
  const btnSize = isLarge ? 52 : 34;
  const iconSize = isLarge ? 22 : 16;
  const fontSize = isLarge ? 28 : 16;
  const pillRadius = isLarge ? 28 : 19;
  const pillPadding = isLarge ? 4 : 3;
  const qtyMinWidth = isLarge ? 56 : 36;

  const isDelete = quantity <= 1;

  const handleIncrease = () => {
    haptics.selectionChanged();
    qtyTranslateY.value = -12;
    qtyOpacity.value = 0;
    onIncrease();
    qtyTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
    qtyOpacity.value = withTiming(1, { duration: 150 });
    qtyScale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12 }),
    );
  };

  const handleDecrease = () => {
    haptics.selectionChanged();
    qtyTranslateY.value = 12;
    qtyOpacity.value = 0;
    onDecrease();
    qtyTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
    qtyOpacity.value = withTiming(1, { duration: 150 });
    qtyScale.value = withSequence(
      withSpring(0.85, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12 }),
    );
  };

  const decreaseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleDecrease.value }],
  }));

  const increaseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleIncrease.value }],
  }));

  const qtyAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: qtyTranslateY.value },
      { scale: qtyScale.value },
    ],
    opacity: qtyOpacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: pillRadius,
          paddingHorizontal: pillPadding,
          paddingVertical: pillPadding,
        },
      ]}
    >
      {/* Decrease button */}
      <AnimatedPressable
        onPress={handleDecrease}
        disabled={isDelete}
        onPressIn={() => {
          scaleDecrease.value = withSpring(0.82, { damping: 10, stiffness: 250 });
        }}
        onPressOut={() => {
          scaleDecrease.value = withSequence(
            withSpring(1.06, { damping: 8, stiffness: 250 }),
            withSpring(1, { damping: 14 }),
          );
        }}
        style={[
          decreaseStyle,
          {
            width: btnSize,
            height: btnSize,
            borderRadius: btnSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: isDelete ? 'transparent' : theme.colors.card,
            borderWidth: 1,
            borderColor: isDelete ? theme.colors.border : theme.colors.border,
            opacity: isDelete ? 0.4 : 1,
          },
        ]}
        accessibilityLabel={t('cart.decreaseQuantity')}
        accessibilityRole="button"
        hitSlop={4}
      >
        <Minus
          size={iconSize}
          strokeWidth={2.5}
          color={isDelete ? theme.colors.textTertiary : theme.colors.textPrimary}
        />
      </AnimatedPressable>

      {/* Quantity */}
      <View
        style={{
          minWidth: qtyMinWidth,
          height: isLarge ? 40 : 28,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.Text
          style={[
            qtyAnim,
            {
              fontSize,
              fontWeight: '700',
              textAlign: 'center',
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
            },
          ]}
        >
          {quantity}
        </Animated.Text>
      </View>

      {/* Increase button */}
      <AnimatedPressable
        onPress={handleIncrease}
        onPressIn={() => {
          scaleIncrease.value = withSpring(0.82, { damping: 10, stiffness: 250 });
        }}
        onPressOut={() => {
          scaleIncrease.value = withSequence(
            withSpring(1.06, { damping: 8, stiffness: 250 }),
            withSpring(1, { damping: 14 }),
          );
        }}
        style={[
          increaseStyle,
          {
            width: btnSize,
            height: btnSize,
            borderRadius: btnSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.primary,
            borderWidth: 1,
            borderColor: 'transparent',
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 3,
          },
        ]}
        accessibilityLabel={t('cart.increaseQuantity')}
        accessibilityRole="button"
        hitSlop={4}
      >
        <Plus
          size={iconSize}
          strokeWidth={2.5}
          color={theme.colors.onPrimary}
        />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
