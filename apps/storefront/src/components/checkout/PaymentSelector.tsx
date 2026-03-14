import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { CartItem } from '../../stores/cartStore';

type PaymentMethod = 'pay_at_pickup' | 'paypal';

interface PaymentSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  onPlaceOrder: () => void;
  loading?: boolean;
  itemCount: number;
  total: number;
  items: CartItem[];
  dueDate?: string;
  dueTime?: string;
}

export function PaymentSelector({
  selected,
  onSelect,
  onPlaceOrder,
  loading = false,
  itemCount,
  total,
  items,
  dueDate,
  dueTime,
}: PaymentSelectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIconCircle,
              { backgroundColor: `${theme.colors.primary}12` },
            ]}
          >
            <Text style={styles.sectionIcon}>{'\u{1F4B3}'}</Text>
          </View>
          <View style={styles.sectionTextContainer}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textStrong,
                  fontFamily: theme.font('600'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.stepPayment')}
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: theme.colors.textTertiary,
                  fontFamily: theme.font('400'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.paymentSubtitle')}
            </Text>
          </View>
        </View>

        {/* Order Summary Card */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: `${theme.colors.primary}08`,
                borderColor: `${theme.colors.primary}20`,
              },
            ]}
          >
            <Text
              style={[
                styles.summaryLabel,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.font('400'),
                  textAlign: 'center',
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.orderSummary')}
            </Text>

            <View style={[styles.summaryDivider, { backgroundColor: `${theme.colors.primary}20` }]} />

            {/* Pickup date */}
            {dueDate ? (
              <>
                <View style={styles.summaryItemRow}>
                  <Text
                    style={[
                      styles.summaryItemName,
                      {
                        color: theme.colors.textSecondary,
                        fontFamily: theme.font('400'),
                        writingDirection: direction,
                      },
                    ]}
                  >
                    {t('confirmation.pickup')}
                  </Text>
                  <Text
                    style={[
                      styles.summaryItemDetail,
                      {
                        color: theme.colors.textPrimary,
                        fontFamily: theme.font('500'),
                      },
                    ]}
                  >
                    {new Date(`${dueDate}T${dueTime || '00:00'}:00`).toLocaleString('he-IL', {
                      dateStyle: 'medium',
                      ...(dueTime ? { timeStyle: 'short' } : {}),
                    })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: `${theme.colors.primary}20` }]} />
              </>
            ) : null}

            {/* Products header */}
            <Text
              style={[
                styles.summaryItemName,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.font('400'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.products')}
            </Text>

            {/* Item list */}
            {items.map((item) => (
              <View key={item.recipeId} style={styles.summaryItemRow}>
                <Text
                  style={[
                    styles.summaryItemName,
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
                <Text
                  style={[
                    styles.summaryItemDetail,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.font('400'),
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  {item.quantity} x {item.price.toFixed(0)} {'\u20AA'}
                </Text>
              </View>
            ))}

            <View style={[styles.summaryTotalDivider, { backgroundColor: `${theme.colors.primary}30` }]} />

            {/* Total */}
            <View style={styles.summaryItemRow}>
              <Text
                style={[
                  styles.summaryItems,
                  {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.font('600'),
                    writingDirection: direction,
                  },
                ]}
              >
                {t('cart.itemsCount', { count: itemCount })}
              </Text>
              <Text
                style={[
                  styles.summaryTotal,
                  {
                    color: theme.colors.textStrong,
                    fontFamily: theme.font('700'),
                    writingDirection: 'ltr',
                  },
                ]}
              >
                {total.toFixed(0)} {'\u20AA'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Payment Options */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <PaymentOption
            label={t('checkout.payAtPickup')}
            description={t('checkout.payAtPickupDescription')}
            icon={'\u{1F3E0}'}
            selected={selected === 'pay_at_pickup'}
            onPress={() => onSelect('pay_at_pickup')}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <PaymentOption
            label={t('checkout.payNow')}
            description={t('checkout.payNowDescription')}
            icon={'\u{1F4B3}'}
            selected={selected === 'paypal'}
            onPress={() => onSelect('paypal')}
          />
        </Animated.View>
      </ScrollView>

      {/* Place Order Button — Fixed at bottom */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.card,
            paddingBottom: Math.max(insets.bottom, 16),
            shadowColor: '#000',
          },
        ]}
      >
        <Button
          title={loading ? t('checkout.placingOrder') : `${t('checkout.placeOrder')}  \u00B7  ${total.toFixed(0)} \u20AA`}
          onPress={onPlaceOrder}
          variant="primary"
          size="large"
          loading={loading}
          style={{
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        />
      </View>
    </View>
  );
}

interface PaymentOptionProps {
  label: string;
  description: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}

function PaymentOption({ label, description, icon, selected, onPress }: PaymentOptionProps) {
  const theme = useTheme();
  const { direction } = useDirection();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: selected ? 2 : 1,
          backgroundColor: selected
            ? `${theme.colors.primary}06`
            : pressed
              ? theme.colors.surfaceSecondary
              : theme.colors.card,
          shadowColor: selected ? theme.colors.primary : '#000',
          shadowOpacity: selected ? 0.12 : 0.03,
          shadowOffset: { width: 0, height: selected ? 3 : 1 },
          shadowRadius: selected ? 8 : 3,
          elevation: selected ? 3 : 1,
        },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {/* Radio indicator */}
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            borderWidth: selected ? 2 : 1.5,
          },
        ]}
      >
        {selected && (
          <View
            style={[styles.radioInner, { backgroundColor: theme.colors.primary }]}
          />
        )}
      </View>

      {/* Icon container */}
      <View
        style={[
          styles.optionIconContainer,
          {
            backgroundColor: selected
              ? `${theme.colors.primary}15`
              : theme.colors.surfaceSecondary,
          },
        ]}
      >
        <Text style={[styles.optionIcon, icon === 'PP' && { fontSize: 14, fontWeight: '700' as const, color: '#003087' }]}>
          {icon}
        </Text>
      </View>

      {/* Labels */}
      <View style={styles.optionLabels}>
        <Text
          style={[
            styles.optionLabel,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('600'),
              writingDirection: direction,
            },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.optionDescription,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.font('400'),
              writingDirection: direction,
            },
          ]}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTextContainer: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryItemName: {
    fontSize: 14,
    flex: 1,
    marginEnd: 12,
  },
  summaryItemDetail: {
    fontSize: 13,
  },
  summaryTotalDivider: {
    height: 1,
    marginVertical: 4,
  },
  summaryItems: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 22,
  },
  optionLabels: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomBar: {
    padding: 20,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
});
