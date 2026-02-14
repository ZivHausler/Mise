import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => postApi<{ user: unknown; token: string }>('/auth/login', body),
    onError: () => addToast('error', 'Login failed'),
  });
}

export function useRegister() {
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      postApi<{ user: unknown; token: string }>('/auth/register', body),
    onError: () => addToast('error', 'Registration failed'),
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
  return useMutation({
    mutationFn: (body: unknown) => postApi('/orders', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); addToast('success', 'Order created'); },
    onError: () => addToast('error', 'Failed to create order'),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/orders/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); addToast('success', 'Order updated'); },
    onError: () => addToast('error', 'Failed to update order'),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) => patchApi(`/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); addToast('success', 'Order updated'); },
    onError: () => addToast('error', 'Failed to update order'),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); addToast('success', 'Order deleted'); },
    onError: () => addToast('error', 'Failed to delete order'),
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
  return useMutation({
    mutationFn: (body: unknown) => postApi('/recipes', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', 'Recipe created'); },
    onError: () => addToast('error', 'Failed to create recipe'),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/recipes/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', 'Recipe updated'); },
    onError: () => addToast('error', 'Failed to update recipe'),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/recipes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); addToast('success', 'Recipe deleted'); },
    onError: () => addToast('error', 'Failed to delete recipe'),
  });
}

// Inventory
export function useInventory() {
  return useQuery({ queryKey: ['inventory'], queryFn: () => fetchApi<unknown[]>('/inventory') });
}

export function useInventoryItem(id: string) {
  return useQuery({ queryKey: ['inventory', id], queryFn: () => fetchApi<unknown>(`/inventory/${id}`), enabled: !!id });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (body: unknown) => postApi('/inventory', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', 'Item added'); },
    onError: () => addToast('error', 'Failed to add item'),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/inventory/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', 'Item updated'); },
    onError: () => addToast('error', 'Failed to update item'),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/inventory/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); addToast('success', 'Item deleted'); },
    onError: () => addToast('error', 'Failed to delete item'),
  });
}

// Customers
export function useCustomers() {
  return useQuery({ queryKey: ['customers'], queryFn: () => fetchApi<unknown[]>('/customers') });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: ['customers', id], queryFn: () => fetchApi<unknown>(`/customers/${id}`), enabled: !!id });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (body: unknown) => postApi('/customers', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', 'Customer created'); },
    onError: () => addToast('error', 'Failed to create customer'),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => putApi(`/customers/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', 'Customer updated'); },
    onError: () => addToast('error', 'Failed to update customer'),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => deleteApi(`/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); addToast('success', 'Customer deleted'); },
    onError: () => addToast('error', 'Failed to delete customer'),
  });
}

// Payments
export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: () => fetchApi<unknown[]>('/payments') });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  return useMutation({
    mutationFn: (body: unknown) => postApi('/payments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      addToast('success', 'Payment logged');
    },
    onError: () => addToast('error', 'Failed to log payment'),
  });
}

// Dashboard
export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => fetchApi<unknown>('/analytics/dashboard'), staleTime: 60_000 });
}
