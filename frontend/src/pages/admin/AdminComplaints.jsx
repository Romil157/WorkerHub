import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, XCircle } from 'lucide-react';
import api from '../../services/api';
import { AdminSidebar } from './AdminDashboard';
import toast from 'react-hot-toast';

const PRIORITY_CONFIG = {
  low:      { color: '#3498DB', label: '🔵 Low' },
  medium:   { color: '#E67E22', label: '🟡 Medium' },
  high:     { color: '#E74C3C', label: '🔴 High' },
  critical: { color: '#8E44AD', label: '🟣 Critical' },
};

const STATUS_CONFIG = {
  open:           { color: '#E74C3C', label: 'Open' },
  under_review:   { color: '#E67E22', label: 'Under Review' },
  resolved:       { color: '#27AE60', label: 'Resolved' },
  escalated:      { color: '#8E44AD', label: 'Escalated' },
};

const RESOLUTIONS = [
  { v: 'full_refund', l: 'Full Refund to Customer' },
  { v: 'partial_refund', l: 'Partial Refund to Customer' },
  { v: 'worker_warning', l: 'Issue Warning to Worker' },
  { v: 'worker_ban', l: 'Ban Worker from Platform' },
  { v: 'dismissed', l: 'Dismiss Complaint' },
];

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [resolveForm, setResolveForm] = useState({ resolution: '', resolutionAmount: '', resolutionNotes: '' });
  const [resolving, setResolving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ status: filter });
      if (priorityFilter) q.set('priority', priorityFilter);
      const res = await api.get(`/admin/complaints?${q}`);
      setComplaints(res.data.data.complaints || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, priorityFilter]);

  const resolve = async (complaintId) => {
    if (!resolveForm.resolution) { toast.error('Please select a resolution type'); return; }
    setResolving(true);
    try {
      await api.put(`/admin/complaints/${complaintId}/resolve`, resolveForm);
      toast.success('Complaint resolved and customer notified!');
      setSelected(null);
      setResolveForm({ resolution: '', resolutionAmount: '', resolutionNotes: '' });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resolve complaint');
    }
    setResolving(false);
  };

  const updateStatus = async (complaintId, status) => {
    try {
      await api.put(`/admin/complaints/${complaintId}/status`, { status });
      toast.success(`Complaint marked as ${status.replace('_', ' ')}`);
      setSelected(s => s ? { ...s, status } : s);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const updatePriority = async (complaintId, priority) => {
    try {
      await api.put(`/admin/complaints/${complaintId}/priority`, { priority });
      toast.success(`Priority updated to ${priority}`);
      setSelected(s => s ? { ...s, priority } : s);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update priority');
    }
  };

  return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ background: '#F8F9FA' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
          <h4 style={{ margin: 0, flex: 1 }}>Complaints Management</h4>
        </div>
        <div style={{ padding: 32 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, background: '#fff', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.keys(STATUS_CONFIG).map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: filter === s ? STATUS_CONFIG[s].color : 'var(--color-cream)', color: filter === s ? '#fff' : 'var(--color-mid)', transition: 'all 0.2s' }}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="form-select" style={{ maxWidth: 160 }}>
              <option value="">All Priorities</option>
              {Object.keys(PRIORITY_CONFIG).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div className="spinner spinner--lg" /></div>
                : complaints.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 16, padding: 64, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                    <AlertTriangle size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                    <p style={{ color: 'var(--color-subtle)' }}>No {filter} complaints</p>
                  </div>
                ) : complaints.map((c, i) => {
                  const priority = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <motion.div key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => setSelected(selected?._id === c._id ? null : c)}
                      style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: `2px solid ${selected?._id === c._id ? priority.color : 'var(--color-border)'}`, cursor: 'pointer', transition: 'border-color 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{c.reason}</div>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: `${priority.color}20`, color: priority.color, fontSize: '0.75rem', fontWeight: 700 }}>{priority.label}</span>
                      </div>
                      <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--color-mid)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.description}</p>
                      <div style={{ display: 'flex', gap: 20, fontSize: '0.8rem', color: 'var(--color-subtle)', flexWrap: 'wrap' }}>
                        <span>👤 By: {c.complainantId?.name} ({c.complainantType})</span>
                        <span>👷 Against: {c.respondentId?.name}</span>
                        <span>📅 {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            {/* Detail + Resolution */}
            {selected && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)', height: 'fit-content', position: 'sticky', top: 80 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h5 style={{ margin: 0 }}>Complaint Details</h5>
                  <button onClick={() => setSelected(null)} className="btn btn--ghost btn--icon" style={{ padding: 6 }}><XCircle size={18} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, padding: '16px', background: 'var(--color-cream)', borderRadius: 12 }}>
                  {[
                    ['Type', selected.reason],
                    ['Priority', PRIORITY_CONFIG[selected.priority]?.label],
                    ['Status', STATUS_CONFIG[selected.status]?.label],
                    ['Complainant', `${selected.complainantId?.name} (${selected.complainantType})`],
                    ['Respondent', `${selected.respondentId?.name}`],
                    ['Filed on', new Date(selected.createdAt).toLocaleDateString('en-IN')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 12, fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--color-subtle)', width: 80, flexShrink: 0 }}>{k}</span>
                      <span style={{ fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-subtle)', marginBottom: 4 }}>Description</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>{selected.description}</p>
                  </div>
                </div>

                {selected.status !== 'resolved' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {selected.status === 'open' && (
                      <button className="btn btn--ghost btn--sm" style={{ flex: 1 }} onClick={() => updateStatus(selected._id, 'under_review')}>
                        🔍 Mark Under Review
                      </button>
                    )}
                    {selected.status !== 'escalated' && (
                      <button className="btn btn--sm" style={{ flex: 1, background: '#8E44AD', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                        onClick={() => updateStatus(selected._id, 'escalated')}>
                        ⚠️ Escalate
                      </button>
                    )}
                  </div>
                )}

                {/* Priority change */}
                {selected.status !== 'resolved' && (
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Change Priority</label>
                    <select className="form-select" value={selected.priority || 'medium'} onChange={e => updatePriority(selected._id, e.target.value)}>
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                )}

                {selected.status === 'open' || selected.status === 'under_review' ? (
                  <div>
                    <h6 style={{ marginBottom: 12 }}>Resolve Complaint</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Resolution *</label>
                        <select className="form-select" value={resolveForm.resolution} onChange={e => setResolveForm(f => ({ ...f, resolution: e.target.value }))}>
                          <option value="">Select Resolution</option>
                          {RESOLUTIONS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                        </select>
                      </div>
                      {['full_refund', 'partial_refund'].includes(resolveForm.resolution) && (
                        <div className="form-group">
                          <label className="form-label">Refund Amount (₹)</label>
                          <input type="number" className="form-input" placeholder="Enter amount" value={resolveForm.resolutionAmount} onChange={e => setResolveForm(f => ({ ...f, resolutionAmount: e.target.value }))} />
                        </div>
                      )}
                      <div className="form-group">
                        <label className="form-label">Admin Notes</label>
                        <textarea className="form-textarea" rows={3} placeholder="Additional notes about this resolution..." value={resolveForm.resolutionNotes} onChange={e => setResolveForm(f => ({ ...f, resolutionNotes: e.target.value }))} />
                      </div>
                      <button className="btn btn--primary btn--full" onClick={() => resolve(selected._id)} disabled={resolving}>
                        {resolving ? 'Resolving...' : '✅ Resolve Complaint'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--color-forest-pale)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-forest)' }}>
                    ✅ Resolved: {selected.resolution?.replace('_', ' ')} {selected.resolutionAmount ? `(₹${selected.resolutionAmount})` : ''}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
