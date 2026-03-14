import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import Constants from 'expo-constants';
import { queryKeys } from '../api/hooks';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://mise.co.il/api/public';

type OrderSSEEvents = 'order.statusChanged';

/**
 * Connects to the storefront SSE endpoint for a specific order.
 * When an order.statusChanged event arrives, invalidates the React Query cache
 * so useOrderStatus / useCustomerOrders automatically refetch.
 */
export function useOrderSSE(slug: string, orderNumber: number, phone: string) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource<OrderSSEEvents> | null>(null);

  useEffect(() => {
    if (!slug || !orderNumber || !phone) return;

    function connect() {
      const url = `${BASE_URL}/s/${slug}/orders/${orderNumber}/events?phone=${encodeURIComponent(phone)}`;
      const es = new EventSource<OrderSSEEvents>(url);
      esRef.current = es;

      es.addEventListener('order.statusChanged', (event) => {
        // Invalidate both single-order and all-orders queries
        queryClient.invalidateQueries({ queryKey: queryKeys.orderStatus(slug, orderNumber, phone) });
        queryClient.invalidateQueries({ queryKey: ['customerOrders'] });
      });
    }

    connect();

    // Reconnect when app comes back to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        esRef.current?.close();
        connect();
      } else if (state === 'background') {
        esRef.current?.close();
        esRef.current = null;
      }
    });

    return () => {
      subscription.remove();
      esRef.current?.close();
      esRef.current = null;
    };
  }, [slug, orderNumber, phone, queryClient]);
}
