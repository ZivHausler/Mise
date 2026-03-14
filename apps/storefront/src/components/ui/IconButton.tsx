import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  variant?: 'filled' | 'outlined' | 'ghost' | 'tinted';
  disabled?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
  hitSlop?: number;
}

export function IconButton({
  icon,
  onPress,
  size = 44,
  variant = 'ghost',
  disabled = false,
  accessibilityLabel,
  style,
  hitSlop = 8,
}: IconButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: disabled ? 0.5 : 1,
    ...(variant === 'filled' && {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    }),
    ...(variant === 'outlined' && {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
    ...(variant === 'tinted' && {
      backgroundColor: `${theme.colors.primary}12`,
    }),
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      hitSlop={hitSlop}
      style={[containerStyle, animatedStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {icon}
    </AnimatedPressable>
  );
}
