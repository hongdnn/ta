import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@web/stores/authStore';

type Props = {
  children: JSX.Element;
};

export function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

