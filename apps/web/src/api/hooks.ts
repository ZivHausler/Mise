import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from './client';
import { useToastStore } from '@/store/toast';
import { useAuthStore } from '@/store/auth';
import { getApiErrorMessage, getApiErrorCode } from '@/utils/getApiError';

// --- Mutation factory with automatic toast + query invalidation ---
function useMutationWithToast<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    invalidateKeys: string[][];
    successMessage?: string;
    errorMessage?: string;
  },
) {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of options.invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
      if (options.successMessage) {
        addToast('success', options.successMessage);
      }
    },
    onError: (error: Error) => addToast('error', getApiErrorMessage(error, options.errorMessage ?? 'errors.generic')),
  });
}

// PDF download helper
export async function downloadPdf(url: string, filename: string) {
  const { data } = await apiClient.get(url, { responseType: 'blob' });
  const blob = new Blob([data], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// Generic fetch helper
async function fetchApi<T>(url: string): Promise<T> {
  const { data } = await apiClient.get(url);
  return data.data ?? data;
}

async function postApi<T>(url: string, body: unknown): Promise<T> {
  const { data } = await apiClient.post(url, body);
  return data.data ?? data;
}

async function putApi<T>(url: string, body: unknown): Promise<T> {
  const { data } = await apiClient.put(url, body);
  return data.data ?? data;
}

async function patchApi<T>(url: string, body: unknown): Promise<T> {
  const { data } = await apiClient.patch(url, body);
  return data.data ?? data;
}

async function deleteApi(url: string): Promise<void> {
  await apiClient.delete(url);
}

// Feature flags
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => fetchApi<{ dashboard: boolean; customers: boolean; orders: boolean; payments: boolean; invoices: boolean; notifications: boolean; production: boolean; whatsapp: boolean; sms: boolean; ai_chat: boolean; loyalty: boolean; loyaltyEnhancements: boolean; receiptScanner: boolean; comingSoon: string[] }>('/features'),
    staleTime: 5 * 60 * 1000,
  });
}

// Subscription
interface StoreSubscription {
  id: number;
  planSlug: 'free' | 'basic' | 'pro';
  planName: string;
  planNameHe: string;
  priceNis: number;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  downgradeToSlug: string | null;
  features: string[];
}

interface Plan {
  id: number;
  slug: string;
  name: string;
  nameHe: string;
  priceNis: number;
  features: string[];
  sortOrder: number;
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => fetchApi<StoreSubscription>('/subscription'),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: () => fetchApi<Plan[]>('/subscription/plans'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planSlug: string) => postApi<any>('/subscription/change', { planSlug }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['features'] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postApi<any>('/subscription/cancel', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['features'] });
    },
  });
}

export function usePreviewPlanChange(planSlug: string | null) {
  return useQuery({
    queryKey: ['subscription', 'preview', planSlug],
    queryFn: () => fetchApi<{
      type: 'upgrade' | 'downgrade' | 'trial_selection';
      currentPlan: string;
      targetPlan: string;
      immediateChargeAgorot: number;
      nextRenewalAmountAgorot: number;
      nextRenewalDate: string;
      daysRemaining: number;
      daysInPeriod: number;
      effectiveDate: string;
    }>(`/subscription/preview-change?planSlug=${planSlug}`),
    enabled: !!planSlug,
  });
}

export function useCancelDowngrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postApi<any>('/subscription/cancel-downgrade', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: ['subscription', 'payments'],
    queryFn: () => fetchApi<Array<{
      id: number;
      amountAgorot: number;
      type: number;
      description: string;
      fromPlanId: number | null;
      toPlanId: number | null;
      prorationDays: number | null;
      periodDays: number | null;
      status: number;
      createdAt: string;
    }>>('/subscription/payments'),
  });
}

// Initiate a checkout session (returns payment page URL)
export function useInitiateCheckout() {
  return useMutation({
    mutationFn: (params: { planSlug: string }) =>
      postApi<{
        checkoutSessionId: string;
        paypalSubscriptionId: string;
        amountAgorot: number;
        expiresAt: string;
      }>('/subscription/checkout', params),
  });
}

// Initiate renewal recovery checkout (for past_due subscriptions)
export function useRenewalRecovery() {
  return useMutation({
    mutationFn: () =>
      postApi<{
        checkoutSessionId: string;
        paypalSubscriptionId: string;
      }>('/subscription/recovery-checkout', {}),
  });
}

// Switch to a lower paid plan during trial (with PayPal refund of upgrade difference)
export function useTrialDowngrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planSlug: string) =>
      postApi<unknown>('/subscription/trial-downgrade', { planSlug }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['features'] });
      qc.invalidateQueries({ queryKey: ['subscription', 'payments'] });
    },
  });
}

// Poll checkout status (for after redirect back)
export function useCheckoutStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ['checkout-status', sessionId],
    queryFn: () => fetchApi<{ status: string }>(`/subscription/checkout/${sessionId}`),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed' || status === 'expired') return false;
      return 2000;
    },
  });
}

// Auth
export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => postApi<{ user: unknown; token: string }>('/auth/login', body),
  });
}

export function useRegister() {
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; inviteToken?: string }) =>
      postApi<{ user: unknown; token: string; hasStore: boolean }>('/auth/register', body),
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.registrationFailed')),
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: (body: { idToken: string }) => postApi<{ user: unknown; token: string }>('/auth/google', body),
  });
}

export function useGoogleRegister() {
  return useMutation({
    mutationFn: (body: { idToken: string; inviteToken?: string }) =>
      postApi<{ user: unknown; token: string; hasStore: boolean; pendingCreateStoreToken?: string }>('/auth/google/register', body),
  });
}

export function useMergeGoogleToEmail() {
  return useMutation({
    mutationFn: (body: { idToken: string; password: string }) =>
      postApi<{ user: unknown; token: string }>('/auth/google/merge', body),
  });
}

export function useMergeEmailToGoogle() {
  return useMutation({
    mutationFn: (body: { idToken: string; newPassword: string }) =>
      postApi<{ user: unknown; token: string }>('/auth/google/merge-password', body),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: { email: string }) =>
      postApi<{ message: string }>('/auth/forgot-password', body),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { token: string; newPassword: string }) =>
      postApi<{ message: string }>('/auth/reset-password', body),
  });
}

// Orders
export function useOrders(filters?: { excludePaid?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.excludePaid) params.set('excludePaid', 'true');
  const qs = params.toString();
  return useQuery({ queryKey: ['orders', filters], queryFn: () => fetchApi<unknown[]>(`/orders${qs ? `?${qs}` : ''}`) });
}

export function useOrdersPaginated(page = 1, limit = 20, filters?: { dateFrom?: string; dateTo?: string; search?: string }) {
  return useQuery({
    queryKey: ['orders', 'list', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.search) params.set('search', filters.search);
      const { data } = await apiClient.get(`/orders/list?${params}`);
      return { orders: data.data, pagination: data.pagination };
    },
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: number) {
  return useQuery({ queryKey: ['orders', id], queryFn: () => fetchApi<unknown>(`/orders/${id}`), enabled: !!id });
}

export interface CalendarAggregate {
  day: string;
  total: number;
  received: number;
  inProgress: number;
  ready: number;
  delivered: number;
}

export function useCalendarAggregates(from: string, to: string) {
  return useQuery({
    queryKey: ['orders', 'calendar', 'aggregates', from, to],
    queryFn: () => fetchApi<CalendarAggregate[]>(`/orders/calendar/aggregates?from=${from}&to=${to}`),
    enabled: !!from && !!to,
    placeholderData: keepPreviousData,
  });
}

export function useCalendarRange(from: string, to: string, status?: number) {
  const params = new URLSearchParams({ from, to });
  if (status !== undefined) params.set('status', String(status));
  return useQuery({
    queryKey: ['orders', 'calendar', 'range', from, to, status],
    queryFn: () => fetchApi<unknown[]>(`/orders/calendar/range?${params}`),
    enabled: !!from && !!to,
    placeholderData: keepPreviousData,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/orders', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderCreated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.orderCreateFailed')),
  });
}

export function useCreateRecurringOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi<{ generatedCount: number; orders: unknown[] }>('/orders/recurring', body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      addToast('success', t('toasts.recurringOrderCreated', { count: data.generatedCount }));
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.orderCreateFailed')),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/orders/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.orderUpdateFailed')),
  });
}

export function useUpdateRecurringOrders() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      putApi<{ order: unknown; futureUpdated: number }>(`/orders/${id}/recurring`, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', t('toasts.recurringOrdersUpdated', { count: data.futureUpdated + 1 }));
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.orderUpdateFailed')),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) => patchApi(`/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.orderUpdateFailed')),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteApi(`/orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.orderDeleteFailed')),
  });
}

export function usePendingOrdersCount() {
  return useQuery({
    queryKey: ['orders', 'pendingCount'],
    queryFn: () => fetchApi<{ pendingApproval: number; cancellationRequested: number }>('/orders/pending-count'),
    refetchInterval: 30_000,
  });
}

export function useApproveOrder() {
  const { t } = useTranslation();
  return useMutationWithToast(
    (id: number) => patchApi(`/orders/${id}/approve`, {}),
    { invalidateKeys: [['orders'], ['dashboard']], successMessage: t('toasts.orderUpdated'), errorMessage: 'toasts.orderUpdateFailed' },
  );
}

export function useCancelOrder() {
  const { t } = useTranslation();
  return useMutationWithToast(
    ({ id, reason }: { id: number; reason?: string }) => patchApi(`/orders/${id}/cancel`, { reason }),
    { invalidateKeys: [['orders'], ['dashboard'], ['paymentStatuses']], successMessage: t('toasts.orderUpdated'), errorMessage: 'toasts.orderUpdateFailed' },
  );
}

export function useApproveCancellation() {
  const { t } = useTranslation();
  return useMutationWithToast(
    (id: number) => patchApi(`/orders/${id}/cancellation-request/approve`, {}),
    { invalidateKeys: [['orders'], ['dashboard'], ['paymentStatuses']], successMessage: t('toasts.orderUpdated'), errorMessage: 'toasts.orderUpdateFailed' },
  );
}

export function useDeclineCancellation() {
  const { t } = useTranslation();
  return useMutationWithToast(
    (id: number) => patchApi(`/orders/${id}/cancellation-request/decline`, {}),
    { invalidateKeys: [['orders'], ['dashboard']], successMessage: t('toasts.orderUpdated'), errorMessage: 'toasts.orderUpdateFailed' },
  );
}

// Recipes
export function useRecipes() {
  return useQuery({ queryKey: ['recipes'], queryFn: () => fetchApi<unknown[]>('/recipes') });
}

export function useRecipe(id: string) {
  return useQuery({ queryKey: ['recipes', id], queryFn: () => fetchApi<unknown>(`/recipes/${id}`), enabled: !!id });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/recipes', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', t('toasts.recipeCreated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.recipeCreateFailed')),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/recipes/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', t('toasts.recipeUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.recipeUpdateFailed')),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/recipes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', t('toasts.recipeDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.recipeDeleteFailed')),
  });
}

export function useGenerateUploadUrls() {
  return useMutation({
    mutationFn: (body: { count: number; mimeTypes: string[] }) =>
      postApi<{ slots: { uploadUrl: string; publicUrl: string }[] }>('/recipes/upload-urls', body),
  });
}

export function useDeleteRecipeImage() {
  return useMutation({
    mutationFn: async (url: string) => {
      await apiClient.delete('/recipes/delete-image', { data: { url } });
    },
  });
}

// Inventory
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export function useInventory(page = 1, limit = 10, search?: string, groupIds?: string[], statuses?: string[]) {
  return useQuery({
    queryKey: ['inventory', page, limit, search, groupIds, statuses],
    queryFn: async (): Promise<PaginatedResponse<unknown>> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (groupIds?.length) params.set('groupIds', groupIds.join(','));
      if (statuses?.length) params.set('status', statuses.join(','));
      const { data } = await apiClient.get(`/inventory?${params}`);
      return { items: data.data ?? [], pagination: data.pagination };
    },
    placeholderData: keepPreviousData,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => fetchApi<unknown[]>('/inventory/low-stock'),
  });
}

export function useInventoryItem(id: number) {
  return useQuery({ queryKey: ['inventory', id], queryFn: () => fetchApi<unknown>(`/inventory/${id}`), enabled: !!id });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/inventory', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.itemAdded')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.itemAddFailed')),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/inventory/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.itemUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.itemUpdateFailed')),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { ingredientId: number; type: string; quantity: number; pricePaid?: number }) => postApi('/inventory/adjust', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.stockAdjusted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.stockAdjustFailed')),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteApi(`/inventory/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.itemDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.itemDeleteFailed')),
  });
}

// Receipt scanning
export function useScanReceipt() {
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await apiClient.post('/inventory/scan-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as {
        items: Array<{
          name: string;
          quantity: number;
          unit: string;
          totalPrice: number;
          unitPrice: number;
          match: {
            type: 'exact' | 'fuzzy' | 'none';
            ingredientId: number | null;
            ingredientName: string | null;
            confidence: number;
          };
        }>;
        receiptMeta: {
          vendor: string | null;
          date: string | null;
          total: number | null;
        };
      };
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, t('toasts.receiptScanFailed'))),
  });
}

export function useBulkAdjustStock() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { adjustments: Array<{ ingredientId: number; quantity: number; pricePaid: number; reason?: string }> }) =>
      postApi<{
        results: Array<{ ingredientId: number; name: string; previousQuantity: number; newQuantity: number; success: true } | { ingredientId: number; success: false; error: string }>;
        summary: { total: number; succeeded: number; failed: number };
      }>('/inventory/adjust-bulk', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); },
    onError: (error) => addToast('error', getApiErrorMessage(error, t('toasts.stockAdjustFailed'))),
  });
}

export function useBulkDeleteInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ingredientIds: number[] }) =>
      postApi<{ deleted: number }>('/inventory/bulk-delete', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); },
  });
}

// Customers
export function useCustomers(filters?: { segment?: string }) {
  const params = new URLSearchParams();
  if (filters?.segment) params.set('segment', filters.segment);
  const qs = params.toString();
  return useQuery({ queryKey: ['customers', filters], queryFn: () => fetchApi<unknown[]>(`/customers${qs ? `?${qs}` : ''}`) });
}

export function useCustomer(id: number) {
  return useQuery({ queryKey: ['customers', id], queryFn: () => fetchApi<unknown>(`/customers/${id}`), enabled: !!id });
}

export function useCustomerOrders(customerId: number, page = 1, limit = 10, filters?: { status?: number; dateFrom?: string; dateTo?: string }, sortBy?: string, sortDir?: string) {
  return useQuery({
    queryKey: ['orders', 'customer', customerId, page, limit, filters, sortBy, sortDir],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.status !== undefined) params.set('status', String(filters.status));
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDir) params.set('sortDir', sortDir);
      const { data } = await apiClient.get(`/orders/customer/${customerId}?${params}`);
      return { orders: data.data, pagination: data.pagination };
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/customers', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', t('toasts.customerCreated')); },
    onError: (error: any) => {
      const code = getApiErrorCode(error);
      if (code === 'CUSTOMER_CONFLICT' || code === 'CUSTOMER_PHONE_EXISTS' || code === 'CUSTOMER_EMAIL_EXISTS') return;
      addToast('error', getApiErrorMessage(error, 'toasts.customerCreateFailed'));
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/customers/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', t('toasts.customerUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.customerUpdateFailed')),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteApi(`/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', t('toasts.customerDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.customerDeleteFailed')),
  });
}

// Payments
export function usePayments(page = 1, limit = 10, filters?: { status?: string; method?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['payments', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.status) params.set('status', filters.status);
      if (filters?.method) params.set('method', filters.method);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await apiClient.get(`/payments?${params}`);
      return { payments: data.data, pagination: data.pagination };
    },
    placeholderData: keepPreviousData,
  });
}

export function useCustomerPayments(customerId: number, page = 1, limit = 10, filters?: { method?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['payments', 'customer', customerId, page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.method) params.set('method', filters.method);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await apiClient.get(`/payments/customer/${customerId}?${params}`);
      return { payments: data.data, pagination: data.pagination };
    },
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/payments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['paymentStatuses'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', t('toasts.paymentLogged'));
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.paymentLogFailed')),
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => postApi(`/payments/${id}/refund`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['paymentStatuses'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', t('toasts.paymentRefunded'));
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.paymentRefundFailed')),
  });
}

export function usePaymentStatuses() {
  return useQuery({
    queryKey: ['paymentStatuses'],
    queryFn: async () => {
      const { data } = await apiClient.get('/payments/statuses');
      return data.data as Record<string, string>;
    },
  });
}

export function useOrderPayments(orderId: number) {
  return useQuery({
    queryKey: ['payments', 'order', orderId],
    queryFn: () => fetchApi<any[]>(`/payments/order/${orderId}`),
    enabled: !!orderId,
  });
}

// Dashboard
export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => fetchApi<unknown>('/analytics/dashboard'), staleTime: 60_000 });
}

// Settings — Units
export function useUnits() {
  return useQuery({ queryKey: ['units'], queryFn: () => fetchApi<unknown[]>('/settings/units') });
}

export function useUnitCategories() {
  return useQuery({ queryKey: ['unitCategories'], queryFn: () => fetchApi<unknown[]>('/settings/units/categories') });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/settings/units', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); addToast('success', t('toasts.unitCreated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.unitCreateFailed')),
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/settings/units/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); addToast('success', t('toasts.unitUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.unitUpdateFailed')),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteApi(`/settings/units/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); addToast('success', t('toasts.unitDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.unitDeleteFailed')),
  });
}

// Settings — Allergens
export function useAllergens() {
  return useQuery({ queryKey: ['allergens'], queryFn: () => fetchApi<unknown[]>('/settings/allergens') });
}

export function useCreateAllergen() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/settings/allergens', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allergens'] }); addToast('success', t('toasts.allergenCreated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.allergenCreateFailed')),
  });
}

export function useUpdateAllergen() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/settings/allergens/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allergens'] }); addToast('success', t('toasts.allergenUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.allergenUpdateFailed')),
  });
}

export function useDeleteAllergen() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteApi(`/settings/allergens/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allergens'] }); addToast('success', t('toasts.allergenDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.allergenDeleteFailed')),
  });
}

// Settings — Tags
export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: () => fetchApi<unknown[]>('/settings/tags') });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/settings/tags', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); addToast('success', t('toasts.tagCreated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.tagCreateFailed')),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/settings/tags/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); addToast('success', t('toasts.tagUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.tagUpdateFailed')),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteApi(`/settings/tags/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); addToast('success', t('toasts.tagDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.tagDeleteFailed')),
  });
}

// Settings — Categories
export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => fetchApi<unknown[]>('/settings/categories') });
}

export function useCreateCategory() {
  const { t } = useTranslation();
  return useMutationWithToast(
    (body: unknown) => postApi('/settings/categories', body),
    { invalidateKeys: [['categories']], successMessage: t('toasts.categoryCreated', 'Category created'), errorMessage: 'toasts.categoryCreateFailed' },
  );
}

export function useUpdateCategory() {
  const { t } = useTranslation();
  return useMutationWithToast(
    ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/settings/categories/${id}`, body),
    { invalidateKeys: [['categories']], successMessage: t('toasts.categoryUpdated', 'Category updated'), errorMessage: 'toasts.categoryUpdateFailed' },
  );
}

export function useDeleteCategory() {
  const { t } = useTranslation();
  return useMutationWithToast(
    (id: number) => deleteApi(`/settings/categories/${id}`),
    { invalidateKeys: [['categories']], successMessage: t('toasts.categoryDeleted', 'Category deleted'), errorMessage: 'toasts.categoryDeleteFailed' },
  );
}

// Settings — Profile
export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => fetchApi<unknown>('/settings/profile') });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => patchApi('/settings/profile', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); addToast('success', t('toasts.profileUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.profileUpdateFailed')),
  });
}

// Stores
export function useCreateStore() {
  return useMutation({
    mutationFn: (body: { name: string; nameEn?: string; code?: string; address?: string; addressEn?: string; inviteToken?: string }) =>
      postApi<{ store: unknown; token: string }>('/stores', body),
  });
}

export function useMyStores() {
  return useQuery({ queryKey: ['stores'], queryFn: () => fetchApi<unknown[]>('/stores/my') });
}

export function useAllStores(enabled = false) {
  return useQuery({
    queryKey: ['stores', 'all'],
    queryFn: () => fetchApi<{ id: string; name: string; code: string | null; address: string | null }[]>('/stores/all'),
    enabled,
  });
}

export function useSelectStore() {
  return useMutation({
    mutationFn: (body: { storeId: string }) => postApi<{ token: string }>('/stores/select', body),
  });
}

export function useUpdateStoreTheme() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (body: { theme?: string; applyThemeToApp?: boolean }) => patchApi<void>('/stores/theme', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['currentStore'] });
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.themeUpdateFailed')),
  });
}

export function useValidateInvite(token?: string) {
  return useQuery({
    queryKey: ['invite', token],
    queryFn: () => fetchApi<{ storeName: string | null; email: string; role: number; type: 'join_store' | 'create_store' }>(`/stores/invite/${token}`),
    enabled: !!token,
  });
}

export function useStoreMembers() {
  return useQuery({ queryKey: ['storeMembers'], queryFn: () => fetchApi<unknown[]>('/stores/members') });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ['pendingInvitations'],
    queryFn: () => fetchApi<{ id: number; email: string; role: number; inviteLink: string; createdAt: string; expiresAt: string }[]>('/stores/invitations/pending'),
  });
}

export function useSendInvite() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { email: string; role: number }) => postApi<{ token: string; inviteLink: string }>('/stores/invite', body),
    onSuccess: () => { addToast('success', t('toasts.inviteSent')); qc.invalidateQueries({ queryKey: ['storeMembers'] }); qc.invalidateQueries({ queryKey: ['pendingInvitations'] }); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.inviteFailed')),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => patchApi(`/stores/invitations/${id}/revoke`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pendingInvitations'] }); qc.invalidateQueries({ queryKey: ['storeMembers'] }); addToast('success', t('toasts.inviteRevoked')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.inviteRevokeFailed')),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (userId: number) => deleteApi(`/stores/members/${userId}`),
    onSuccess: () => { addToast('success', t('toasts.memberRemoved')); qc.invalidateQueries({ queryKey: ['storeMembers'] }); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.memberRemoveFailed')),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: number }) => patchApi(`/stores/members/${userId}/role`, { role }),
    onSuccess: () => { addToast('success', t('toasts.roleUpdated')); qc.invalidateQueries({ queryKey: ['storeMembers'] }); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.roleUpdateFailed')),
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (body: { token: string }) => postApi<{ token: string; storeId: string; role: number; stores: { storeId: string; store: { id: number; name: string; code: string | null; theme: string }; role: number }[] }>('/stores/accept-invite', body),
  });
}

// Admin
export function useAdminAccess() {
  return useQuery({
    queryKey: ['admin', 'access'],
    queryFn: async () => {
      await apiClient.get('/admin/access');
      return true;
    },
    retry: false,
  });
}

export function useAdminUsers(page = 1, limit = 20, search?: string, includeAdmins = false) {
  return useQuery({
    queryKey: ['admin', 'users', page, limit, search, includeAdmins],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (includeAdmins) params.set('includeAdmins', 'true');
      const { data } = await apiClient.get(`/admin/users?${params}`);
      return data.data as PaginatedResponse<{ id: number; email: string; name: string; isAdmin: boolean; disabledAt: string | null; createdAt: string; storeCount: number }>;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminToggleAdmin() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => patchApi(`/admin/users/${userId}/admin`, { isAdmin }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); addToast('success', t('toasts.adminToggled')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.adminToggleFailed')),
  });
}

export function useAdminToggleDisabled() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ userId, disabled }: { userId: number; disabled: boolean }) => patchApi(`/admin/users/${userId}/disabled`, { disabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); addToast('success', t('toasts.userStatusUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.userStatusUpdateFailed')),
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (userId: number) => deleteApi(`/admin/users/${userId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); addToast('success', t('toasts.userDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.userDeleteFailed')),
  });
}

export function useAdminResetOnboarding() {
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (userId: number) => patchApi(`/admin/users/${userId}/reset-onboarding`, {}),
    onSuccess: () => { addToast('success', t('toasts.onboardingReset', 'Tour reset successfully')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.onboardingResetFailed')),
  });
}

export function useAdminDeleteStore() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (storeId: number) => deleteApi(`/admin/stores/${storeId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'stores'] }); addToast('success', t('toasts.storeDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.storeDeleteFailed')),
  });
}

export function useAdminStores(page = 1, limit = 20, search?: string) {
  return useQuery({
    queryKey: ['admin', 'stores', page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const { data } = await apiClient.get(`/admin/stores?${params}`);
      return data.data as PaginatedResponse<{ id: number; name: string; code: string | null; address: string | null; createdAt: string; memberCount: number }>;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminStoreMembers(storeId: number | null) {
  return useQuery({
    queryKey: ['admin', 'storeMembers', storeId],
    queryFn: () => fetchApi<{ userId: number; email: string; name: string; role: number; joinedAt: string }[]>(`/admin/stores/${storeId}/members`),
    enabled: !!storeId,
  });
}

export function useAdminUpdateStore() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ storeId, ...body }: { storeId: number; name?: string; address?: string }) => patchApi(`/admin/stores/${storeId}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'stores'] }); addToast('success', t('toasts.storeUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.storeUpdateFailed')),
  });
}

export function useAdminInvitationEmails() {
  return useQuery({
    queryKey: ['admin', 'invitations', 'emails'],
    queryFn: () => fetchApi<string[]>('/admin/invitations/emails'),
  });
}

export function useAdminInvitations(page = 1, limit = 20, filters?: { status?: string; search?: string; storeId?: string; userId?: string; email?: string; role?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['admin', 'invitations', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.storeId) params.set('storeId', filters.storeId);
      if (filters?.userId) params.set('userId', filters.userId);
      if (filters?.email) params.set('email', filters.email);
      if (filters?.role) params.set('role', filters.role);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await apiClient.get(`/admin/invitations?${params}`);
      return data.data as PaginatedResponse<{ id: number; email: string; storeId: number | null; storeName: string | null; role: number; status: string; expiresAt: string; createdAt: string; token?: string }>;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminCreateStoreInvite() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ email }: { email: string }) => postApi('/admin/invitations/create-store', { email }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }); addToast('success', t('toasts.inviteCreated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.inviteCreateFailed')),
  });
}

export function useAdminRevokeInvitation() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => patchApi(`/admin/invitations/${id}/revoke`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }); addToast('success', t('toasts.inviteRevoked')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.inviteRevokeFailed')),
  });
}

export function useAdminAuditLog(page = 1, limit = 20, filters?: { userId?: string; method?: string; statusCode?: string; dateFrom?: string; dateTo?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'auditLog', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.userId) params.set('userId', filters.userId);
      if (filters?.method) params.set('method', filters.method);
      if (filters?.statusCode) params.set('statusCode', filters.statusCode);
      if (filters?.dateFrom) params.set('dateFrom', new Date(filters.dateFrom).toISOString());
      if (filters?.dateTo) params.set('dateTo', new Date(filters.dateTo).toISOString());
      if (filters?.search) params.set('search', filters.search);
      const { data } = await apiClient.get(`/admin/audit-log?${params}`);
      const result = data.data;
      return {
        items: result.items,
        pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      } as PaginatedResponse<{ id: number; userId: number; userEmail: string; storeId: number | null; method: string; path: string; statusCode: number; ip: string; createdAt: string }>;
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

type AuditLogEntry = { id: number; userId: number; userEmail: string; storeId: number | null; method: string; path: string; statusCode: number; ip: string; createdAt: string };

export function useAuditLogUpdates(
  since: string | null,
  excludeIds: number[],
  filters?: { userId?: string; method?: string; statusCode?: string; dateFrom?: string; dateTo?: string; search?: string },
) {
  return useQuery({
    queryKey: ['admin', 'auditLog', 'updates', since, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '100', since: since! });
      // Only send a small number of excludeIds to avoid URL length issues
      const idsToExclude = excludeIds.slice(0, 5);
      if (idsToExclude.length) params.set('excludeIds', idsToExclude.join(','));
      if (filters?.userId) params.set('userId', filters.userId);
      if (filters?.method) params.set('method', filters.method);
      if (filters?.statusCode) params.set('statusCode', filters.statusCode);
      if (filters?.dateFrom) params.set('dateFrom', new Date(filters.dateFrom).toISOString());
      if (filters?.dateTo) params.set('dateTo', new Date(filters.dateTo).toISOString());
      if (filters?.search) params.set('search', filters.search);
      const { data } = await apiClient.get(`/admin/audit-log?${params}`);
      return (data.data as PaginatedResponse<AuditLogEntry>).items;
    },
    enabled: !!since,
    refetchInterval: 10000,
  });
}

export function useAuditLogRequestBody(auditLogId: number | null) {
  return useQuery({
    queryKey: ['admin', 'auditLog', auditLogId, 'requestBody'],
    queryFn: () => fetchApi<unknown>(`/admin/audit-log/${auditLogId}/request-body`),
    enabled: !!auditLogId,
  });
}

export function useAuditLogResponseBody(auditLogId: number | null) {
  return useQuery({
    queryKey: ['admin', 'auditLog', auditLogId, 'responseBody'],
    queryFn: () => fetchApi<unknown>(`/admin/audit-log/${auditLogId}/response-body`),
    enabled: !!auditLogId,
  });
}

export function useAdminAnalytics(range: 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['admin', 'analytics', range],
    queryFn: () => fetchApi<{ totalUsers: number; totalStores: number; activeInvitations: number; signupsPerDay: { date: string; count: number }[] }>(`/admin/analytics?range=${range}`),
  });
}

// Settings — Onboarding
export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: () => fetchApi<{ completedAt: string | null }>('/settings/onboarding'),
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => patchApi('/settings/onboarding/complete', {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); },
  });
}

export function useResetOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => patchApi('/settings/onboarding/reset', {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); },
  });
}

// Settings — Loyalty
export function useLoyaltyConfig() {
  return useQuery({ queryKey: ['loyaltyConfig'], queryFn: () => fetchApi<unknown>('/settings/loyalty') });
}

export function useUpdateLoyaltyConfig() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => patchApi('/settings/loyalty', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyaltyConfig'] }); addToast('success', t('toasts.loyaltyConfigUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.loyaltyConfigUpdateFailed')),
  });
}

// Loyalty — Customer
export function useCustomerLoyalty(customerId: number) {
  return useQuery({
    queryKey: ['loyalty', customerId],
    queryFn: () => fetchApi<{ balance: number; lifetimeEarned: number; lifetimeRedeemed: number }>(`/loyalty/customer/${customerId}`),
    enabled: !!customerId,
  });
}

export function useCustomerLoyaltyTransactions(customerId: number, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['loyalty', customerId, 'transactions', page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const { data } = await apiClient.get(`/loyalty/customer/${customerId}/transactions?${params}`);
      return { transactions: data.data, pagination: data.pagination };
    },
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
}

export function useAdjustLoyalty() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { customerId: number; points: number; description?: string }) => postApi('/loyalty/adjust', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      addToast('success', t('toasts.loyaltyAdjusted'));
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.loyaltyAdjustFailed')),
  });
}

export function useRedeemLoyalty() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { customerId: number; points: number }) => postApi('/loyalty/redeem', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      addToast('success', t('toasts.loyaltyRedeemed'));
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.loyaltyRedeemFailed')),
  });
}

// Production
export function useProductionBatches(date: string) {
  return useQuery({
    queryKey: ['production', 'batches', date],
    queryFn: () => fetchApi<unknown[]>(`/production/batches?date=${date}`),
    enabled: !!date,
  });
}

export function useProductionBatch(id: number) {
  return useQuery({
    queryKey: ['production', 'batch', id],
    queryFn: () => fetchApi<unknown>(`/production/batches/${id}`),
    enabled: !!id,
  });
}

export function useGenerateBatches() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { date: string }) => postApi('/production/batches/generate', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); addToast('success', t('toasts.batchesGenerated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.batchesGenerateFailed')),
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/production/batches', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); addToast('success', t('toasts.batchCreated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.batchCreateFailed')),
  });
}

export function useUpdateBatchStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: number }) => patchApi(`/production/batches/${id}/stage`, { stage }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['production'] });
    },
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) => putApi(`/production/batches/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); addToast('success', t('toasts.batchUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.batchUpdateFailed')),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: number) => deleteApi(`/production/batches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); addToast('success', t('toasts.batchDeleted')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.batchDeleteFailed')),
  });
}

export function useSplitBatch() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, splitQuantity }: { id: number; splitQuantity: number }) => postApi(`/production/batches/${id}/split`, { splitQuantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); addToast('success', t('toasts.batchSplit')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.batchSplitFailed')),
  });
}

export function useMergeBatches() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { batchIds: number[] }) => postApi('/production/batches/merge', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); addToast('success', t('toasts.batchesMerged')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.batchesMergeFailed')),
  });
}

export function usePrepList(date: string) {
  return useQuery({
    queryKey: ['production', 'prep-list', date],
    queryFn: () => fetchApi<unknown[]>(`/production/prep-list?date=${date}`),
    enabled: !!date,
  });
}

export function useTogglePrepItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPrepped }: { id: number; isPrepped: boolean }) => patchApi(`/production/prep-list/${id}`, { isPrepped }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); },
  });
}

export function useProductionTimeline(date: string) {
  return useQuery({
    queryKey: ['production', 'timeline', date],
    queryFn: () => fetchApi<unknown[]>(`/production/timeline?date=${date}`),
    enabled: !!date,
  });
}

// Settings — Notifications
export function useNotificationPreferences() {
  return useQuery({ queryKey: ['notificationPrefs'], queryFn: () => fetchApi<unknown[]>('/settings/notifications') });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => putApi('/settings/notifications', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notificationPrefs'] }); addToast('success', t('toasts.notificationsUpdated')); },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'toasts.notificationsUpdateFailed')),
  });
}

// Settings — WhatsApp
export function useWhatsAppConfig() {
  return useQuery({
    queryKey: ['whatsappConfig'],
    queryFn: () => fetchApi<{ connected: boolean; phoneNumberId: string; businessAccountId: string; createdAt: string } | null>('/settings/whatsapp'),
  });
}

export function useConnectWhatsApp() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { code: string; phoneNumberId?: string; wabaId?: string }) => postApi('/settings/whatsapp/connect', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsappConfig'] }); addToast('success', t('toasts.whatsappConnected', 'WhatsApp connected')); },
    onError: () => addToast('error', t('toasts.whatsappConnectFailed', 'Failed to connect WhatsApp')),
  });
}

export function useDisconnectWhatsApp() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: () => deleteApi('/settings/whatsapp'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsappConfig'] }); addToast('success', t('toasts.whatsappDisconnected', 'WhatsApp disconnected')); },
    onError: () => addToast('error', t('toasts.whatsappDisconnectFailed', 'Failed to disconnect WhatsApp')),
  });
}

// ── Invoices ──────────────────────────────────────────────
export function useInvoices(page = 1, limit = 10, filters?: { type?: string; dateFrom?: string; dateTo?: string; search?: string }) {
  return useQuery({
    queryKey: ['invoices', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.type) params.set('type', filters.type);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.search) params.set('search', filters.search);
      const { data } = await apiClient.get(`/invoices?${params.toString()}`);
      return { invoices: data.data, pagination: data.pagination };
    },
    placeholderData: keepPreviousData,
  });
}

export function useOrderInvoices(orderId: number) {
  return useQuery({
    queryKey: ['invoices', 'order', orderId],
    queryFn: () => fetchApi<any[]>(`/invoices/order/${orderId}`),
    enabled: !!orderId,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: { orderId: number; notes?: string; invoiceDate?: string }) => postApi<any>('/invoices', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); addToast('success', t('toasts.invoiceCreated', 'Invoice created')); },
    onError: (err) => addToast('error', getApiErrorMessage(err, 'toasts.invoiceCreateFailed')),
  });
}

export function useCreateCreditNote(invoiceId: number) {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: { notes?: string }) => postApi<any>(`/invoices/${invoiceId}/credit-note`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); addToast('success', t('toasts.creditNoteCreated', 'Credit note created')); },
    onError: (err) => addToast('error', getApiErrorMessage(err, 'toasts.creditNoteCreateFailed')),
  });
}

export function useCurrentStore() {
  return useQuery({ queryKey: ['currentStore'], queryFn: () => fetchApi<any>('/stores/current') });
}

export function useUpdateBusinessInfo() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: { name?: string | null; nameEn?: string | null; address?: string | null; addressEn?: string | null; phone?: string | null; email?: string | null; taxNumber?: string | null; vatRate?: number; autoGenerateInvoice?: boolean; autoGenerateCreditNote?: boolean }) => patchApi<any>('/stores/business-info', data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['currentStore'] });
      qc.invalidateQueries({ queryKey: ['stores', 'all'] });
      if (variables.name) {
        const { stores, activeStoreId, setStores } = useAuthStore.getState();
        setStores(stores.map((s) => String(s.storeId) === String(activeStoreId) ? { ...s, store: { ...s.store, name: variables.name! } } : s));
      }
      addToast('success', t('toasts.businessInfoUpdated', 'Business info updated'));
    },
    onError: (err) => addToast('error', getApiErrorMessage(err, 'toasts.businessInfoUpdateFailed')),
  });
}

// Storefront — Slug & Toggle
export function useUpdateSlug() {
  const { t } = useTranslation();
  return useMutationWithToast(
    (data: { slug: string }) => patchApi<void>('/stores/slug', data),
    { invalidateKeys: [['currentStore']], successMessage: t('toasts.slugUpdated', 'Store URL updated'), errorMessage: 'toasts.slugUpdateFailed' },
  );
}

export function useUpdateStorefrontEnabled() {
  const { t } = useTranslation();
  return useMutationWithToast(
    (data: { enabled: boolean }) => patchApi<void>('/stores/storefront', data),
    { invalidateKeys: [['currentStore']], successMessage: t('toasts.storefrontUpdated', 'Storefront settings updated'), errorMessage: 'toasts.storefrontUpdateFailed' },
  );
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  return fetchApi<{ available: boolean }>(`/stores/slug/check?slug=${encodeURIComponent(slug)}`);
}

export function useGenerateBrandingUploadUrl() {
  return useMutation({
    mutationFn: (data: { type: 'logo' | 'banner'; mimeType: string }) =>
      postApi<{ uploadUrl: string; publicUrl: string }>('/stores/branding/upload-url', data),
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: { logoUrl?: string | null; bannerUrl?: string | null; description?: string | null; descriptionEn?: string | null; categorySubject?: string | null; categorySubSubject?: string | null }) =>
      patchApi<any>('/stores/branding', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currentStore'] });
      addToast('success', t('settings.storefront.branding.saved'));
    },
    onError: (err) => addToast('error', getApiErrorMessage(err, 'settings.storefront.branding.saveFailed')),
  });
}

export function useToggleRecipePublish() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => patchApi<any>(`/recipes/${id}/publish`, { isPublished }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      addToast('success', t('toasts.recipePublishUpdated', 'Recipe publish status updated'));
    },
    onError: (err) => addToast('error', getApiErrorMessage(err, 'toasts.recipePublishFailed')),
  });
}

// Loyalty — Dashboard
export function useLoyaltyDashboard(enabled = true) {
  return useQuery({
    queryKey: ['loyaltyDashboard'],
    queryFn: () => fetchApi<{
      upcomingBirthdays: Array<{ id: number; name: string; phone: string; birthday: string; daysUntil: number }>;
      dormantCustomers: Array<{ id: number; name: string; phone: string; lastOrderDate: string; daysSinceLastOrder: number; totalOrders: number }>;
      segmentCounts: { vip: number; regular: number; new: number; dormant: number; inactive: number };
    }>('/loyalty/dashboard'),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

// Customer Segments
export function useCustomerSegments() {
  return useQuery({
    queryKey: ['customerSegments'],
    queryFn: () => fetchApi<{ vip: number; regular: number; new: number; dormant: number; inactive: number }>('/customers/segments'),
    staleTime: 5 * 60 * 1000,
  });
}

// Translation
export function useTranslate() {
  return useMutation({
    mutationFn: (params: { text: string; fieldType: 'name' | 'description' }) =>
      postApi<{ translation: string }>('/ai-chat/translate', params),
  });
}
