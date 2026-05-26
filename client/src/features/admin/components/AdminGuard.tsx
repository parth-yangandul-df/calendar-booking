import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export function AdminGuard() {
  const { user, isLoading } = useAuth();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isLoading && user && !user.isAdmin && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error("You don't have permission to access this page.");
    }
  }, [isLoading, user]);

  if (isLoading) return null;

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
