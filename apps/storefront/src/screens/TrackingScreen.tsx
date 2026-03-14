import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useOrderStatus } from '../api/hooks';
import { useCancelStorefrontOrder } from '../api/hooks';
import { useOrderSSE } from '../hooks/useOrderSSE';
import { useStoreStore } from '../stores';
import { StatusProgress } from '../components/order/StatusProgress';
import { OrderSummaryCard } from '../components/order/OrderSummaryCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { IconButton } from '../components/ui/IconButton';
import { SkeletonRect } from '../components/ui/SkeletonRect';
import { ChevronRight } from 'lucide-react-native';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Tracking'>;

export function TrackingScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const { slug, orderNumber, phone: phoneParam } = route.params;
  const storeInfo = useStoreStore((s) => s.storeInfo);

  // When arriving via deep link, phone may be undefined — prompt user to enter it
  const [phoneInput, setPhoneInput] = useState('');
  const needsPhone = !phoneParam;
  const phone = phoneParam || phoneInput;

  const { data: orderStatus, isLoading, isFetching } = useOrderStatus(
    slug,
    orderNumber,
    phone,
    { refetchInterval: 30_000 }, // Fallback polling every 30s (SSE handles real-time)
  );

  // Real-time updates via SSE — invalidates query cache on status change
  useOrderSSE(slug, orderNumber, phone);

  // Cancel order state
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const cancelMutation = useCancelStorefrontOrder(slug);

  const handleCallStore = () => {
    if (storeInfo?.phone) {
      Linking.openURL(`tel:${storeInfo.phone}`);
    }
  };

  const handleCancel = useCallback(() => {
    if (!phone) return;
    cancelMutation.mutate(
      { orderNumber, phone, reason: cancelReason || undefined },
      {
        onSuccess: () => {
          setShowCancelSheet(false);
          setCancelReason('');
        },
      },
    );
  }, [cancelMutation, orderNumber, phone, cancelReason]);

  const status = orderStatus?.status;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <IconButton
          icon={
            <View style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }}>
              <ChevronRight size={24} color={theme.colors.textPrimary} strokeWidth={2} />
            </View>
          }
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel={t('common.back')}
        />
        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.colors.textStrong,
                fontFamily: theme.font('700'),
                writingDirection: direction,
              },
            ]}
          >
            {t('tracking.title')}
          </Text>
          {/* Live updating indicator */}
          {isFetching && !isLoading && (
            <MotiView
              from={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 600, loop: true }}
              style={[styles.liveIndicator, { backgroundColor: theme.colors.success }]}
            />
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Phone input for deep link arrivals */}
        {needsPhone && !phone && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
          >
            <Card style={styles.phoneCard}>
              <Text style={styles.phoneIcon}>{'\u{1F4F1}'}</Text>
              <Text
                style={[
                  styles.phoneLabel,
                  {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.font('600'),
                    writingDirection: direction,
                  },
                ]}
              >
                {t('tracking.enterPhone')}
              </Text>
              <Input
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder={t('tracking.phonePlaceholder')}
                keyboardType="phone-pad"
              />
            </Card>
          </MotiView>
        )}

        {/* Order Number Header */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 100 }}
        >
          <View style={styles.orderHeader}>
            <Text
              style={[
                styles.orderLabel,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.font('400'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('tracking.orderNumber', { number: '' }).replace(/[#\d]/g, '').trim()}
            </Text>
            <Text
              style={[
                styles.orderNumber,
                {
                  color: theme.colors.primary,
                  fontFamily: theme.font('700'),
                  writingDirection: direction,
                },
              ]}
            >
              #{orderNumber}
            </Text>
          </View>
        </MotiView>

        {/* Loading */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonRect width="100%" height={220} borderRadius={16} />
            <SkeletonRect width="100%" height={80} borderRadius={16} />
            <SkeletonRect width="100%" height={120} borderRadius={16} />
          </View>
        ) : orderStatus ? (
          <>
            {/* Status Progress - Hero element */}
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 200 }}
            >
              <StatusProgress
                currentStatus={orderStatus.status}
                previousStatus={orderStatus.previousStatus}
                cancellationReason={orderStatus.cancellationReason}
              />
            </MotiView>

            {/* Cancel / Request Cancel button */}
            {status != null && [0, 1, 2, 3].includes(status) && (
              <MotiView
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 250 }}
              >
                <Button
                  title={
                    status === 0
                      ? t('tracking.cancelOrder')
                      : t('tracking.requestCancellation')
                  }
                  onPress={() => setShowCancelSheet(true)}
                  variant={status === 0 ? 'cancel-filled' : 'cancel-outlined'}
                  size="medium"
                  style={{ alignSelf: 'stretch' }}
                />
              </MotiView>
            )}

            {status === 6 && (
              <MotiView
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 250 }}
              >
                <Button
                  title={t('tracking.cancellationPending')}
                  onPress={() => {}}
                  variant="cancel-outlined"
                  size="medium"
                  disabled
                  style={{ alignSelf: 'stretch' }}
                />
              </MotiView>
            )}

            {/* Order Details */}
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 350 }}
            >
              <OrderSummaryCard
                items={orderStatus.items}
                totalAmount={orderStatus.totalAmount}
                collapsible
              />
            </MotiView>

            {/* Pickup Info & Call Store */}
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 500 }}
            >
              <Card>
                {orderStatus.dueDate && (
                  <>
                    <View style={styles.pickupHeader}>
                      <Text style={styles.pickupIcon}>{'\u{1F551}'}</Text>
                      <Text
                        style={[
                          styles.pickupLabel,
                          {
                            color: theme.colors.textStrong,
                            fontFamily: theme.font('600'),
                            writingDirection: direction,
                          },
                        ]}
                      >
                        {t('tracking.pickupDate')}
                      </Text>
                      <Text
                        style={[
                          styles.pickupDateValue,
                          {
                            color: theme.colors.textPrimary,
                            fontFamily: theme.font('500'),
                            writingDirection: direction,
                          },
                        ]}
                      >
                        {new Date(orderStatus.dueDate).toLocaleString('he-IL', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={[styles.pickupDivider, { backgroundColor: theme.colors.border }]} />
                  </>
                )}
                <View style={styles.pickupHeader}>
                  <Text style={styles.pickupIcon}>{'\u{1F4CD}'}</Text>
                  <Text
                    style={[
                      styles.pickupLabel,
                      {
                        color: theme.colors.textStrong,
                        fontFamily: theme.font('600'),
                        writingDirection: direction,
                      },
                    ]}
                  >
                    {t('tracking.pickupLocation')}
                  </Text>
                </View>
                {storeInfo?.address && (
                  <Text
                    style={[
                      styles.pickupAddress,
                      {
                        color: theme.colors.textSecondary,
                        fontFamily: theme.font('400'),
                        writingDirection: direction,
                      },
                    ]}
                  >
                    {storeInfo.address}
                  </Text>
                )}
                {storeInfo?.phone && (
                  <Button
                    title={t('tracking.callStore')}
                    onPress={handleCallStore}
                    variant="outlined"
                    size="medium"
                    icon={
                      <Text style={{ fontSize: 16 }}>{'\u{1F4DE}'}</Text>
                    }
                    style={styles.callButton}
                  />
                )}
              </Card>
            </MotiView>
          </>
        ) : null}
      </ScrollView>

      {/* Cancel Confirmation Bottom Sheet */}
      <Modal visible={showCancelSheet} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCancelSheet(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: theme.colors.textStrong, fontFamily: theme.font('700'), writingDirection: direction }]}>
              {status === 0 ? t('tracking.cancelOrderTitle') : t('tracking.requestCancellationTitle')}
            </Text>
            <Text style={[styles.sheetMessage, { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction }]}>
              {status === 0 ? t('tracking.cancelOrderMessage') : t('tracking.requestCancellationMessage')}
            </Text>
            <Input
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={t('tracking.cancelReasonPlaceholder')}
              multiline
              numberOfLines={3}
            />
            <View style={styles.sheetActions}>
              <Button
                title={t('common.back')}
                onPress={() => setShowCancelSheet(false)}
                variant="secondary"
                size="medium"
                style={{ flex: 1 }}
              />
              <Button
                title={status === 0 ? t('tracking.confirmCancel') : t('tracking.confirmRequest')}
                onPress={handleCancel}
                variant="destructive"
                size="medium"
                loading={cancelMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  orderHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  skeletonContainer: {
    gap: 16,
  },
  phoneCard: {
    gap: 12,
    alignItems: 'center',
  },
  phoneIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  phoneLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pickupIcon: {
    fontSize: 18,
  },
  pickupLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickupDateValue: {
    fontSize: 14,
    marginStart: 'auto',
  },
  pickupDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  pickupAddress: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  callButton: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  // Bottom sheet styles
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
