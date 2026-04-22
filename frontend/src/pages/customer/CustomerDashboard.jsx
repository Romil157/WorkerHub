import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Heart, Star, MapPin, User, LayoutDashboard, MessageSquare, Briefcase, LogOut, Wrench, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import NotificationBell from '../../components/NotificationBell';

const STATUS_CONFIG = {
  pending:     { color: '#E67E22', label: '⏳ Pending' },
  accepted:    { color: '#3498DB', label: '✓ Accepted' },
  in_progress: { color: '#1A5D3D', label: '🔵 In Progress' },
  completed:   { color: '#27AE60', label: '✅ Completed' },
  cancelled:   { color: '#E74C3C', label: '❌ Cancelled' },
};

export const CustomerSidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const navItems = [
    { path: '/customer/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/customer/search', icon: <Search size={18} />, label: 'Find Workers' },
    { path: '/customer/orders', icon: <Briefcase size={18} />, label: 'My Orders' },
    { path: '/customer/messages', icon: <MessageSquare size={18} />, label: 'Messages' },
    { path: '/customer/profile', icon: <User size={18} />, label: 'My Profile' },
  ];
  const { pathname } = window.location;

  return (
    <div className="sidebar">
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-forest)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wrench size={18} color="#fff" /></div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>WorkerHub</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)' }}>Customer Portal</div>
          </div>
        </Link>
      </div>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
        {/* Clickable avatar → profile */}
        <Link to="/customer/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', borderRadius: 12, padding: '6px 8px', transition: 'background 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--color-cream)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
          <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=1A5D3D&color=fff`} className="avatar avatar--md" alt="" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-charcoal)' }}>{user?.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-forest)', fontWeight: 600 }}>View Profile →</div>
          </div>
        </Link>
      </div>
      <nav className="sidenav">
        {navItems.map(item => (
          <Link key={item.path} to={item.path} className={`sidenav__item ${pathname === item.path ? 'active' : ''}`} style={{ color: pathname === item.path ? 'var(--color-forest)' : undefined }}>
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
        <button onClick={() => { logout(); navigate('/'); }} className="sidenav__item" style={{ width: '100%', borderRadius: 10 }}><LogOut size={18} /> Logout</button>
      </div>
    </div>
  );
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchSkill, setSearchSkill] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const r = await api.get('/customers/dashboard');
      setData(r.data.data);
    } catch {}
    if (!silent) setLoading(false); else setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => navigate(`/customer/search${searchSkill ? `?skill=${searchSkill}` : ''}`);

  const SKILLS = [
    'Plumbing', 'Electrical Work', 'Carpentry', 'Painting', 'AC Repair', 
    'House Cleaning', 'Pest Control', 'Gardening', 'Home Appliance Repair', 
    'Welding', 'Babysitting', 'Maid & Cooking', 'Dog Walking', 'Tutor', 
    'Driver', 'Beautician', 'Yoga Instructor'
  ];

  if (loading) return <div className="portal-layout"><CustomerSidebar /><div className="portal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner spinner--lg" /></div></div>;

  const { activeOrders = [], recentOrders = [], customer } = data || {};

  return (
    <div className="portal-layout">
      <CustomerSidebar />
      <div className="portal-main">
        <div className="portal-topbar flex-between">
          <div>
            <h4>Hey, {user?.name?.split(' ')[0]}! 👋</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-subtle)', margin: 0 }}>What do you need help with today?</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn--sm btn--ghost" onClick={() => load(true)} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-mid)' }}>
              <Clock size={16} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <NotificationBell />
            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=1A5D3D&color=fff`} className="avatar avatar--sm" alt="" />
          </div>
        </div>

        <div className="portal-content">
          {/* Quick Search */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'linear-gradient(135deg, var(--color-forest) 0%, #27AE60 100%)', borderRadius: 20, padding: 32, marginBottom: 28, color: '#fff' }}>
            <h3 style={{ color: '#fff', marginBottom: 8 }}>Find a Verified Worker</h3>
            <p style={{ opacity: 0.85, marginBottom: 20, fontSize: '0.9rem' }}>Search from 5,000+ Aadhar-verified professionals</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <select value={searchSkill} onChange={e => setSearchSkill(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none', fontFamily: 'inherit', fontSize: '0.95rem', background: 'rgba(255,255,255,.95)' }}>
                <option value="">📋 Select a service...</option>
                {SKILLS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="btn btn--xl" onClick={handleSearch} style={{ background: 'var(--color-rust)', color: '#fff', boxShadow: 'var(--shadow-rust)' }}>
                <Search size={18} /> Search
              </button>
            </div>
          </motion.div>

          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h4>Active Orders ({activeOrders.length})</h4>
                <Link to="/customer/orders" className="btn btn--ghost btn--sm">View All</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeOrders.map(order => {
                  const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={order._id} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid var(--color-border)', display: 'flex', gap: 16, alignItems: 'center' }}>
                      <img src={order.workerId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--md" alt="" />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{order.workerId?.name || 'Unknown Worker'}</span>
                          <span className="badge" style={{ background: s.color, color: '#fff' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-mid)', marginBottom: 8 }}>{order.skillRequired} • {new Date(order.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {order.scheduledTime}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link to={`/customer/messages`} state={{ newChatUserId: order.workerId?._id, newChatUser: order.workerId }} className="btn btn--ghost btn--sm">💬 Chat</Link>
                        <span style={{ fontWeight: 700, color: 'var(--color-rust)', padding: '8px 0' }}>₹{order.totalAmount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Favorite Workers */}
            <div>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h4>❤️ Favorite Workers</h4>
                <Link to="/customer/search" className="btn btn--ghost btn--sm">Browse More</Link>
              </div>
              {customer?.favoriteWorkers?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {customer.favoriteWorkers.slice(0, 4).map(w => (
                    <Link key={w._id} to={`/customer/worker/${w._id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--color-border)', transition: 'box-shadow 0.2s' }}>
                      <img src={w.userId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--sm" alt="" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.userId?.name || 'Unknown Worker'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>{w.primarySkill}</div>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600 }}>⭐ {w.overallRating}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--color-subtle)' }}>
                  <Heart size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No favorites yet.<br />Browse and save workers you like!</p>
                  <Link to="/customer/search" className="btn btn--primary btn--sm" style={{ marginTop: 16 }}>Find Workers</Link>
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h4>📋 Recent Bookings</h4>
              </div>
              {recentOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentOrders.map(order => (
                    <div key={order._id} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{order.skillRequired}</span>
                        <span style={{ fontSize: '0.75rem', color: STATUS_CONFIG[order.status]?.color, fontWeight: 700 }}>{STATUS_CONFIG[order.status]?.label}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>{order.workerId?.name} • {new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-rust)' }}>₹{order.totalAmount}</span>
                        {order.status === 'completed' && !order.customerReviewId && (
                          <Link to={`/customer/orders`} className="btn btn--ghost btn--sm" style={{ padding: '4px 10px' }}>⭐ Rate</Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--color-subtle)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No bookings yet</p>
                  <Link to="/customer/search" className="btn btn--forest btn--sm" style={{ marginTop: 16 }}>Book Your First Service</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
