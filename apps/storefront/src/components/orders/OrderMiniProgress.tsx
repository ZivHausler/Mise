import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { getStatusConfig } from '../../constants/orderStatusColors';

interface OrderMiniProgressProps {
  status: number;
}

/**
 * Step mapping: Received(1) -> In Progress(2) -> Ready(3) -> Delivered(4)
 * For status 0 (Pending Approval), all 4 nodes appear grey/pending.
 * For status 6 (Cancellation Requested), show progress up to last known active step with orange tint.
 */
const STEP_STATUSES = [1, 2, 3, 4] as const;

function getActiveStepIndex(status: number): number {
  // status 0: pending approval — no step is active, all grey
  if (status === 0) return -1;
  // NOTE: For status 6 (Cancellation Requested) we cannot determine the prior
  // step from status alone. This shows the minimum (Received). A future
  // improvement could pass previousStatus from the parent component.
  if (status === 6) return 0;
  // For statuses 1-4: map to step index (1->0, 2->1, 3->2, 4->3)
  return Math.min(status - 1, 3);
}

export const OrderMiniProgress = React.memo(
  function OrderMiniProgress({ status }: OrderMiniProgressProps) {
    const theme = useTheme();
    const { isRTL } = useDirection();
    const config = getStatusConfig(status);
    const activeIndex = getActiveStepIndex(status);
    const accentColor = status === 6 ? '#F97316' : config.strip;

    return (
      <View
        style={[styles.container, { flexDirection: 'row' }]}
        accessibilityRole="progressbar"
        accessibilityLabel={`Order step ${Math.max(activeIndex + 1, 0)} of 4`}
      >
        {STEP_STATUSES.map((stepStatus, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isLast = index === STEP_STATUSES.length - 1;

          const nodeColor = isCompleted || isActive
            ? accentColor
            : theme.colors.border;

          const lineColor = isCompleted
            ? accentColor
            : theme.colors.border;

          return (
            <React.Fragment key={stepStatus}>
              {/* Step node */}
              <View style={styles.nodeWrapper}>
                {isActive && (
                  <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 14 }}
                  >
                    <View
                      style={[
                        styles.activeRing,
                        { borderColor: accentColor },
                      ]}
                    >
                      <View style={[styles.nodeFilled, { backgroundColor: accentColor }]} />
                    </View>
                  </MotiView>
                )}
                {!isActive && (
                  <View
                    style={[
                      isCompleted ? styles.nodeFilled : styles.nodeEmpty,
                      isCompleted
                        ? { backgroundColor: nodeColor }
                        : { borderColor: nodeColor },
                    ]}
                  />
                )}
              </View>

              {/* Connector line */}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: lineColor },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  },
  (prev, next) => prev.status === next.status,
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  nodeWrapper: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nodeEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  activeRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 2,
  },
});
