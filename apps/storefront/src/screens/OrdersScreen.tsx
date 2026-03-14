import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useCustomerOrders } from '../api/hooks';
import { useOrderJournalStore } from '../stores/orderJournalStore';
import { useOrdersSSE } from '../hooks/useOrdersSSE';
import { useReorder } from '../hooks/useReorder';
import { useStoreStore } from '../stores';
import { EmptyState } from '../components/ui/EmptyState';
import { OrderCard, getCardVariant } from '../components/orders/OrderCard';
import { OrderCardSkeleton } from '../components/orders/OrderCardSkeleton';
import type { CustomerOrderSummary } from '../api/types';
import type {
  OrdersStackParamList,
  TabParamList,
} from '../navigation/types';

type OrdersNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<OrdersStackParamList, 'OrdersList'>,
  BottomTabNavigationProp<TabParamList>
>;

type FilterTab = 'active' | 'past';

export function OrdersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const setStatusBarMode = useStoreStore((s) => s.setStatusBarMode);
  const navigation = useNavigation<OrdersNavProp>();

  useFocusEffect(
    useCallback(() => {
      setStatusBarMode('default');
    }, []),
  );
  const journalOrders = useOrderJournalStore((s) => s.orders);
  const { data: orders, isLoading, refetch, isRefetching } = useCustomerOrders();
  const { reorder, isReordering, reorderingOrderNumber } = useReorder();

  // Only open SSE for active orders (status 0-3)
  const activeOrderRefs = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => o.status !== undefined && ((o.status >= 0 && o.status <= 3) || o.status === 6))
        .map((o) => ({ slug: o.slug, orderNumber: o.orderNumber, phone: o.phone })),
    [orders],
  );
  useOrdersSSE(activeOrderRefs);

  const [filter, setFilter] = useState<FilterTab>('active');

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (filter === 'active') {
      // Active: PENDING_APPROVAL(0) through READY(3) + CANCELLATION_REQUESTED(6)
      return orders.filter((o) => o.status === undefined || (o.status >= 0 && o.status <= 3) || o.status === 6);
    }
    // Past: DELIVERED(4), CANCELLED(5)
    return orders.filter((o) => o.status !== undefined && (o.status === 4 || o.status === 5));
  }, [orders, filter]);

  const handleOrderPress = useCallback(
    (order: CustomerOrderSummary) => {
      navigation.navigate('OrderTracking', {
        slug: order.slug,
        orderNumber: order.orderNumber,
        phone: order.phone,
        storeName: order.storeName,
      });
    },
    [navigation],
  );

  const handleBrowseStores = useCallback(() => {
    navigation.navigate('HomeTab', { screen: 'Home' });
  }, [navigation]);

  const activeCount = useMemo(
    () =>
      (orders ?? []).filter(
        (o) => o.status === undefined || (o.status >= 0 && o.status <= 3) || o.status === 6,
      ).length,
    [orders],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CustomerOrderSummary; index: number }) => {
      const variant = getCardVariant(item.status);
      return (
        <OrderCard
          order={item}
          index={index}
          onPress={handleOrderPress}
          variant={variant}
          onReorder={variant === 'past' ? reorder : undefined}
          isReordering={variant === 'past' && reorderingOrderNumber === item.orderNumber ? isReordering : false}
        />
      );
    },
    [handleOrderPress, reorder, isReordering, reorderingOrderNumber],
  );

  const hasNoOrders = journalOrders.length === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
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
          {t('orders.title')}
        </Text>
      </View>

      {hasNoOrders ? (
        <EmptyState
          icon={'\uD83D\uDCCB'}
          title={t('orders.empty')}
          message={t('orders.emptyMessage')}
          actionLabel={t('orders.browseStores')}
          onAction={handleBrowseStores}
        />
      ) : (
        <>
          {/* Toggle pills */}
          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() => setFilter('active')}
              style={[
                styles.togglePill,
                {
                  backgroundColor:
                    filter === 'active'
                      ? theme.colors.primary
                      : theme.colors.surfaceSecondary,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === 'active' }}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color:
                      filter === 'active'
                        ? theme.colors.onPrimary
                        : theme.colors.textPrimary,
                    fontFamily: theme.font(filter === 'active' ? '600' : '500'),
                    writingDirection: direction,
                  },
                ]}
              >
                {t('orders.active')}{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter('past')}
              style={[
                styles.togglePill,
                {
                  backgroundColor:
                    filter === 'past'
                      ? theme.colors.primary
                      : theme.colors.surfaceSecondary,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === 'past' }}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color:
                      filter === 'past'
                        ? theme.colors.onPrimary
                        : theme.colors.textPrimary,
                    fontFamily: theme.font(filter === 'past' ? '600' : '500'),
                    writingDirection: direction,
                  },
                ]}
              >
                {t('orders.past')}
              </Text>
            </Pressable>
          </View>

          {/* Loading state */}
          {isLoading ? (
            <View style={styles.skeletonList}>
              <OrderCardSkeleton />
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </View>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={'\uD83D\uDCCB'}
              title={t('orders.empty')}
              message={t('orders.emptyMessage')}
            />
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => `${item.slug}-${item.orderNumber}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              maxToRenderPerBatch={8}
              windowSize={5}
              initialNumToRender={5}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  togglePill: {
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
  },
  skeletonList: {
    paddingTop: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
});
