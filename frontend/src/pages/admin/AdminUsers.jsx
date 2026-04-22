import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserX, UserCheck, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AdminSidebar } from './AdminDashboard';
import toast from 'react-hot-toast';


export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('');
  const [processing, setProcessing] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const load = async () => {
    setLoading(true);
    try {
      const ObjectQ = { page, limit: LIMIT };
      const q = new URLSearchParams(ObjectQ);
      if (search) q.set('search', search);
      if (userType) q.set('userType', userType);
      const res = await api.get(`/admin/users?${q}`);
      setUsers(res.data.data.users || []);
      setTotal(res.data.data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search, userType, page]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, userType]);

  const banUser = async (userId, isBanned) => {
    const reason = isBanned ? null : window.prompt('Ban reason:');
    if (!isBanned && !reason) return;
    setProcessing(userId);
    try {
      if (isBanned) {
        await api.put(`/admin/users/${userId}/unban`);
        toast.success('User unbanned');
      } else {
        await api.put(`/admin/users/${userId}/ban`, { reason });
        toast.success('User banned and notified');
      }
      load();
    } catch {}
    setProcessing(null);
  };

  return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ background: '#F8F9FA' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>User Management</h4>
        </div>
        <div style={{ padding: 32 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--color-border)', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-subtle)' }} />
              <input className="form-input" placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
            </div>
            <select className="form-select" value={userType} onChange={e => setUserType(e.target.value)} style={{ maxWidth: 170 }}>
              <option value="">All Types</option>
              <option value="worker">Workers</option>
              <option value="customer">Customers</option>
            </select>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F9FA', borderBottom: '1px solid var(--color-border)' }}>
                  {['User', 'Type', 'City', 'Contact', 'Status', 'Verified', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-subtle)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--color-subtle)' }}>No users found</td></tr>
                ) : users.map((user, i) => (
                  <motion.tr key={user._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--color-border)', background: user.isBanned ? '#FEF2F2' : '#fff' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=D4501D&color=fff`} className="avatar avatar--sm" alt="" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: user.userType === 'worker' ? 'var(--color-rust-pale)' : 'var(--color-forest-pale)', color: user.userType === 'worker' ? 'var(--color-rust)' : 'var(--color-forest)', fontSize: '0.75rem', fontWeight: 700 }}>
                        {user.userType}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--color-mid)' }}>
                      {user.city || <span style={{ color: 'var(--color-border)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--color-mid)' }}>{user.phone}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {user.isBanned
                        ? <span style={{ padding: '3px 10px', borderRadius: 20, background: '#FEF2F2', color: '#E74C3C', fontSize: '0.7rem', fontWeight: 700 }}>🚫 Banned</span>
                        : <span style={{ padding: '3px 10px', borderRadius: 20, background: '#EAF5EE', color: '#27AE60', fontSize: '0.7rem', fontWeight: 700 }}>✅ Active</span>
                      }
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {user.isVerified
                        ? <span style={{ color: '#27AE60', fontSize: '0.85rem' }}>✅ Yes</span>
                        : <span style={{ color: '#E67E22', fontSize: '0.85rem' }}>⏳ No</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--color-subtle)' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Link to={`/admin/view-user/${user._id}`}
                          style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, background: '#EBF5FB', color: '#3498DB', textDecoration: 'none' }}>
                          <Eye size={13} /> View
                        </Link>
                        <button onClick={() => banUser(user._id, user.isBanned)} disabled={processing === user._id}
                          style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, background: user.isBanned ? '#EAF5EE' : '#FEF2F2', color: user.isBanned ? '#27AE60' : '#E74C3C' }}>
                          {processing === user._id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : user.isBanned ? <><UserCheck size={14} /> Unban</> : <><UserX size={14} /> Ban</>}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {total > LIMIT && (
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-subtle)' }}>
                  Showing {Math.min((page - 1) * LIMIT + 1, total)} to {Math.min(page * LIMIT, total)} of {total} entries
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn--sm btn--outline" style={{ background: '#fff' }}>Previous</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)} className="btn btn--sm btn--outline" style={{ background: '#fff' }}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
