import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/components/AppShell';
import { PageLoading, ToastContainer } from '@/components/Feedback';
import { useAuthStore } from '@/store/auth';
import { languageDir } from '@/utils/language';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Lazy-loaded pages – each import is stored so we can prefetch chunks after first paint
const pageImports = {
  login: () => import('@/pages/LoginPage'),
  loading: () => import('@/pages/LoadingPage'),
  register: () => import('@/pages/RegisterPage'),
  storeSetup: () => import('@/pages/StoreSetupPage'),
  dashboard: () => import('@/pages/DashboardPage'),
  orders: () => import('@/pages/OrdersPage'),
  orderDetail: () => import('@/pages/OrderDetailPage'),
  orderForm: () => import('@/pages/OrderFormPage'),
  recipes: () => import('@/pages/RecipesPage'),
  recipeDetail: () => import('@/pages/RecipeDetailPage'),
  recipeForm: () => import('@/pages/RecipeFormPage'),
  inventory: () => import('@/pages/InventoryPage'),
  customers: () => import('@/pages/CustomersPage'),
  customerDetail: () => import('@/pages/CustomerDetailPage'),
  payments: () => import('@/pages/PaymentsPage'),
  settings: () => import('@/pages/SettingsPage'),
  more: () => import('@/pages/MorePage'),
  invite: () => import('@/pages/InvitePage'),
  notFound: () => import('@/pages/NotFoundPage'),
  adminRoute: () => import('@/pages/admin/AdminRoute'),
  adminShell: () => import('@/pages/admin/AdminShell'),
  adminDashboard: () => import('@/pages/admin/AdminDashboardPage'),
  adminUsers: () => import('@/pages/admin/AdminUsersPage'),
  adminStores: () => import('@/pages/admin/AdminStoresPage'),
  adminInvitations: () => import('@/pages/admin/AdminInvitationsPage'),
  adminAuditLog: () => import('@/pages/admin/AdminAuditLogPage'),
  production: () => import('@/pages/ProductionPage'),
  productionKiosk: () => import('@/pages/ProductionKioskPage'),
};

const LoginPage = lazy(pageImports.login);
const LoadingPage = lazy(pageImports.loading);
const RegisterPage = lazy(pageImports.register);
const StoreSetupPage = lazy(pageImports.storeSetup);
const DashboardPage = lazy(pageImports.dashboard);
const OrdersPage = lazy(pageImports.orders);
const OrderDetailPage = lazy(pageImports.orderDetail);
const OrderFormPage = lazy(pageImports.orderForm);
const RecipesPage = lazy(pageImports.recipes);
const RecipeDetailPage = lazy(pageImports.recipeDetail);
const RecipeFormPage = lazy(pageImports.recipeForm);
const InventoryPage = lazy(pageImports.inventory);
const CustomersPage = lazy(pageImports.customers);
const CustomerDetailPage = lazy(pageImports.customerDetail);
const PaymentsPage = lazy(pageImports.payments);
const SettingsPage = lazy(pageImports.settings);
const MorePage = lazy(pageImports.more);
const InvitePage = lazy(pageImports.invite);
const NotFoundPage = lazy(pageImports.notFound);
const ProductionPage = lazy(pageImports.production);
const ProductionKioskPage = lazy(pageImports.productionKiosk);

// Admin pages
const AdminRoute = lazy(pageImports.adminRoute);
const AdminShell = lazy(pageImports.adminShell);
const AdminDashboardPage = lazy(pageImports.adminDashboard);
const AdminUsersPage = lazy(pageImports.adminUsers);
const AdminStoresPage = lazy(pageImports.adminStores);
const AdminInvitationsPage = lazy(pageImports.adminInvitations);
const AdminAuditLogPage = lazy(pageImports.adminAuditLog);

// Prefetch all page chunks once the app is idle after first paint
function prefetchAllPages() {
  Object.values(pageImports).forEach((importFn) => importFn());
}

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(prefetchAllPages);
  } else {
    setTimeout(prefetchAllPages, 2000);
  }
}

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
  const dir = languageDir(i18n.language);

  // Keep html dir/lang in sync
  React.useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [dir, i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <div dir={dir} className="min-h-screen bg-primary-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-body">
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Public routes */}
              <Route path="/loading" element={<LoadingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/:inviteToken" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/:inviteToken" element={<RegisterPage />} />
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

              {/* Kiosk mode — outside AppShell (no sidebar/tabs) */}
              <Route
                path="/production/kiosk"
                element={
                  <ProtectedRoute>
                    <ProductionKioskPage />
                  </ProtectedRoute>
                }
              />

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
                <Route path="production" element={<ProductionPage />} />
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
