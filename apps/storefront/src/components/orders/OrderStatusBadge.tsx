import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { getStatusConfig } from '../../constants/orderStatusColors';
import { useReduceMotion } from '../../hooks/useReduceMotion';

interface OrderStatusBadgeProps {
  status: number;
  isPast?: boolean;
}

const STATUS_LABELS: Record<number, string> = {
  0: 'orders.statusPendingApproval',
  1: 'orders.statusReceived',
  2: 'orders.statusInProgress',
  3: 'orders.statusReady',
  4: 'orders.statusDelivered',
  5: 'orders.statusCancelled',
  6: 'orders.statusCancellationRequested',
};

export const OrderStatusBadge = React.memo(
  function OrderStatusBadge({ status, isPast = false }: OrderStatusBadgeProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const { direction } = useDirection();
    const reduceMotion = useReduceMotion();
    const config = getStatusConfig(status);
    const labelKey = STATUS_LABELS[status] ?? 'orders.statusReceived';

    const showPulse = config.hasPulseDot && !isPast && !reduceMotion;
    const showStaticDot = config.hasPulseDot && !isPast;

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isPast ? 'transparent' : config.badgeBg,
            borderColor: config.badgeBorder,
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={t(labelKey)}
      >
        {/* Pulse dot for active/urgent statuses */}
        {showStaticDot && (
          <View style={styles.dotContainer}>
            {showPulse && (
              <MotiView
                from={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 2.2 }}
                transition={{ type: 'timing', duration: 1800, loop: true }}
                style={[styles.pulseRing, { backgroundColor: config.badgeText }]}
              />
            )}
            <View style={[styles.dot, { backgroundColor: config.badgeText }]} />
          </View>
        )}

        <Text
          style={[
            styles.label,
            {
              color: config.badgeText,
              fontFamily: theme.font('600'),
              opacity: isPast ? 0.7 : 1,
              writingDirection: direction,
            },
          ]}
        >
          {t(labelKey)}
        </Text>
      </View>
    );
  },
  (prev, next) => prev.status === next.status && prev.isPast === next.isPast,
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dotContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
