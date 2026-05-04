import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';

interface Props {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkSession = useAuthStore((s) => s.checkSession);

  // On mount: validate stored session with the server
  useEffect(() => {
    if (!isLoading) {
      checkSession();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Show nothing while checking session (prevents flash of redirect)
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
