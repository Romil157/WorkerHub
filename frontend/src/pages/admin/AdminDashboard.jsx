import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Shield, AlertCircle, Users, TrendingUp, LogOut, Bell, Wrench, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

export const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminLogout, admin } = useAuthStore();
  const navItems = [
    { path: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/admin/verification', icon: <Shield size={18} />, label: 'Verification Queue' },
    { path: '/admin/complaints', icon: <AlertCircle size={18} />, label: 'Complaints' },
    { path: '/admin/users', icon: <Users size={18} />, label: 'Users' },
    { path: '/admin/analytics', icon: <TrendingUp size={18} />, label: 'Analytics' },
  ];
  return (
    <div className="sidebar" style={{ background: '#1A1A2E', borderRight: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-rust)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wrench size={18} color="#fff" /></div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#fff' }}>WorkerHub</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.4)' }}>Admin Panel</div>
          </div>
        </Link>
      </div>

      {admin && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-rust)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>{admin.name?.[0]}</div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{admin.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.4)' }}>{admin.role?.replace('_', ' ')}</div>
          </div>
        </div>
      )}

      <nav style={{ padding: '16px 0', flex: 1 }}>
        {navItems.map(item => (
          <Link key={item.path} to={item.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', color: location.pathname === item.path ? 'var(--color-rust)' : 'rgba(255,255,255,.6)', fontWeight: location.pathname === item.path ? 600 : 400, fontSize: '0.9rem', background: location.pathname === item.path ? 'rgba(212,80,29,.15)' : 'transparent', borderLeft: location.pathname === item.path ? '3px solid var(--color-rust)' : '3px solid transparent', transition: 'all 0.2s' }}>
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <button onClick={() => { adminLogout(); navigate('/admin/login'); }} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', color: 'rgba(255,255,255,.5)', fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', width: '100%' }}>
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon, color, trend }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid var(--color-border)', borderTop: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <span style={{ color, fontSize: '1.2rem' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-dark)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: '0.78rem', color: 'var(--color-mid)' }}>{sub}</div>
  </div>
);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner spinner--lg" />
      </div>
    </div>
  );

  const { stats = {}, signupTrend = [] } = data || {};

  return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ background: '#F8F9FA' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <h4 style={{ margin: 0 }}>Dashboard Overview</h4>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/admin/verification" className="btn btn--primary btn--sm">🛡️ Review Queue ({stats.pendingVerification || 0})</Link>
          </div>
        </div>

        <div style={{ padding: 32 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            <StatCard label="Total Users" value={stats.totalUsers?.toLocaleString() || 0} sub={`${stats.todayBookings || 0} bookings today`} icon="👥" color="var(--color-info)" />
            <StatCard label="Verified Workers" value={stats.verifiedWorkers || 0} sub={`${stats.pendingVerification || 0} pending review`} icon="✅" color="var(--color-forest)" />
            <StatCard label="Total GMV" value={`₹${((stats.totalGMV || 0) / 100000).toFixed(1)}L`} sub={`₹${((stats.totalPlatformRevenue || 0) / 100000).toFixed(1)}L platform fee`} icon="💰" color="var(--color-rust)" />
            <StatCard label="Open Complaints" value={stats.openComplaints || 0} sub="Needs attention" icon="⚠️" color="#E74C3C" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Signup Trend */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginBottom: 20 }}>User Signups (Last 7 Days)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={signupTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-rust)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Actions */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginBottom: 20 }}>Quick Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Review Pending Verifications', href: '/admin/verification', badge: stats.pendingVerification, color: 'var(--color-rust)', icon: '🛡️' },
                  { label: 'Resolve Open Complaints', href: '/admin/complaints', badge: stats.openComplaints, color: '#E74C3C', icon: '⚠️' },
                  { label: 'View All Users', href: '/admin/users', color: 'var(--color-info)', icon: '👥' },
                  { label: 'View Analytics', href: '/admin/analytics', color: 'var(--color-forest)', icon: '📊' },
                ].map(a => (
                  <Link key={a.label} to={a.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-cream)', borderRadius: 10, fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-charcoal)', border: `1px solid var(--color-border)`, transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                    <span>{a.icon} {a.label}</span>
                    {a.badge > 0 && <span style={{ background: a.color, color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>{a.badge}</span>}
                  </Link>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: '16px', background: 'var(--color-cream-dark)', borderRadius: 12 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: 8 }}>Platform Health</div>
                {[
                  { label: 'Worker Verification Rate', value: `${stats.verifiedWorkers && stats.totalWorkers ? Math.round((stats.verifiedWorkers / stats.totalWorkers) * 100) : 0}%` },
                  { label: 'Total Bookings', value: stats.totalBookings?.toLocaleString() || 0 },
                  { label: 'Total Workers', value: stats.totalWorkers || 0 },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--color-mid)' }}>{m.label}</span>
                    <strong>{m.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
