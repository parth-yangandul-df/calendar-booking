import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // While the session check is in flight, render nothing.
  // This avoids flashing "Checking authentication..." text on every page load.
  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
