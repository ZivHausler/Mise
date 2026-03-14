/**
 * Order journal store — persisted with AsyncStorage.
 * Tracks orders placed from this device so they can be listed
 * in the Orders tab without a backend "my orders" endpoint.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OrderReference {
  slug: string;
  storeName: string;
  orderNumber: number;
  phone: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string; // ISO string
}

interface OrderJournalState {
  orders: OrderReference[];
  addOrder: (ref: OrderReference) => void;
  removeOrder: (slug: string, orderNumber: number) => void;
  cleanupStale: () => void;
}

const MAX_ORDERS = 50;
const STALE_DAYS = 30;

export const useOrderJournalStore = create<OrderJournalState>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (ref) => {
        set((state) => {
          // Avoid duplicates
          const exists = state.orders.some(
            (o) => o.slug === ref.slug && o.orderNumber === ref.orderNumber,
          );
          if (exists) return state;

          const updated = [ref, ...state.orders].slice(0, MAX_ORDERS);
          return { orders: updated };
        });
      },

      removeOrder: (slug, orderNumber) => {
        set((state) => ({
          orders: state.orders.filter(
            (o) => !(o.slug === slug && o.orderNumber === orderNumber),
          ),
        }));
      },

      cleanupStale: () => {
        const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
        set((state) => ({
          orders: state.orders.filter(
            (o) => new Date(o.createdAt).getTime() > cutoff,
          ),
        }));
      },
    }),
    {
      name: 'mise-order-journal',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
