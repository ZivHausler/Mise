import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useHaptics } from '../../hooks/useHaptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuickAddButtonProps {
  onPress: () => void;
}

export function QuickAddButton({ onPress }: QuickAddButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    haptics.impactLight();
    scale.value = withSequence(
      withSpring(0.85, { damping: 12 }),
      withSpring(1, { damping: 12 }),
    );
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          width: theme.sizing.quickAddButtonDiameter,
          height: theme.sizing.quickAddButtonDiameter,
          shadowColor: theme.colors.primary,
        },
        animatedStyle,
      ]}
      hitSlop={8}
      accessibilityLabel={t('menu.addToCart')}
      accessibilityRole="button"
    >
      <Text style={[styles.plus, { color: theme.colors.onPrimary }]}>+</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  plus: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },
});
