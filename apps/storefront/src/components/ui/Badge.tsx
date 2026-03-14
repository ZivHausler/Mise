import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium';
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', size = 'small', icon, style }: BadgeProps) {
  const theme = useTheme();
  const { direction } = useDirection();

  // Use softer tinted backgrounds for non-default variants
  const bgColor = {
    default: theme.colors.surfaceSecondary,
    primary: `${theme.colors.primary}18`,
    success: '#22C55E18',
    warning: '#F59E0B18',
    error: '#EF444418',
  }[variant];

  const textColor = {
    default: theme.colors.textPrimary,
    primary: theme.colors.primary,
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
  }[variant];

  const borderColor = {
    default: theme.colors.border,
    primary: `${theme.colors.primary}30`,
    success: '#22C55E30',
    warning: '#F59E0B30',
    error: '#EF444430',
  }[variant];

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          paddingHorizontal: isSmall ? 10 : 14,
          paddingVertical: isSmall ? 4 : 6,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.label,
          {
            color: textColor,
            fontSize: isSmall ? 12 : 14,
            fontWeight: '600',
            fontFamily: theme.font('600'),
            letterSpacing: 0.2,
            writingDirection: direction,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  icon: {
    marginEnd: 2,
  },
  label: {
    textAlign: 'center',
  },
});
