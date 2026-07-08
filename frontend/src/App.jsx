import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useAuthStore from './store/authStore';

// Landing
import LandingPage from './pages/landing/LandingPage';

// Worker Portal
import WorkerRegister from './pages/worker/WorkerRegister';
import WorkerLogin from './pages/worker/WorkerLogin';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerProfile from './pages/worker/WorkerProfile';
import WorkerOrders from './pages/worker/WorkerOrders';
import WorkerMessages from './pages/worker/WorkerMessages';
import WorkerRoute from './pages/worker/WorkerRoute';

// Customer Portal
import CustomerRegister from './pages/customer/CustomerRegister';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerSearch from './pages/customer/CustomerSearch';
import CustomerWorkerProfile from './pages/customer/CustomerWorkerProfile';
import CustomerBooking from './pages/customer/CustomerBooking';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerMessages from './pages/customer/CustomerMessages';
import CustomerProfile from './pages/customer/CustomerProfile';

// Admin Panel
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVerification from './pages/admin/AdminVerification';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminViewUser from './pages/admin/AdminViewUser';

// Auth Guard
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to={`/${requiredRole}/login`} replace />;
  if (requiredRole !== 'admin' && user.userType !== requiredRole) return <Navigate to="/" replace />;
  return children;
};

const AdminProtectedRoute = ({ children }) => {
  const { admin, adminToken } = useAuthStore();
  if (!adminToken || !admin) return <Navigate to="/admin/login" replace />;
  return children;
};

// Global Back Button Overlay
const GlobalBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  if (location.pathname === '/') return null;

  return (
    <button 
      onClick={() => navigate(-1)}
      style={{
        position: 'fixed',
        bottom: 30,
        left: 30,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 16px',
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 50,
        boxShadow: 'var(--shadow-md)',
        fontWeight: 600,
        fontSize: '0.85rem',
        color: 'var(--color-charcoal)',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => Object.assign(e.currentTarget.style, { transform: 'translateY(-2px)', boxShadow: 'var(--shadow-lg)' })}
      onMouseOut={(e) => Object.assign(e.currentTarget.style, { transform: 'translateY(0)', boxShadow: 'var(--shadow-md)' })}
    >
      <ArrowLeft size={16} /> Back
    </button>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <GlobalBackButton />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Worker Portal */}
        <Route path="/worker/register" element={<WorkerRegister />} />
        <Route path="/worker/login" element={<WorkerLogin />} />
        <Route path="/worker/dashboard" element={<ProtectedRoute requiredRole="worker"><WorkerDashboard /></ProtectedRoute>} />
        <Route path="/worker/profile" element={<ProtectedRoute requiredRole="worker"><WorkerProfile /></ProtectedRoute>} />
        <Route path="/worker/orders" element={<ProtectedRoute requiredRole="worker"><WorkerOrders /></ProtectedRoute>} />
        <Route path="/worker/route" element={<ProtectedRoute requiredRole="worker"><WorkerRoute /></ProtectedRoute>} />
        <Route path="/worker/messages" element={<ProtectedRoute requiredRole="worker"><WorkerMessages /></ProtectedRoute>} />

        {/* Customer Portal */}
        <Route path="/customer/register" element={<CustomerRegister />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer/dashboard" element={<ProtectedRoute requiredRole="customer"><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/search" element={<CustomerSearch />} />
        <Route path="/customer/worker/:workerId" element={<CustomerWorkerProfile />} />
        <Route path="/customer/booking/:workerId" element={<ProtectedRoute requiredRole="customer"><CustomerBooking /></ProtectedRoute>} />
        <Route path="/customer/orders" element={<ProtectedRoute requiredRole="customer"><CustomerOrders /></ProtectedRoute>} />
        <Route path="/customer/messages" element={<ProtectedRoute requiredRole="customer"><CustomerMessages /></ProtectedRoute>} />
        <Route path="/customer/profile" element={<ProtectedRoute requiredRole="customer"><CustomerProfile /></ProtectedRoute>} />

        {/* Admin Panel */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/verification" element={<AdminProtectedRoute><AdminVerification /></AdminProtectedRoute>} />
        <Route path="/admin/complaints" element={<AdminProtectedRoute><AdminComplaints /></AdminProtectedRoute>} />
        <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
        <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/view-user/:userId" element={<AdminProtectedRoute><AdminViewUser /></AdminProtectedRoute>} />


        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
