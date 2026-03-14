import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { Button } from '../ui/Button';

interface CartSummaryProps {
  subtotal: number;
  onCheckout: () => void;
}

export function CartSummary({ subtotal, onCheckout }: CartSummaryProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      {/* Decorative top edge */}
      <View style={[styles.topEdge, { backgroundColor: theme.colors.surface }]} />

      <View style={styles.content}>
        {/* Subtotal row */}
        <View style={styles.subtotalRow}>
          <Text
            style={[
              styles.subtotalLabel,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.font('400'),
                writingDirection: direction,
              },
            ]}
          >
            {t('cart.subtotal')}
          </Text>
          <View style={styles.priceContainer}>
            <Text
              style={[
                styles.currencySymbol,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.font('400'),
                },
              ]}
            >
              {'\u20AA'}
            </Text>
            <Text
              style={[
                styles.subtotalValue,
                {
                  color: theme.colors.textStrong,
                  fontFamily: theme.font('700'),
                },
              ]}
            >
              {subtotal.toFixed(0)}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Checkout button */}
        <Button
          title={t('cart.checkoutWithPrice', { price: subtotal })}
          onPress={onCheckout}
          variant="primary"
          size="large"

        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  topEdge: {
    height: 1,
    width: '100%',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  subtotalLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '400',
  },
  subtotalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
});
