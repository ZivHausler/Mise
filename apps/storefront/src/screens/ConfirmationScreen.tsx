import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useStoreStore } from '../stores';
import { useHaptics } from '../hooks/useHaptics';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Confirmation'>;

export function ConfirmationScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const haptics = useHaptics();
  const slug = useStoreStore((s) => s.slug);
  const storeInfo = useStoreStore((s) => s.storeInfo);

  const { orderNumber, totalAmount, itemCount, items, dueDate, paymentMethod, phone, orderDate } = route.params;

  useEffect(() => {
    haptics.notificationSuccess();
  }, []);

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleString('he-IL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const formattedOrderDate = orderDate
    ? new Date(orderDate).toLocaleString('he-IL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Decorative top arc */}
        <View style={[styles.decorativeArc, { backgroundColor: `${theme.colors.primary}08` }]} />

        {/* Success Animation - Outer ring + Inner circle + Checkmark */}
        <MotiView
          from={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 100 }}
          style={styles.successContainer}
        >
          {/* Pulsing outer glow */}
          <MotiView
            from={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ type: 'timing', duration: 2000, loop: true }}
            style={[
              styles.pulseOuter,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          {/* Static outer ring */}
          <View
            style={[
              styles.outerRing,
              { backgroundColor: `${theme.colors.primary}15` },
            ]}
          >
            <View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                },
              ]}
            >
              <Text style={[styles.checkIcon, { color: theme.colors.onPrimary }]}>
                {'\u2713'}
              </Text>
            </View>
          </View>
        </MotiView>

        {/* Title */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 350 }}
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
            {t('confirmation.title')}
          </Text>
        </MotiView>

        {/* Order Number - big, tappable, with a subtle bg */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 450 }}
        >
          <View
            style={[
              styles.orderNumberContainer,
              { backgroundColor: `${theme.colors.primary}10` },
            ]}
          >
            <Text
              style={[
                styles.orderNumberLabel,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.font('500'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('confirmation.orderNumberLabel')}
            </Text>
            <Text
              style={[
                styles.orderNumber,
                {
                  color: theme.colors.primary,
                  fontFamily: theme.font('700'),
                },
              ]}
            >
              #{orderNumber}
            </Text>
          </View>
        </MotiView>

        {/* Status Badge */}
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 14, delay: 550 }}
          style={styles.badgeContainer}
        >
          <Badge
            label={t('confirmation.statusReceived')}
            variant="success"
            size="medium"
          />
        </MotiView>

        {/* Summary Card */}
        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 650 }}
          style={styles.cardWrapper}
        >
          <Card elevated>
            {/* Order Date */}
            {formattedOrderDate && (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <Text style={styles.summaryIcon}>{'\u{1F4C5}'}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction }]}>
                      {t('confirmation.orderDate')}
                    </Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: theme.colors.textPrimary, fontFamily: theme.font('500'), writingDirection: direction }]}>
                    {formattedOrderDate}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              </>
            )}

            {/* Pickup */}
            {formattedDueDate && (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <Text style={styles.summaryIcon}>{'\u{1F551}'}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction }]}>
                      {t('confirmation.pickup')}
                    </Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: theme.colors.textPrimary, fontFamily: theme.font('500'), writingDirection: direction }]}>
                    {formattedDueDate}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              </>
            )}

            {/* Store address */}
            {storeInfo?.address && (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <Text style={styles.summaryIcon}>{'\u{1F4CD}'}</Text>
                    <Text
                      style={[
                        styles.summaryLabel,
                        {
                          color: theme.colors.textSecondary,
                          fontFamily: theme.font('400'),
                          flex: 1,
                          writingDirection: direction,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {storeInfo.address}
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              </>
            )}

            {/* Payment */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <Text style={styles.summaryIcon}>{'\u{1F4B3}'}</Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction }]}>
                  {t('confirmation.payment')}
                </Text>
              </View>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary, fontFamily: theme.font('500'), writingDirection: direction }]}>
                {paymentMethod === 'paypal'
                  ? t('confirmation.paidWithPaypal')
                  : t('confirmation.payAtPickup')}
              </Text>
            </View>
          </Card>

          {/* Items Breakdown */}
          <View style={{ marginTop: 16, width: '100%' }}>
            <Card elevated>
              <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <Text style={styles.summaryIcon}>{'\u{1F6D2}'}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textStrong, fontFamily: theme.font('600'), writingDirection: direction }]}>
                    {t('confirmation.items')}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              {items.map((item, index) => (
                <React.Fragment key={index}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryRowLeft}>
                      {item.photo ? (
                        <Image
                          source={{ uri: item.photo }}
                          style={styles.itemPhoto}
                          contentFit="cover"
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.summaryLabel,
                          {
                            color: theme.colors.textPrimary,
                            fontFamily: theme.font('400'),
                            writingDirection: direction,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.itemPriceCol}>
                      <Text
                        style={[
                          styles.itemPrice,
                          {
                            color: theme.colors.textSecondary,
                            fontFamily: theme.font('400'),
                            writingDirection: 'ltr',
                          },
                        ]}
                      >
                        {item.quantity} x {item.price.toFixed(0)} {'\u20AA'}
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          {
                            color: theme.colors.textStrong,
                            fontFamily: theme.font('600'),
                            writingDirection: 'ltr',
                          },
                        ]}
                      >
                        {(item.quantity * item.price).toFixed(0)} {'\u20AA'}
                      </Text>
                    </View>
                  </View>
                  {index < items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  )}
                </React.Fragment>
              ))}

              <View style={[styles.totalDivider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: theme.colors.textStrong, fontFamily: theme.font('700'), writingDirection: direction }]}>
                  {t('confirmation.total')}
                </Text>
                <Text style={[styles.summaryValueBold, { color: theme.colors.primary, fontFamily: theme.font('700'), writingDirection: 'ltr' }]}>
                  {totalAmount} {'\u20AA'}
                </Text>
              </View>
            </Card>
          </View>
        </MotiView>

        {/* Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 800 }}
          style={styles.actions}
        >
          <View style={styles.actionsRow}>
            <Button
              title={t('confirmation.trackOrder')}
              onPress={() =>
                navigation.replace('Tracking', {
                  slug,
                  orderNumber,
                  phone,
                })
              }
              variant="primary"
              size="large"
              style={styles.actionButton}
            />
            <Button
              title={t('confirmation.backToMenu')}
              onPress={() => navigation.popToTop()}
              variant="outlined"
              size="large"
              style={styles.actionButton}
            />
          </View>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  decorativeArc: {
    position: 'absolute',
    top: -120,
    width: 400,
    height: 280,
    borderRadius: 200,
  },
  successContainer: {
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  checkIcon: {
    fontSize: 38,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
  },
  orderNumberContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumberLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  badgeContainer: {
    marginBottom: 24,
  },
  cardWrapper: {
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValueBold: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  totalDivider: {
    height: 1,
    marginVertical: 10,
  },
  itemPhoto: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 12,
    lineHeight: 18,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    marginTop: 28,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
