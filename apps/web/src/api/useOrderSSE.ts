import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store/toast';

export function useOrderSSE() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const tRef = useRef(t);
  tRef.current = t;
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const url = `/api/orders/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('order.created', (event) => {
      try {
        const order = JSON.parse(event.data);

        // Prepend the new order to the cached orders list
        queryClient.setQueryData<unknown[]>(['orders', undefined], (old) => {
          if (!old) return [order];
          // Avoid duplicates
          if ((old as any[]).some((o: any) => o.id === order.id)) return old;
          return [order, ...old];
        });

        // Also invalidate to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });

        const customerName = order.customerName ?? '';
        const orderNum = order.orderNumber ? `#${order.orderNumber}` : '';
        addToast(
          'info',
          tRef.current('toasts.newOrderReceived', { orderNum, customer: customerName }),
          undefined,
          () => navigateRef.current(`/orders/${order.id}`),
        );
      } catch {
        // ignore malformed events
      }
    });

    es.onerror = () => {
      // EventSource will automatically reconnect
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [queryClient, addToast]);
}
