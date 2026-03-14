/**
 * Cart store — persisted with AsyncStorage.
 * Cart is keyed by store slug: opening a different store prompts to clear.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  recipeId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  photo?: string;
}

interface CartState {
  items: CartItem[];
  storeSlug: string | null;

  // Actions
  setStoreSlug: (slug: string) => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (recipeId: string) => void;
  updateQuantity: (recipeId: string, quantity: number) => void;
  updateNotes: (recipeId: string, notes: string) => void;
  clear: () => void;
  replaceItems: (slug: string, items: CartItem[]) => void;

  // Computed-like helpers (call as functions)
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      storeSlug: null,

      setStoreSlug: (slug) => {
        const current = get().storeSlug;
        if (current && current !== slug) {
          // Different store — clear cart
          set({ items: [], storeSlug: slug });
        } else {
          set({ storeSlug: slug });
        }
      },

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.recipeId === item.recipeId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.recipeId === item.recipeId
                  ? { ...i, quantity: i.quantity + (item.quantity ?? 1), notes: item.notes ?? i.notes }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantity: item.quantity ?? 1 },
            ],
          };
        });
      },

      removeItem: (recipeId) => {
        set((state) => ({
          items: state.items.filter((i) => i.recipeId !== recipeId),
        }));
      },

      updateQuantity: (recipeId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(recipeId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.recipeId === recipeId ? { ...i, quantity } : i,
          ),
        }));
      },

      updateNotes: (recipeId, notes) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.recipeId === recipeId ? { ...i, notes } : i,
          ),
        }));
      },

      clear: () => set({ items: [] }),

      replaceItems: (slug, items) => set({ storeSlug: slug, items }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
