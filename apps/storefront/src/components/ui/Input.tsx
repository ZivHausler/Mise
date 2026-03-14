import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';


interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  containerStyle?: ViewStyle;
  forceLTR?: boolean;
}

export function Input({
  label,
  error,
  hint,
  prefix,
  containerStyle,
  forceLTR = false,
  ...inputProps
}: InputProps) {
  const theme = useTheme();
  const { direction } = useDirection();

  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useSharedValue(theme.colors.border);
  const shadowOpacity = useSharedValue(0);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: withTiming(borderColor.value, { duration: 200 }),
    shadowOpacity: withTiming(shadowOpacity.value, { duration: 200 }),
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    borderColor.value = error ? theme.colors.error : theme.colors.primary;
    shadowOpacity.value = error ? 0 : 0.15;
    inputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    borderColor.value = error ? theme.colors.error : theme.colors.border;
    shadowOpacity.value = 0;
    inputProps.onBlur?.(e);
  };

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error
                ? theme.colors.error
                : isFocused
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
              fontFamily: theme.font('500'),
              writingDirection: direction,
            },
          ]}
        >
          {label}
          {hint && (
            <Text style={{ color: theme.colors.textTertiary, fontWeight: '400', writingDirection: direction }}>
              {' '}({hint})
            </Text>
          )}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderWidth: 1.5,
            borderRadius: theme.sizing.inputBorderRadius,
            height: inputProps.multiline ? undefined : theme.sizing.inputFieldHeight,
            minHeight: inputProps.multiline ? theme.sizing.inputFieldHeight : undefined,
            backgroundColor: theme.colors.card,
            ...(forceLTR && { flexDirection: 'row' as const, direction: 'ltr' as const }),
          },
          animatedBorder,
        ]}
      >
        {prefix && (
          <Text
            style={[
              styles.prefix,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.font('400'),
                borderEndWidth: 1,
                borderEndColor: theme.colors.border,
              },
            ]}
          >
            {prefix}
          </Text>
        )}
        <TextInput
          {...inputProps}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.font('400'),
              textAlign: forceLTR ? 'left' : undefined,
              writingDirection: forceLTR ? 'ltr' : undefined,
            },
            inputProps.style,
          ]}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.primary}
        />
      </Animated.View>
      {error && (
        <Text
          style={[
            styles.error,
            { color: theme.colors.error, fontFamily: theme.font('400'), writingDirection: direction },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  prefix: {
    fontSize: 16,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
    paddingStart: 4,
  },
});
