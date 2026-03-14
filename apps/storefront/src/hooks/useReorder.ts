/**
 * Reorder orchestration hook.
 * Fetches the current menu, matches order items by recipeId,
 * populates the cart at current prices, and navigates to the Cart screen.
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '../api/hooks';
import { api } from '../api/client';
import { useCartStore, CartItem } from '../stores/cartStore';
import type { CustomerOrderSummary } from '../api/types';
import type { PublicMenuItem } from '../api/types';

export interface UseReorderReturn {
  reorder: (order: CustomerOrderSummary) => Promise<void>;
  isReordering: boolean;
  reorderingOrderNumber: number | null;
}

export function useReorder(): UseReorderReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();

  const [isReordering, setIsReordering] = useState(false);
  const [reorderingOrderNumber, setReorderingOrderNumber] = useState<number | null>(null);
  const reorderingRef = useRef(false);

  const resetState = () => {
    reorderingRef.current = false;
    setIsReordering(false);
    setReorderingOrderNumber(null);
  };

  const reorder = useCallback(
    async (order: CustomerOrderSummary) => {
      if (reorderingRef.current) return;

      reorderingRef.current = true;
      setIsReordering(true);
      setReorderingOrderNumber(order.orderNumber);

      try {
        // Guard: check if any items have recipeId
        const hasRecipeIds = order.items?.some((item) => item.recipeId);
        if (!order.items || order.items.length === 0 || !hasRecipeIds) {
          Alert.alert(
            t('reorder.oldOrderTitle'),
            t('reorder.oldOrderMessage'),
            [{ text: t('common.close'), style: 'default' }],
          );
          resetState();
          return;
        }

        // Fetch current menu for the store
        let menu: PublicMenuItem[];
        try {
          menu = await queryClient.fetchQuery({
            queryKey: queryKeys.menu(order.slug),
            queryFn: () => api.get<PublicMenuItem[]>(`/s/${order.slug}/menu`),
            staleTime: 2 * 60 * 1000,
          });
        } catch {
          Alert.alert(
            t('reorder.allUnavailableTitle'),
            t('reorder.fetchError'),
            [{ text: t('common.close'), style: 'default' }],
          );
          resetState();
          return;
        }

        // Match order items to current menu by recipeId
        const menuMap = new Map(menu.map((m) => [m.id, m]));
        const availableItems: CartItem[] = [];
        let unavailableCount = 0;

        for (const item of order.items) {
          if (!item.recipeId) {
            unavailableCount++;
            continue;
          }
          const menuItem = menuMap.get(item.recipeId);
          if (menuItem) {
            availableItems.push({
              recipeId: menuItem.id,
              name: menuItem.name,
              price: menuItem.sellingPrice,
              quantity: item.quantity,
              photo: menuItem.photos[0],
            });
          } else {
            unavailableCount++;
          }
        }

        // All items unavailable
        if (availableItems.length === 0) {
          Alert.alert(
            t('reorder.allUnavailableTitle'),
            t('reorder.allUnavailableMessage'),
            [{ text: t('common.close'), style: 'default' }],
          );
          resetState();
          return;
        }

        // Check cart state for conflicts
        const cartState = useCartStore.getState();
        const cartSlug = cartState.storeSlug;
        const cartHasItems = cartState.items.length > 0;

        const populateAndNavigate = () => {
          useCartStore.getState().replaceItems(order.slug, availableItems);
          navigation.navigate('HomeTab', { screen: 'Cart' });

          // Show partial unavailability alert after navigation
          if (unavailableCount > 0) {
            setTimeout(() => {
              Alert.alert(
                t('reorder.partialTitle'),
                t('reorder.partialMessage', { count: unavailableCount }),
                [{ text: t('common.close'), style: 'default' }],
              );
            }, 500);
          }

          resetState();
        };

        if (cartHasItems && cartSlug && cartSlug !== order.slug) {
          // Different store — confirm replacement
          // Try to get store display name from cache
          const cachedStore = queryClient.getQueryData<{ name?: string }>(queryKeys.store(cartSlug));
          const currentStoreName = cachedStore?.name ?? cartSlug;

          Alert.alert(
            t('reorder.storeSwitchTitle'),
            t('reorder.storeSwitchMessage', {
              currentStore: currentStoreName,
              newStore: order.storeName,
            }),
            [
              {
                text: t('common.close'),
                style: 'cancel',
                onPress: () => resetState(),
              },
              {
                text: t('reorder.storeSwitchConfirm'),
                style: 'destructive',
                onPress: populateAndNavigate,
              },
            ],
          );
        } else if (cartHasItems && cartSlug === order.slug) {
          // Same store — confirm replacement
          Alert.alert(
            t('reorder.replaceCartTitle'),
            t('reorder.replaceCartMessage'),
            [
              {
                text: t('common.close'),
                style: 'cancel',
                onPress: () => resetState(),
              },
              {
                text: t('reorder.replaceCartConfirm'),
                style: 'destructive',
                onPress: populateAndNavigate,
              },
            ],
          );
        } else {
          // Cart empty — proceed directly
          populateAndNavigate();
        }
      } catch {
        Alert.alert(
          t('reorder.allUnavailableTitle'),
          t('reorder.fetchError'),
          [{ text: t('common.close'), style: 'default' }],
        );
        resetState();
      }
    },
    [t, queryClient, navigation],
  );

  return { reorder, isReordering, reorderingOrderNumber };
}
