import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/AppShell';
import { PageLoading } from '@/components/Feedback';
import { useAuthStore } from '@/store/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'));
const OrderFormPage = lazy(() => import('@/pages/OrderFormPage'));
const RecipesPage = lazy(() => import('@/pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('@/pages/RecipeDetailPage'));
const RecipeFormPage = lazy(() => import('@/pages/RecipeFormPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const CustomersPage = lazy(() => import('@/pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/pages/CustomerDetailPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const MorePage = lazy(() => import('@/pages/MorePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const { i18n } = useTranslation();
  const dir = i18n.language === 'he' ? 'rtl' : 'ltr';

  // Keep html dir/lang in sync
  React.useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [dir, i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <div dir={dir} className="min-h-screen bg-primary-50 text-neutral-900 font-body">
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes with app shell */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/new" element={<OrderFormPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="orders/:id/edit" element={<OrderFormPage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="recipes/new" element={<RecipeFormPage />} />
                <Route path="recipes/:id" element={<RecipeDetailPage />} />
                <Route path="recipes/:id/edit" element={<RecipeFormPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/:id" element={<InventoryPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="more" element={<MorePage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}
