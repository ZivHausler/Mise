import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from './client';
import { useToastStore } from '@/store/toast';

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

// Auth
export function useLogin() {
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => postApi<{ user: unknown; token: string }>('/auth/login', body),
    onError: () => addToast('error', t('toasts.loginFailed')),
  });
}

export function useRegister() {
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; inviteToken?: string }) =>
      postApi<{ user: unknown; token: string; hasStore: boolean }>('/auth/register', body),
    onError: () => addToast('error', t('toasts.registrationFailed')),
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: (body: { idToken: string }) => postApi<{ user: unknown; token: string }>('/auth/google', body),
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

// Orders
export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: () => fetchApi<unknown[]>('/orders') });
}

export function useOrder(id: string) {
  return useQuery({ queryKey: ['orders', id], queryFn: () => fetchApi<unknown>(`/orders/${id}`), enabled: !!id });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/orders', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderCreated')); },
    onError: () => addToast('error', t('toasts.orderCreateFailed')),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/orders/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderUpdated')); },
    onError: () => addToast('error', t('toasts.orderUpdateFailed')),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) => patchApi(`/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderUpdated')); },
    onError: () => addToast('error', t('toasts.orderUpdateFailed')),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); addToast('success', t('toasts.orderDeleted')); },
    onError: () => addToast('error', t('toasts.orderDeleteFailed')),
  });
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
    onError: () => addToast('error', t('toasts.recipeCreateFailed')),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/recipes/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', t('toasts.recipeUpdated')); },
    onError: () => addToast('error', t('toasts.recipeUpdateFailed')),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/recipes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', t('toasts.recipeDeleted')); },
    onError: () => addToast('error', t('toasts.recipeDeleteFailed')),
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

export function useInventory(page = 1, limit = 10, search?: string, groupIds?: string[]) {
  return useQuery({
    queryKey: ['inventory', page, limit, search, groupIds],
    queryFn: async (): Promise<PaginatedResponse<unknown>> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (groupIds?.length) params.set('groupIds', groupIds.join(','));
      const { data } = await apiClient.get(`/inventory?${params}`);
      return { items: data.data ?? [], pagination: data.pagination };
    },
  });
}

export function useInventoryItem(id: string) {
  return useQuery({ queryKey: ['inventory', id], queryFn: () => fetchApi<unknown>(`/inventory/${id}`), enabled: !!id });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/inventory', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.itemAdded')); },
    onError: () => addToast('error', t('toasts.itemAddFailed')),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/inventory/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.itemUpdated')); },
    onError: () => addToast('error', t('toasts.itemUpdateFailed')),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { ingredientId: string; type: string; quantity: number; pricePaid?: number }) => postApi('/inventory/adjust', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.stockAdjusted')); },
    onError: () => addToast('error', t('toasts.stockAdjustFailed')),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/inventory/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', t('toasts.itemDeleted')); },
    onError: () => addToast('error', t('toasts.itemDeleteFailed')),
  });
}

// Customers
export function useCustomers() {
  return useQuery({ queryKey: ['customers'], queryFn: () => fetchApi<unknown[]>('/customers') });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: ['customers', id], queryFn: () => fetchApi<unknown>(`/customers/${id}`), enabled: !!id });
}

export function useCustomerOrders(customerId: string, page = 1, limit = 10, filters?: { status?: number; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['orders', 'customer', customerId, page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.status !== undefined) params.set('status', String(filters.status));
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
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
      const code = error?.response?.data?.error?.code;
      if (code === 'CUSTOMER_PHONE_EXISTS' || code === 'CUSTOMER_EMAIL_EXISTS') return;
      addToast('error', t('toasts.customerCreateFailed'));
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/customers/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', t('toasts.customerUpdated')); },
    onError: () => addToast('error', t('toasts.customerUpdateFailed')),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', t('toasts.customerDeleted')); },
    onError: () => addToast('error', t('toasts.customerDeleteFailed')),
  });
}

// Payments
export function usePayments(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['payments', page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/payments?page=${page}&limit=${limit}`);
      return { payments: data.data, pagination: data.pagination };
    },
  });
}

export function useCustomerPayments(customerId: string, page = 1, limit = 10, filters?: { method?: string; dateFrom?: string; dateTo?: string }) {
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
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', t('toasts.paymentLogged'));
    },
    onError: () => addToast('error', t('toasts.paymentLogFailed')),
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
    onError: () => addToast('error', t('toasts.unitCreateFailed')),
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/settings/units/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); addToast('success', t('toasts.unitUpdated')); },
    onError: () => addToast('error', t('toasts.unitUpdateFailed')),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/settings/units/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); addToast('success', t('toasts.unitDeleted')); },
    onError: () => addToast('error', t('toasts.unitDeleteFailed')),
  });
}

// Settings — Groups
export function useGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: () => fetchApi<unknown[]>('/settings/groups') });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: unknown) => postApi('/settings/groups', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); addToast('success', t('toasts.groupCreated')); },
    onError: () => addToast('error', t('toasts.groupCreateFailed')),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/settings/groups/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); addToast('success', t('toasts.groupUpdated')); },
    onError: () => addToast('error', t('toasts.groupUpdateFailed')),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/settings/groups/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); addToast('success', t('toasts.groupDeleted')); },
    onError: () => addToast('error', t('toasts.groupDeleteFailed')),
  });
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
    onError: () => addToast('error', t('toasts.profileUpdateFailed')),
  });
}

// Stores
export function useCreateStore() {
  return useMutation({
    mutationFn: (body: { name: string; code?: string; address?: string }) =>
      postApi<{ store: unknown; token: string }>('/stores', body),
  });
}

export function useMyStores() {
  return useQuery({ queryKey: ['stores'], queryFn: () => fetchApi<unknown[]>('/stores/my') });
}

export function useSelectStore() {
  return useMutation({
    mutationFn: (body: { storeId: string }) => postApi<{ token: string }>('/stores/select', body),
  });
}

export function useValidateInvite(token?: string) {
  return useQuery({
    queryKey: ['invite', token],
    queryFn: () => fetchApi<{ storeName: string; email: string; role: number }>(`/stores/invite/${token}`),
    enabled: !!token,
  });
}

export function useStoreMembers() {
  return useQuery({ queryKey: ['storeMembers'], queryFn: () => fetchApi<unknown[]>('/stores/members') });
}

export function useSendInvite() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: { email: string; role: number }) => postApi('/stores/invite', body),
    onSuccess: () => { addToast('success', t('toasts.inviteSent')); qc.invalidateQueries({ queryKey: ['storeMembers'] }); },
    onError: () => addToast('error', t('toasts.inviteFailed')),
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
    onError: () => addToast('error', t('toasts.notificationsUpdateFailed')),
  });
}
