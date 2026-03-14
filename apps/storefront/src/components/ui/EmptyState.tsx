import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Unicode icon displayed inside the circle */
  icon?: string;
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
}: EmptyStateProps) {
  const theme = useTheme();
  const { direction } = useDirection();

  return (
    <View style={styles.container}>
      {/* Animated illustration circle with icon */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 14, delay: 100 }}
      >
        <View
          style={[
            styles.illustrationOuter,
            { backgroundColor: `${theme.colors.primary}08` },
          ]}
        >
          <View
            style={[
              styles.illustrationInner,
              { backgroundColor: `${theme.colors.primary}15` },
            ]}
          >
            <Text style={styles.illustrationIcon}>
              {icon || '\u2728'}
            </Text>
          </View>
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 200 }}
      >
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
              writingDirection: direction,
            },
          ]}
        >
          {title}
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 300 }}
      >
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.font('400'),
              writingDirection: direction,
            },
          ]}
        >
          {message}
        </Text>
      </MotiView>

      {actionLabel && onAction && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 400 }}
        >
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
            size="medium"
            style={styles.actionButton}
          />
        </MotiView>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 300, delay: 500 }}
        >
          <Button
            title={secondaryActionLabel}
            onPress={onSecondaryAction}
            variant="text"
            size="medium"
            style={styles.secondaryButton}
          />
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  illustrationOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  illustrationInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationIcon: {
    fontSize: 44,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
  },
  actionButton: {
    minWidth: 180,
    marginBottom: 12,
    alignSelf: 'center',
  },
  secondaryButton: {
    minWidth: 180,
    alignSelf: 'center',
  },
});
