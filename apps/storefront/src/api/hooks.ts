/**
 * TanStack Query hooks for all storefront API calls.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from './client';
import type {
  PublicStoreInfo,
  PublicMenuItem,
  PublicMenuItemDetail,
  CreateOrderInput,
  PublicOrderConfirmation,
  PublicOrderStatus,
  PayPalCaptureResponse,
  PayPalOrderResponse,
  CustomerOrderSummary,
  DiscoveredStore,
} from './types';
import { useOrderJournalStore } from '../stores/orderJournalStore';
import { useAuthStore } from '../stores/authStore';

// ─── Storefront Auth ──────────────────────────────────

export async function storefrontGoogleAuth(idToken: string): Promise<{
  token: string;
  customer: { id: number; email: string; firstName: string | null; lastName: string | null; phone: string | null; photo: string | null };
  isProfileComplete: boolean;
}> {
  return api.post('/s/auth/google', { idToken });
}

export async function storefrontGoogleAuthWithAccessToken(accessToken: string): Promise<{
  token: string;
  customer: { id: number; email: string; firstName: string | null; lastName: string | null; phone: string | null; photo: string | null };
  isProfileComplete: boolean;
}> {
  return api.post('/s/auth/google', { accessToken });
}

export async function updateStorefrontProfile(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<{
  customer: { id: number; email: string; firstName: string; lastName: string; phone: string; photo: string | null };
  isProfileComplete: boolean;
}> {
  return api.put('/s/auth/profile', data);
}

// ─── Query Keys ────────────────────────────────────────

export const queryKeys = {
  discoverStores: (lang: string) => ['discoverStores', lang] as const,
  store: (slug: string, lang: string) => ['store', slug, lang] as const,
  menu: (slug: string, lang: string, filters?: { tag?: string; search?: string }) =>
    ['menu', slug, lang, filters] as const,
  menuItem: (slug: string, recipeId: string, lang: string) =>
    ['menuItem', slug, recipeId, lang] as const,
  orderStatus: (slug: string, orderNumber: number, phone: string) =>
    ['orderStatus', slug, orderNumber, phone] as const,
  customerProfile: ['customerProfile'] as const,
};

// ─── Customer Profile ────────────────────────────────────

export interface CustomerProfileData {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  photo: string | null;
  isProfileComplete: boolean;
}

export function useCustomerProfile() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.customerProfile,
    queryFn: () => api.get<CustomerProfileData>('/s/auth/me'),
    staleTime: 5 * 60 * 1000,   // 5 min
    gcTime: 30 * 60 * 1000,     // 30 min
    enabled: !!token,
  });
}

// ─── Store Discovery ───────────────────────────────────

export function useDiscoverStores() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useQuery({
    queryKey: queryKeys.discoverStores(lang),
    queryFn: () => api.get<DiscoveredStore[]>(`/s/discover?lang=${lang}`),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// ─── Store Info ────────────────────────────────────────

export function useStoreInfo(slug: string) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useQuery({
    queryKey: queryKeys.store(slug, lang),
    queryFn: () => api.get<PublicStoreInfo>(`/s/${slug}?lang=${lang}`),
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: !!slug,
  });
}

// ─── Menu ──────────────────────────────────────────────

export function useMenu(slug: string, filters?: { tag?: string; search?: string }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useQuery({
    queryKey: queryKeys.menu(slug, lang, filters),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('lang', lang);
      if (filters?.tag) params.set('tag', filters.tag);
      if (filters?.search) params.set('search', filters.search);
      const qs = params.toString();
      return api.get<PublicMenuItem[]>(`/s/${slug}/menu?${qs}`);
    },
    staleTime: 2 * 60 * 1000, // 2 min
    enabled: !!slug,
    placeholderData: (prev: any) => prev,
  });
}

// ─── Recipe Detail ─────────────────────────────────────

export function useMenuItemDetail(slug: string, recipeId: string) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useQuery({
    queryKey: queryKeys.menuItem(slug, recipeId, lang),
    queryFn: () => api.get<PublicMenuItemDetail>(`/s/${slug}/menu/${recipeId}?lang=${lang}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug && !!recipeId,
  });
}

// ─── Create Order ──────────────────────────────────────

export function useCreateOrder(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      api.post<PublicOrderConfirmation>(`/s/${slug}/orders`, input),
    onSuccess: () => {
      // Invalidate menu in case availability changed
      queryClient.invalidateQueries({ queryKey: ['menu', slug] });
    },
  });
}

// ─── Order Status ──────────────────────────────────────

export function useOrderStatus(
  slug: string,
  orderNumber: number,
  phone: string,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: queryKeys.orderStatus(slug, orderNumber, phone),
    queryFn: () =>
      api.get<PublicOrderStatus>(
        `/s/${slug}/orders/${orderNumber}?phone=${encodeURIComponent(phone)}`,
      ),
    staleTime: 10 * 1000, // 10s
    refetchInterval: options?.refetchInterval ?? 15_000, // 15s auto-refresh
    enabled: !!slug && !!orderNumber && !!phone,
  });
}

// ─── Cancel Order ─────────────────────────────────────

export function useCancelStorefrontOrder(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderNumber: number; phone: string; reason?: string }) =>
      api.post<void>(`/s/${slug}/orders/${input.orderNumber}/cancel`, {
        phone: input.phone,
        reason: input.reason,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orderStatus(slug, variables.orderNumber, variables.phone),
      });
      queryClient.invalidateQueries({ queryKey: ['customerOrders'] });
    },
  });
}

// ─── Order Notifications ──────────────────────────────

export function useOrderNotifications(
  slug: string,
  orderNumber: number,
  phone: string,
) {
  return useQuery({
    queryKey: ['orderNotifications', slug, orderNumber, phone] as const,
    queryFn: () =>
      api.get<{ id: number; statusFrom: number | null; statusTo: number; message: string; createdAt: string }[]>(
        `/s/${slug}/orders/${orderNumber}/notifications?phone=${encodeURIComponent(phone)}`,
      ),
    staleTime: 30 * 1000,
    enabled: !!slug && !!orderNumber && !!phone,
  });
}

// ─── PayPal ────────────────────────────────────────────

export function useCreatePayPalOrder(slug: string) {
  return useMutation({
    mutationFn: (input: { items: { recipeId: string; quantity: number }[] }) =>
      api.post<PayPalOrderResponse>(`/s/${slug}/payments/paypal-order`, input),
  });
}

export function useCapturePayPalOrder(slug: string) {
  return useMutation({
    mutationFn: (input: { paypalOrderId: string; orderNumber: number }) =>
      api.post<PayPalCaptureResponse>(`/s/${slug}/payments/capture`, input),
  });
}

// ─── Helpers ──────────────────────────────────────────

async function fetchInBatches<T, R>(items: T[], fn: (item: T) => Promise<R>, batchSize = 5) {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// ─── Customer Orders (from journal) ───────────────────

export function useCustomerOrders() {
  const orders = useOrderJournalStore((s) => s.orders);

  return useQuery({
    queryKey: ['customerOrders', orders.map((o) => `${o.slug}:${o.orderNumber}`)],
    queryFn: async (): Promise<CustomerOrderSummary[]> => {
      const results = await fetchInBatches(
        orders,
        async (ref) => {
          const status = await api.get<PublicOrderStatus>(
            `/s/${ref.slug}/orders/${ref.orderNumber}?phone=${encodeURIComponent(ref.phone)}`,
          );
          return {
            ...ref,
            status: status.status,
            items: status.items,
            totalAmount: status.totalAmount,
            fetched: true,
          } as CustomerOrderSummary;
        },
        5,
      );

      return results.map((result, idx) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        // Fetch failed — return local data only
        return {
          ...orders[idx],
          fetched: false,
        } as CustomerOrderSummary;
      });
    },
    staleTime: 30 * 1000, // 30s
    enabled: orders.length > 0,
  });
}
