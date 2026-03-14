import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useSelectStore, useAllStores } from '@/api/hooks';

/**
 * Extracts the common store-switching logic used by both Sidebar and MobileNav.
 * Returns `displayStores` (admin-aware list) and a `switchStore` callback.
 */
export function useStoreSwitch() {
  const stores = useAuthStore((s) => s.stores);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const updateToken = useAuthStore((s) => s.updateToken);
  const setActiveStore = useAuthStore((s) => s.setActiveStore);
  const setStores = useAuthStore((s) => s.setStores);
  const selectStore = useSelectStore();
  const allStoresQuery = useAllStores(isAdmin);
  const qc = useQueryClient();

  // For admins, show all stores in the system; for non-admins, show their stores
  const displayStores = isAdmin && allStoresQuery.data
    ? allStoresQuery.data.map((s: any) => ({ storeId: String(s.id), store: { id: s.id, name: s.name, code: null, theme: 'cream' }, role: -1 }))
    : stores;

  const switchStore = useCallback(
    (storeId: string) => {
      selectStore.mutate(
        { storeId },
        {
          onSuccess: (data: any) => {
            updateToken(data.token);
            // Ensure the switched-to store is in the stores list (for admin switching to non-member stores)
            const currentStores = useAuthStore.getState().stores;
            if (!currentStores.find((s) => String(s.storeId) === String(storeId))) {
              const matchedStore = displayStores.find((s: any) => String(s.storeId) === String(storeId));
              if (matchedStore) {
                setStores([...currentStores, matchedStore]);
              }
            }
            setActiveStore(storeId);
            qc.invalidateQueries();
          },
        },
      );
    },
    [selectStore, updateToken, setActiveStore, setStores, displayStores, qc],
  );

  return { displayStores, switchStore };
}
