import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Briefcase, Star, AlertTriangle, ShoppingBag, Wallet } from 'lucide-react';
import api from '../../services/api';
import { AdminSidebar } from './AdminDashboard';

const StatCard = ({ icon, label, value, color = 'var(--color-rust)' }) => (
  <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--color-border)', display: 'flex', gap: 16, alignItems: 'center' }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color, fontSize: '1.4rem' }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontSize: '0.78rem', color: 'var(--color-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-charcoal)', lineHeight: 1.2 }}>{value}</div>
    </div>
  </div>
);

const InfoRow = ({ label, value }) => value ? (
  <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
    <span style={{ width: 140, flexShrink: 0, fontSize: '0.82rem', color: 'var(--color-subtle)', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: '0.9rem', color: 'var(--color-charcoal)' }}>{value}</span>
  </div>
) : null;

const StatusBadge = ({ status }) => {
  const cfg = {
    pending: { bg: '#FEF3E2', c: '#E67E22' },
    accepted: { bg: '#EBF5FB', c: '#3498DB' },
    completed: { bg: '#EAF5EE', c: '#27AE60' },
    cancelled: { bg: '#FEF2F2', c: '#E74C3C' },
    rejected: { bg: '#FEF2F2', c: '#C0392B' },
    in_progress: { bg: '#EAF5EE', c: '#1A5D3D' },
    open: { bg: '#FEF2F2', c: '#E74C3C' },
    resolved: { bg: '#EAF5EE', c: '#27AE60' },
    escalated: { bg: '#F5EEF8', c: '#8E44AD' },
  }[status] || { bg: '#F5F5F5', c: '#888' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, background: cfg.bg, color: cfg.c, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status?.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
};

export default function AdminViewUser() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/users/${userId}`);
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load user detail', err);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner--lg" />
      </div>
    </div>
  );

  if (!data) return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ padding: 40, textAlign: 'center' }}>
        <h3>User not found</h3>
        <Link to="/admin/users" className="btn btn--primary">← Back to Users</Link>
      </div>
    </div>
  );

  const { user, profile, bookings = [], complaints = [], reviews = [], earningsSummary } = data;
  const isWorker = user.userType === 'worker';

  return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ background: '#F8F9FA' }}>
        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/admin/users" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-mid)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
              <ArrowLeft size={16} /> Users
            </Link>
            <span style={{ color: 'var(--color-border)' }}>/</span>
            <h4 style={{ margin: 0 }}>{user.name}'s Portal</h4>
          </div>
          <span style={{ padding: '4px 14px', borderRadius: 20, background: isWorker ? '#EBF5FB' : '#EAF5EE', color: isWorker ? '#3498DB' : '#27AE60', fontSize: '0.78rem', fontWeight: 700 }}>
            {isWorker ? '🔧 Worker' : '👤 Customer'}
          </span>
        </div>

        <div style={{ padding: 32 }}>
          {/* Profile Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'linear-gradient(135deg, var(--color-forest) 0%, #2E86AB 100%)', borderRadius: 20, padding: '32px', marginBottom: 28, color: '#fff', display: 'flex', gap: 24, alignItems: 'center' }}>
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ffffff&color=1A5D3D&size=128`}
              style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', objectFit: 'cover', flexShrink: 0 }}
              alt={user.name}
            />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, color: '#fff' }}>{user.name}</h2>
              <div style={{ opacity: 0.85, fontSize: '0.9rem', marginTop: 4 }}>{user.email} • {user.phone}</div>
              {isWorker && profile && (
                <div style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: 4 }}>
                  {profile.primarySkill} · {profile.cityOfOperation} · {profile.yearsExperience}+ years exp
                </div>
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {user.city || 'City unknown'}
                </span>
                {isWorker && profile && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                    ⭐ {profile.overallRating} ({profile.totalReviews} reviews)
                  </span>
                )}
                <span style={{ background: user.isBanned ? '#E74C3C' : 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {user.isBanned ? '🚫 Banned' : '✅ Active'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard icon="📦" label="Total Bookings" value={bookings.length} />
            {isWorker && earningsSummary && (
              <>
                <StatCard icon="💰" label="Total Earned" value={`₹${(earningsSummary.total || 0).toLocaleString('en-IN')}`} color="#27AE60" />
                <StatCard icon="✅" label="Jobs Done" value={earningsSummary.count || 0} color="#3498DB" />
              </>
            )}
            <StatCard icon="🚨" label="Complaints" value={complaints.length} color="#E74C3C" />
            <StatCard icon="⭐" label="Reviews" value={reviews.length} color="#E67E22" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Personal Info */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
              <h5 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} /> Account Info</h5>
              <InfoRow label="Name" value={user.name} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone} />
              <InfoRow label="City" value={user.city} />
              <InfoRow label="Type" value={user.userType} />
              <InfoRow label="Status" value={user.status} />
              <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
              {isWorker && profile && (
                <>
                  <InfoRow label="Primary Skill" value={profile.primarySkill} />
                  <InfoRow label="City of Work" value={profile.cityOfOperation} />
                  <InfoRow label="Experience" value={`${profile.yearsExperience} years`} />
                  <InfoRow label="Bio" value={profile.bio} />
                  <InfoRow label="Verification" value={profile.verificationStatus} />
                  <InfoRow label="Completion Rate" value={`${profile.completionRate}%`} />
                  <InfoRow label="Wallet Balance" value={`₹${profile.walletBalance || 0}`} />
                </>
              )}
            </div>

            {/* Recent Bookings */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
              <h5 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingBag size={16} /> Recent Bookings</h5>
              {bookings.length === 0 ? (
                <p style={{ color: 'var(--color-subtle)', fontSize: '0.85rem', textAlign: 'center', padding: 24 }}>No bookings yet</p>
              ) : bookings.slice(0, 8).map(b => (
                <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{b.skillRequired}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-subtle)' }}>{new Date(b.scheduledDate).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <StatusBadge status={b.status} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-rust)' }}>₹{b.subtotal}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
                <h5 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><Star size={16} /> Reviews</h5>
                {reviews.slice(0, 6).map(r => (
                  <div key={r._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.reviewerId?.name || r.reviewedId?.name || 'Anonymous'}</span>
                      <span style={{ fontWeight: 700, color: '#F39C12' }}>{'⭐'.repeat(r.rating)}</span>
                    </div>
                    {r.comment && <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-mid)' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Complaints */}
            {complaints.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)' }}>
                <h5 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} color="#E74C3C" /> Complaints</h5>
                {complaints.map(c => (
                  <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.reason?.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-subtle)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}

            {/* Worker Skills */}
            {isWorker && profile?.skills?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
                <h5 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={16} /> Skills & Rates</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {profile.skills.map((s, i) => (
                    <div key={i} style={{ background: 'var(--color-cream)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{s.skillName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>₹{s.ratePerHour}/hr · {s.experience}yr exp</div>
                      <div style={{ fontSize: '0.8rem', color: '#F39C12', marginTop: 2 }}>⭐ {s.rating} ({s.totalReviews} reviews)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
