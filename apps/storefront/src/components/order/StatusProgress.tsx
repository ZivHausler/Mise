import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { Card } from '../ui/Card';

const STATUS_STEPS = [
  { key: 'statusReceived', status: 1, icon: '\u{1F4E5}' },
  { key: 'statusInProgress', status: 2, icon: '\u{1F468}\u200D\u{1F373}' },
  { key: 'statusReady', status: 3, icon: '\u{1F4E6}' },
  { key: 'statusDelivered', status: 4, icon: '\u{1F91D}' },
] as const;

interface StatusProgressProps {
  currentStatus: number;
  previousStatus?: number;
  cancellationReason?: string;
}

export function StatusProgress({ currentStatus, previousStatus, cancellationReason }: StatusProgressProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // Mode 1: PENDING_APPROVAL (status 0)
  if (currentStatus === 0) {
    return (
      <Card elevated style={styles.card}>
        <View style={styles.pendingContainer}>
          <MotiView
            from={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ type: 'timing', duration: 2000, loop: true }}
            style={[styles.pendingPulse, { backgroundColor: '#F59E0B' }]}
          />
          <View style={[styles.pendingNode, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.pendingIcon}>{'\u23F3'}</Text>
          </View>
          <Text style={[styles.pendingLabel, { color: '#B45309', fontFamily: theme.font('700') }]}>
            {t('tracking.statusPendingApproval')}
          </Text>
          <Text style={[styles.pendingHint, { color: '#92400E', fontFamily: theme.font('400') }]}>
            {t('tracking.pendingApprovalHint')}
          </Text>
        </View>
      </Card>
    );
  }

  // Mode 2: CANCELLED (status 5)
  if (currentStatus === 5) {
    return (
      <Card elevated style={styles.card}>
        <View style={styles.cancelledContainer}>
          <View style={[styles.cancelledNode, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.cancelledIcon}>{'\u274C'}</Text>
          </View>
          <Text style={[styles.cancelledLabel, { color: '#DC2626', fontFamily: theme.font('700') }]}>
            {t('tracking.statusCancelled')}
          </Text>
          <Text style={[styles.cancelledHint, { color: '#991B1B', fontFamily: theme.font('400') }]}>
            {cancellationReason || t('tracking.cancelledHint')}
          </Text>
        </View>
      </Card>
    );
  }

  // Determine which status to display on the stepper
  const displayStatus = currentStatus === 6 ? (previousStatus ?? 1) : currentStatus;
  const accentColor = currentStatus === 6 ? '#F97316' : theme.colors.primary;

  return (
    <Card elevated style={styles.card}>
      {/* Cancellation requested banner */}
      {currentStatus === 6 && (
        <View style={[styles.cancellationBanner, { backgroundColor: '#FFF7ED' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cancellationBannerTitle, { color: '#C2410C', fontFamily: theme.font('700'), textAlign: 'left' }]}>
              {t('tracking.cancellationRequestedTitle')}
            </Text>
            <Text style={[styles.cancellationBannerHint, { color: '#9A3412', fontFamily: theme.font('400'), textAlign: 'left' }]}>
              {t('tracking.cancellationRequestedHint')}
            </Text>
          </View>
          <Text style={styles.cancellationBannerIcon}>{'\u26A0\uFE0F'}</Text>
        </View>
      )}

      {/* Horizontal stepper */}
      <View style={styles.horizontalContainer}>
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = displayStatus > step.status;
          const isActive = displayStatus === step.status;
          const isLast = index === STATUS_STEPS.length - 1;

          return (
            <React.Fragment key={step.key}>
              {/* Step column: node + label */}
              <View style={styles.stepColumn}>
                {/* Node */}
                <View style={styles.nodeWrapper}>
                  {isActive && (
                    <MotiView
                      from={{ opacity: 0.5, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.8 }}
                      transition={{ type: 'timing', duration: 1500, loop: true }}
                      style={[styles.hPulseRing, { backgroundColor: accentColor }]}
                    />
                  )}
                  <MotiView
                    from={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 14, delay: index * 100 }}
                  >
                    <View
                      style={[
                        styles.hNode,
                        {
                          backgroundColor: isCompleted || isActive ? accentColor : theme.colors.card,
                          borderColor: isCompleted || isActive ? accentColor : theme.colors.border,
                          shadowColor: isActive ? accentColor : 'transparent',
                          shadowOpacity: isActive ? 0.4 : 0,
                          shadowRadius: isActive ? 8 : 0,
                          shadowOffset: { width: 0, height: 0 },
                        },
                      ]}
                    >
                      {isCompleted ? (
                        <Text style={[styles.checkmark, { color: '#FFFFFF' }]}>{'\u2713'}</Text>
                      ) : (
                        <Text style={[styles.hStepIcon, { opacity: isActive ? 1 : 0.4 }]}>{step.icon}</Text>
                      )}
                    </View>
                  </MotiView>
                </View>

                {/* Label below */}
                <Text
                  style={[
                    styles.hLabel,
                    {
                      color: isActive
                        ? accentColor
                        : isCompleted
                          ? theme.colors.textPrimary
                          : theme.colors.textTertiary,
                      fontWeight: isActive || isCompleted ? '600' : '400',
                      fontFamily: theme.font(isActive || isCompleted ? '600' : '400'),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t(`tracking.${step.key}`)}
                </Text>
              </View>

              {/* Connecting line between nodes */}
              {!isLast && (
                <View style={styles.hLineWrapper}>
                  <View
                    style={[
                      styles.hLine,
                      {
                        backgroundColor: isCompleted ? accentColor : 'transparent',
                        borderStyle: isCompleted ? 'solid' : 'dashed',
                        borderColor: isCompleted
                          ? accentColor
                          : isActive
                            ? `${accentColor}60`
                            : theme.colors.border,
                        borderBottomWidth: isCompleted ? 0 : 1.5,
                      },
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
  // ─── Horizontal stepper ─────────────────────────
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepColumn: {
    alignItems: 'center',
    width: 64,
  },
  nodeWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 38,
    height: 38,
    marginBottom: 6,
  },
  hPulseRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    zIndex: -1,
  },
  hNode: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
  },
  hStepIcon: {
    fontSize: 16,
  },
  hLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  hLineWrapper: {
    flex: 1,
    justifyContent: 'center',
    height: 38,
  },
  hLine: {
    height: 2,
  },
  // ─── Pending approval ──────────────────────────
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  pendingPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 24,
  },
  pendingNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  pendingIcon: {
    fontSize: 28,
  },
  pendingLabel: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  pendingHint: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  // ─── Cancelled ─────────────────────────────────
  cancelledContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  cancelledNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelledIcon: {
    fontSize: 28,
  },
  cancelledLabel: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelledHint: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  // ─── Cancellation requested banner ─────────────
  cancellationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  cancellationBannerIcon: {
    fontSize: 20,
  },
  cancellationBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancellationBannerHint: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },
});
