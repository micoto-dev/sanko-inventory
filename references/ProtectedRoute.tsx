import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

interface Props {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const mustReset = useAuthStore((s) => s.mustReset);
  const checkSession = useAuthStore((s) => s.checkSession);
  const location = useLocation();

  // On mount: always validate session via API (covers new tab with cookie but no localStorage)
  useEffect(() => {
    checkSession();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Show nothing while checking session (prevents flash of redirect)
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force user with must_reset flag to stay on /reset-password
  if (mustReset && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  return children;
};

export default ProtectedRoute;
