import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Briefcase, MessageSquare, User, LogOut, Star, TrendingUp, Clock, CheckCircle, AlertCircle, Wrench, Menu, X, IndianRupee, XCircle, MessageCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import NotificationBell from '../../components/NotificationBell';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { path: '/worker/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { path: '/worker/orders', icon: <Briefcase size={18} />, label: 'My Jobs' },
  { path: '/worker/messages', icon: <MessageSquare size={18} />, label: 'Messages' },
  { path: '/worker/profile', icon: <User size={18} />, label: 'Profile' },
];

const STATUS_CONFIG = {
  pending: { color: 'var(--color-pending)', label: 'Pending', icon: <Clock size={14} /> },
  accepted: { color: 'var(--color-info)', label: 'Accepted', icon: <CheckCircle size={14} /> },
  in_progress: { color: 'var(--color-forest)', label: 'In Progress', icon: <CheckCircle size={14} /> },
  completed: { color: 'var(--color-verified)', label: 'Completed', icon: <CheckCircle size={14} /> },
  cancelled: { color: 'var(--color-rejected)', label: 'Cancelled', icon: <AlertCircle size={14} /> },
};

export const PortalSidebar = ({ navItems, title, color = 'var(--color-rust)' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: 16, left: 16, zIndex: 300, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, padding: 10, display: 'none' }} className="mobile-menu-btn">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: color, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-dark)' }}>WorkerHub</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)', fontWeight: 500 }}>{title}</div>
            </div>
          </Link>
        </div>

        {/* User info */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=D4501D&color=fff`} alt="Avatar" className="avatar avatar--md" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {user?.isVerified
                  ? <span className="badge badge--verified" style={{ fontSize: '0.65rem' }}>✓ Verified</span>
                  : <span className="badge badge--pending" style={{ fontSize: '0.65rem' }}>⏳ Pending</span>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidenav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`sidenav__item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              {item.icon}
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', background: 'var(--color-rejected)', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{item.badge}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={() => { logout(); navigate('/'); }} className="sidenav__item" style={{ width: '100%', borderRadius: 10 }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default function WorkerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [earningPeriod, setEarningPeriod] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Support / Query state (Phase 5)
  const [supportModal, setSupportModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [myQueries, setMyQueries] = useState([]);
  const [submittingQuery, setSubmittingQuery] = useState(false);

  useEffect(() => {
    if (supportModal) {
      api.get('/queries/mine')
        .then(r => setMyQueries(r.data.data))
        .catch(() => {});
    }
  }, [supportModal]);

  const handleSubmitQuery = async () => {
    if (!newQuestion.trim()) return;
    setSubmittingQuery(true);
    try {
      await api.post('/queries', { question: newQuestion.trim() });
      setNewQuestion('');
      // Reload queries
      const r = await api.get('/queries/mine');
      setMyQueries(r.data.data);
      toast.success('Question submitted successfully!');
    } catch {}
    setSubmittingQuery(false);
  };

  const load = async () => {
    try {
      const [dash, earnings] = await Promise.all([
        api.get('/workers/dashboard'),
        api.get(`/workers/earnings?period=${earningPeriod}`),
      ]);
      setData(dash.data.data);
      const raw = earnings.data.data.earnings || [];
      setChartData(raw.map(d => ({ date: d._id, amount: d.total, jobs: d.count })));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [earningPeriod]);

  // Auto-refresh every 30s to pick up completed jobs / new earnings
  useEffect(() => {
    const interval = setInterval(() => { load(); }, 30000);
    return () => clearInterval(interval);
  }, [earningPeriod]);

  if (loading) return (
    <div className="portal-layout">
      <PortalSidebar navItems={NAV_ITEMS} title="Worker Portal" />
      <div className="portal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner spinner--lg" />
      </div>
    </div>
  );

  const { stats, upcomingJobs = [], recentReviews = [] } = data || {};

  return (
    <div className="portal-layout">
      <PortalSidebar navItems={NAV_ITEMS} title="Worker Portal" />
      <div className="portal-main">
        {/* Topbar */}
        <div className="portal-topbar">
          <div>
            <h4 style={{ marginBottom: 0 }}>Welcome back, {user?.name?.split(' ')[0]}! 👋</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-subtle)', margin: 0 }}>Here's what's happening today</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={load} title="Refresh stats" style={{ background: 'var(--color-cream)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-mid)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              🔄 Refresh
            </button>
            <NotificationBell />
            <Link to="/worker/profile">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'W')}&background=D4501D&color=fff`} className="avatar avatar--sm" alt="Profile" />
            </Link>
          </div>
        </div>

        <div className="portal-content">
          {/* Status Alert */}
          {!user?.isVerified && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: '#FEF9E7', border: '1px solid var(--color-gold)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
              <AlertCircle size={20} color="var(--color-gold)" />
              <div>
                <strong style={{ display: 'block', marginBottom: 2 }}>Profile Under Verification</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-mid)' }}>Our admin team will review your documents within 1-2 business days. You'll receive an email once approved.</span>
              </div>
            </motion.div>
          )}

          {/* Earnings Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Today', value: `₹${(stats?.todayEarnings || 0).toLocaleString('en-IN')}`, sub: `${stats?.todayJobs || 0} jobs`, color: 'var(--color-rust)' },
              { label: 'This Month', value: `₹${(stats?.monthEarnings || 0).toLocaleString('en-IN')}`, sub: `${stats?.monthJobs || 0} jobs`, color: 'var(--color-info)' },
              { label: 'Total Earnings', value: `₹${(stats?.totalEarnings || 0).toLocaleString('en-IN')}`, sub: `${stats?.totalJobs || 0} total jobs`, color: 'var(--color-forest)' },
              { label: 'Rating', value: `${stats?.rating || 0}⭐`, sub: `${stats?.reviews || 0} reviews`, color: 'var(--color-gold)' },
            ].map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid var(--color-border)', borderTop: `3px solid ${card.color}` }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-dark)', lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-mid)', marginTop: 4 }}>{card.sub}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Earnings Chart */}
            <div className="card">
              <div className="flex-between" style={{ marginBottom: 20 }}>
                <h4 style={{ margin: 0 }}>Earnings Overview</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['week', 'month'].map(p => (
                    <button key={p} onClick={() => setEarningPeriod(p)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: earningPeriod === p ? 'var(--color-rust)' : 'var(--color-cream)', color: earningPeriod === p ? '#fff' : 'var(--color-mid)' }}>
                      {p === 'week' ? 'This Week' : 'This Month'}
                    </button>
                  ))}
                </div>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Earnings']} />
                    <Bar dataKey="amount" fill="var(--color-rust)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-subtle)', flexDirection: 'column', gap: 8 }}>
                  <TrendingUp size={32} opacity={0.3} />
                  <span style={{ fontSize: '0.85rem' }}>Complete jobs to see earnings chart</span>
                </div>
              )}
            </div>

            {/* Stats Card */}
            <div className="card">
              <h4 style={{ marginBottom: 20 }}>Your Performance</h4>
              {[
                { label: 'Completion Rate', value: `${stats?.completionRate || 0}%`, color: 'var(--color-forest)' },
                { label: 'Response Time', value: `${stats?.responseTime || 0} mins`, color: 'var(--color-info)' },
                { label: 'Jobs Completed', value: stats?.totalJobs || 0, color: 'var(--color-rust)' },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-mid)', fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: s.color }}>{s.value}</span>
                  </div>
                </div>
              ))}
              <div className="divider" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-gold)' }}>⭐ {stats?.rating || 0}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-subtle)' }}>{stats?.reviews || 0} verified reviews</div>
              </div>
            </div>
          </div>

          {/* Upcoming Jobs */}
          <div style={{ marginTop: 24 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h4>Upcoming Jobs</h4>
              <Link to="/worker/orders" className="btn btn--ghost btn--sm">View All</Link>
            </div>
            {upcomingJobs.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {upcomingJobs.map((job, i) => (
                  <motion.div key={job._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                    style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <img src={job.customerId?.avatar || `https://ui-avatars.com/api/?name=C&background=FAF5F0&color=2C2C2C`} className="avatar avatar--sm" alt="" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{job.customerId?.name || 'Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>{job.skillRequired}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 20, background: `${STATUS_CONFIG[job.status]?.color}20`, color: STATUS_CONFIG[job.status]?.color, fontWeight: 600 }}>
                        {STATUS_CONFIG[job.status]?.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-mid)', marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{job.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-subtle)' }}>
                        📅 {new Date(job.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {job.scheduledTime}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--color-forest)' }}>₹{job.totalAmount}</span>
                    </div>
                    {job.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn--primary btn--sm" style={{ flex: 1 }} onClick={async () => {
                          try { await api.put(`/bookings/${job._id}/accept`); setData(d => ({ ...d, upcomingJobs: d.upcomingJobs.map(j => j._id === job._id ? { ...j, status: 'accepted' } : j) })); } catch {}
                        }}>Accept</button>
                        <button className="btn btn--ghost btn--sm" style={{ flexShrink: 0 }}>Decline</button>
                      </div>
                    )}
                    {job.status === 'accepted' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <Link to="/worker/messages" state={{ newChatUserId: job.customerId?._id, newChatUser: job.customerId }} className="btn btn--ghost btn--sm" style={{ flex: 1 }}>💬 Chat with Customer</Link>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-subtle)' }}>
                <Briefcase size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>No upcoming jobs. Keep your profile updated to get more bookings!</p>
              </div>
            )}
          </div>

          {/* Recent Reviews */}
          {recentReviews.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 16 }}>Recent Reviews</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentReviews.map(review => (
                  <div key={review._id} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid var(--color-border)', display: 'flex', gap: 16 }}>
                    <img src={review.reviewerId?.avatar || `https://ui-avatars.com/api/?name=C&background=FAF5F0&color=2C2C2C`} className="avatar avatar--sm" alt="" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{review.reviewerId?.name}</span>
                        <div style={{ display: 'flex', gap: 2 }}>{'★'.repeat(review.rating).split('').map((s, i) => <span key={i} style={{ color: 'var(--color-gold)', fontSize: '0.9rem' }}>★</span>)}</div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-mid)' }}>{review.text}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', marginTop: 6 }}>{new Date(review.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help & Support Card (Phase 5) */}
          <div className="card" style={{ marginTop: 28, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><MessageCircle size={20} color="var(--color-rust)" /> Help & Support Channel</h4>
              <p style={{ color: 'var(--color-subtle)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Need help with payouts, reviews, or booking schedules? Ask our support team.</p>
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => setSupportModal(true)}>
              Ask a Question
            </button>
          </div>
        </div>
      </div>

      {/* ===================== SUPPORT MODAL (Phase 5) ===================== */}
      {supportModal && (
        <div className="modal-overlay" onClick={() => setSupportModal(false)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            style={{ maxWidth: 540, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div className="flex-between" style={{ marginBottom: 20, flexShrink: 0 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                💬 Ask a Question
              </h3>
              <button onClick={() => setSupportModal(false)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>

            {/* Past queries list */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 20, paddingRight: 4 }}>
              <h5 style={{ marginBottom: 12, color: 'var(--color-charcoal)' }}>Your Support Tickets</h5>
              {myQueries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-subtle)', fontSize: '0.85rem' }}>
                  No past questions. Submit your first query below!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {myQueries.map(q => (
                    <div key={q._id} style={{ background: 'var(--color-cream)', borderRadius: 12, padding: 14, border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-subtle)' }}>{new Date(q.createdAt).toLocaleDateString('en-IN')}</span>
                        <span className={`badge badge--${q.status === 'answered' ? 'verified' : q.status === 'closed' ? 'subtle' : 'pending'}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                          {q.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)', fontWeight: 600, margin: 0 }}>Q: {q.question}</p>
                      {q.adminReply && (
                        <div style={{ background: '#fff', borderRadius: 8, padding: 10, marginTop: 8, borderLeft: '3px solid var(--color-rust)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-subtle)', display: 'block', marginBottom: 2 }}>Admin reply:</span>
                          <p style={{ fontSize: '0.82rem', color: 'var(--color-mid)', margin: 0 }}>{q.adminReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New query input */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, flexShrink: 0 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>New Question</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Ask any question... e.g. When will I receive my payout? Can I change my bank account?"
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn--ghost btn--full" onClick={() => setSupportModal(false)}>Close</button>
                <button className="btn btn--primary btn--full" onClick={handleSubmitQuery} disabled={submittingQuery || !newQuestion.trim()}>
                  {submittingQuery ? 'Submitting...' : 'Submit Question'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
