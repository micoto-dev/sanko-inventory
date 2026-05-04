import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { ToastContainer, LoadingSpinner } from './components/ui';
import useAuthStore from './stores/authStore';

// Eagerly loaded pages (critical path)
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import DocumentList from './pages/DocumentList';
import DocumentDetail from './pages/DocumentDetail';
import CompanyInfo from './pages/CompanyInfo';
import CategoryManagement from './pages/CategoryManagement';
import TagManagement from './pages/TagManagement';
import EntityManagement from './pages/EntityManagement';
import UserManagement from './pages/UserManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import StockDashboard from './pages/StockDashboard';
import PartsList from './pages/PartsList';
import PartDetail from './pages/PartDetail';
import PartsTrash from './pages/PartsTrash';
import StockEntry from './pages/StockEntry';
import StockAlerts from './pages/StockAlerts';
import PurchaseOrders from './pages/PurchaseOrders';
import AuditLog from './pages/AuditLog';
import NotFound from './pages/NotFound';
import DomainWhitelist from './pages/DomainWhitelist';

// Lazy loaded pages (heavy, not on critical path)
const Chat = lazy(() => import('./pages/Chat'));
const ConversationHistory = lazy(() => import('./pages/ConversationHistory'));

// Redirects to /reset-password if mustReset is true (and not already on /reset-password)
const MustResetRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mustReset = useAuthStore((s) => s.mustReset);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated && mustReset && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <ToastContainer />

      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="md" /></div>}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* mustReset guard: redirect authenticated users with mustReset flag */}
          <Route
            element={
              <MustResetRedirect>
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              </MustResetRedirect>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="documents" element={<DocumentList />} />
            <Route path="documents/:id" element={<DocumentDetail />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:conversationId" element={<Chat />} />
            <Route path="conversations" element={<ConversationHistory />} />
            <Route path="companies" element={<CompanyInfo />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="tags" element={<TagManagement />} />
            <Route path="entities" element={<EntityManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="departments" element={<DepartmentManagement />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="stock" element={<StockDashboard />} />
            <Route path="parts" element={<PartsList />} />
            <Route path="parts/trash" element={<PartsTrash />} />
            <Route path="parts/:id" element={<PartDetail />} />
            <Route path="stock-entry" element={<StockEntry />} />
            <Route path="stock-alerts" element={<StockAlerts />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="domain-whitelist" element={<DomainWhitelist />} />
          </Route>

          {/* 404 Page - must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
