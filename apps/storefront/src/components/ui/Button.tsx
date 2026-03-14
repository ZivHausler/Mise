import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outlined' | 'text' | 'destructive' | 'cancel-filled' | 'cancel-outlined';
  size?: 'large' | 'medium';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const { direction } = useDirection();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const height = size === 'large' ? theme.sizing.buttonHeightPrimary : theme.sizing.buttonHeightSecondary;
  const isPill = variant === 'primary' || variant === 'destructive' || variant === 'outlined' || variant === 'cancel-filled' || variant === 'cancel-outlined';

  const containerStyle: ViewStyle = {
    height,
    borderRadius: isPill ? height / 2 : theme.sizing.buttonBorderRadius,
    paddingHorizontal: size === 'large' ? theme.spacing['3xl'] : theme.spacing['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    opacity: disabled ? 0.5 : 1,
    ...(variant === 'primary' && {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    }),
    ...(variant === 'secondary' && {
      backgroundColor: theme.colors.surfaceSecondary,
    }),
    ...(variant === 'outlined' && {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    }),
    ...(variant === 'text' && {
      backgroundColor: 'transparent',
      height: 'auto' as unknown as number,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    }),
    ...(variant === 'destructive' && {
      backgroundColor: theme.colors.error,
      shadowColor: theme.colors.error,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    }),
    ...(variant === 'cancel-filled' && {
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: '#EF4444',
    }),
    ...(variant === 'cancel-outlined' && {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: '#EF4444',
    }),
  };

  const labelStyle: TextStyle = {
    fontSize: size === 'large' ? 16 : 14,
    fontWeight: '600',
    fontFamily: theme.font('600'),
    letterSpacing: 0.3,
    ...(variant === 'primary' && { color: theme.colors.onPrimary }),
    ...(variant === 'secondary' && { color: theme.colors.textPrimary }),
    ...(variant === 'outlined' && { color: theme.colors.primary }),
    ...(variant === 'text' && { color: theme.colors.primary }),
    ...(variant === 'destructive' && { color: theme.colors.onPrimary }),
    ...(variant === 'cancel-filled' && { color: '#FFFFFF' }),
    ...(variant === 'cancel-outlined' && { color: '#EF4444' }),
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[containerStyle, animatedStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' || variant === 'cancel-filled' ? theme.colors.onPrimary : variant === 'cancel-outlined' ? '#EF4444' : theme.colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[labelStyle, { writingDirection: direction }, textStyle]}>{title}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}
