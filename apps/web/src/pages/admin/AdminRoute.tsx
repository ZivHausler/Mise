import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useAdminAccess } from '@/api/hooks';
import { PageSkeleton } from '@/components/Feedback';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { isLoading, isError } = useAdminAccess();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin || isError) return <Navigate to="/" replace />;
  if (isLoading) return <PageSkeleton />;

  return <>{children}</>;
}
