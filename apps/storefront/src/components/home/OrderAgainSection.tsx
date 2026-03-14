/**
 * OrderAgainSection — Horizontal carousel of recent delivered orders
 * for quick reordering on the HomeScreen.
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { OrderAgainCard, CARD_WIDTH, CARD_GAP } from './OrderAgainCard';
import { OrderAgainSkeleton } from './OrderAgainSkeleton';
import type { CustomerOrderSummary } from '../../api/types';

interface OrderAgainSectionProps {
  orders: CustomerOrderSummary[];
  isLoading: boolean;
  onReorder: (order: CustomerOrderSummary) => void;
  onSeeAll: () => void;
}

export function OrderAgainSection({
  orders,
  isLoading,
  onReorder,
  onSeeAll,
}: OrderAgainSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();

  // Don't render if no orders and not loading
  if (orders.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Animated.View
        entering={FadeInDown.delay(320).springify()}
        style={styles.sectionHeader}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
              writingDirection: direction,
            },
          ]}
        >
          {t('home.orderAgain')}
        </Text>
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={t('home.seeAll')}
        >
          <Text
            style={[
              styles.seeAllLink,
              {
                color: theme.colors.primary,
                fontFamily: theme.font('600'),
                writingDirection: direction,
              },
            ]}
          >
            {t('home.seeAll')}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Cards */}
      {isLoading ? (
        <OrderAgainSkeleton count={2} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { gap: CARD_GAP }]}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
        >
          {orders.map((order, index) => (
            <OrderAgainCard
              key={`${order.slug}-${order.orderNumber}`}
              order={order}
              index={index}
              onReorder={onReorder}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: 14,
  },
  scrollContent: {
    paddingStart: 20,
    paddingEnd: 20,
  },
});
