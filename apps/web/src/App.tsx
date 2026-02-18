import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/AppShell';
import { PageLoading, ToastContainer } from '@/components/Feedback';
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
const StoreSetupPage = lazy(() => import('@/pages/StoreSetupPage'));
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
const InvitePage = lazy(() => import('@/pages/InvitePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Admin pages
const AdminRoute = lazy(() => import('@/pages/admin/AdminRoute'));
const AdminShell = lazy(() => import('@/pages/admin/AdminShell'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminStoresPage = lazy(() => import('@/pages/admin/AdminStoresPage'));
const AdminInvitationsPage = lazy(() => import('@/pages/admin/AdminInvitationsPage'));
const AdminAuditLogPage = lazy(() => import('@/pages/admin/AdminAuditLogPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasStore = useAuthStore((s) => s.hasStore);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasStore) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function StoreSetupRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasStore = useAuthStore((s) => s.hasStore);
  const pendingCreateStoreToken = useAuthStore((s) => s.pendingCreateStoreToken);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (hasStore) return <Navigate to="/" replace />;
  if (!pendingCreateStoreToken) return <Navigate to="/login" replace />;
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />

              {/* Store setup route */}
              <Route
                path="/store-setup"
                element={
                  <StoreSetupRoute>
                    <StoreSetupPage />
                  </StoreSetupRoute>
                }
              />

              {/* Admin routes */}
              <Route
                element={
                  <AdminRoute>
                    <AdminShell />
                  </AdminRoute>
                }
              >
                <Route path="admin" element={<AdminDashboardPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route path="admin/stores" element={<AdminStoresPage />} />
                <Route path="admin/invitations" element={<AdminInvitationsPage />} />
                <Route path="admin/audit-log" element={<AdminAuditLogPage />} />
              </Route>

              {/* Protected routes with app shell */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell key={i18n.language} />
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
        <ToastContainer />
      </div>
    </QueryClientProvider>
  );
}
