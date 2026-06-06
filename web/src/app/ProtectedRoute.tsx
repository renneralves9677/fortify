import { Navigate, Outlet } from 'react-router-dom';
import { useIsAdmin, useToken } from '@/stores/auth-store';

export function ProtectedRoute() {
  const token = useToken();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const token = useToken();
  const isAdmin = useIsAdmin();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/inicio" replace />;
  return <Outlet />;
}

export function PublicRoute() {
  const token = useToken();
  if (token) return <Navigate to="/inicio" replace />;
  return <Outlet />;
}
