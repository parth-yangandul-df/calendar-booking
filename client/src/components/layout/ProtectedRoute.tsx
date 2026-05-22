import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
