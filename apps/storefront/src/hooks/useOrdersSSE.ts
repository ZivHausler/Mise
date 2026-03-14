import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://mise.co.il/api/public';

type OrderSSEEvents = 'order.statusChanged';

interface OrderRef {
  slug: string;
  orderNumber: number;
  phone: string;
}

/**
 * Opens one SSE connection per active order.
 * On any status change, invalidates the customerOrders query so the list refreshes.
 */
export function useOrdersSSE(orders: OrderRef[]) {
  const queryClient = useQueryClient();
  const connectionsRef = useRef<EventSource<OrderSSEEvents>[]>([]);
  // Stable key to avoid reconnecting on every render
  const ordersKey = orders.map((o) => `${o.slug}:${o.orderNumber}`).join(',');

  useEffect(() => {
    if (orders.length === 0) return;

    function connectAll() {
      for (const es of connectionsRef.current) {
        es.close();
      }
      connectionsRef.current = [];

      for (const order of orders) {
        const url = `${BASE_URL}/s/${order.slug}/orders/${order.orderNumber}/events?phone=${encodeURIComponent(order.phone)}`;
        const es = new EventSource<OrderSSEEvents>(url);

        es.addEventListener('order.statusChanged', () => {
          queryClient.invalidateQueries({ queryKey: ['customerOrders'] });
        });

        connectionsRef.current.push(es);
      }
    }

    connectAll();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        connectAll();
      } else if (state === 'background') {
        for (const es of connectionsRef.current) {
          es.close();
        }
        connectionsRef.current = [];
      }
    });

    return () => {
      subscription.remove();
      for (const es of connectionsRef.current) {
        es.close();
      }
      connectionsRef.current = [];
    };
  }, [ordersKey, queryClient]);
}
