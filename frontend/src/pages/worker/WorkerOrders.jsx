import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Search, Filter, Eye, XCircle, ThumbsDown, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { PortalSidebar } from './WorkerDashboard';
import toast from 'react-hot-toast';

// ── Live elapsed-time tracker ──────────────────────────────
const LiveTimer = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState('00:00:00');
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const ms = Date.now() - start;
      const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
      const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF3E2', border: '1px solid #F39C12', borderRadius: 12, padding: '6px 14px', marginTop: 8, width: 'fit-content' }}>
      <Clock size={14} style={{ color: '#E67E22' }} />
      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#E67E22', letterSpacing: '0.05em' }}>{elapsed}</span>
      <span style={{ fontSize: '0.7rem', color: '#E67E22' }}>elapsed</span>
    </div>
  );
};

// ── Projected bill helper ──────────────────────────────────
const calcProjectedBill = (startedAt, ratePerHour, platformFeePercent = 15) => {
  if (!startedAt || !ratePerHour) return null;
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const elapsedHours = elapsedMs / 3600000;
  const durationHours = Math.max(1, Math.ceil(elapsedHours * 4) / 4); // min 1h, round to 15min
  const subtotal = Math.round(ratePerHour * durationHours);
  const platformFee = Math.round(subtotal * (platformFeePercent / 100));
  const total = subtotal + platformFee;
  return { durationHours, subtotal, platformFee, total };
};


const NAV_ITEMS = [
  { path: '/worker/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/worker/orders', icon: '💼', label: 'My Jobs' },
  { path: '/worker/messages', icon: '💬', label: 'Messages' },
  { path: '/worker/profile', icon: '👤', label: 'Profile' },
];

const STATUS_BADGES = {
  pending:     { bg: '#FEF3E2', color: '#E67E22', label: '⏳ Pending' },
  accepted:        { bg: '#EBF5FB', color: '#3498DB', label: '✓ Accepted' },
  arrived:         { bg: '#FFF5E6', color: '#E67E22', label: '📍 Arrived' },
  in_progress:     { bg: '#EAF5EE', color: '#1A5D3D', label: '🔵 In Progress' },
  payment_pending: { bg: '#EAF5EE', color: '#27ae60', label: '💳 Payment Pending' },
  completed:       { bg: '#EAF5EE', color: '#27AE60', label: '✅ Completed' },
  cancelled:       { bg: '#FEF2F2', color: '#E74C3C', label: '❌ Cancelled' },
};

export default function WorkerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // bookingId being rejected
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [congratsModal, setCongratsModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null); // order object for finish-job preview
  const [receiptDone, setReceiptDone] = useState(null);   // order object for post-payment receipt

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/workers/orders${params}`);
      setOrders(res.data.data.bookings || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleAccept = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/accept`);
      toast.success('Booking accepted successfully');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to accept');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setRejecting(true);
    try {
      const res = await api.put(`/bookings/${rejectModal}/reject`, { rejectionReason: rejectReason || 'Worker is unavailable' });
      const alts = res.data.data?.alternativeWorkers?.length || 0;
      toast.success(`Job declined. Customer notified${alts > 0 ? ` with ${alts} alternative workers` : ''}.`);
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject booking');
    }
    setRejecting(false);
  };

  const handleCompleteDynamic = async (order) => {
    // Show receipt preview first, then confirm
    setReceiptModal(order);
  };

  const confirmFinishJob = async () => {
    if (!receiptModal) return;
    setCompleting(receiptModal._id);
    try {
      const res = await api.put(`/bookings/${receiptModal._id}/complete-dynamic`);
      toast.success('noted');
      setReceiptModal(null);
      setReceiptDone(res.data.data); // store completed booking for receipt
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to complete job');
      setReceiptModal(null);
    }
    setCompleting(null);
  };

  const handleArrive = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/arrive`);
      toast.success('verification request sent to user .. plz wait');
      load();
    } catch(err) { toast.error(err?.response?.data?.message || 'Failed to mark arrival'); }
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const handleUploadPhoto = async (bookingId, file) => {
    setUploadingPhoto(bookingId);
    try {
      const fd = new FormData();
      fd.append('initialConditionPhoto', file);
      await api.post(`/bookings/${bookingId}/upload-photo`, fd);
      toast.success('uploaded successfully');
      load();
    } catch(err) { toast.error(err?.response?.data?.message || 'Failed to upload photo'); }
    setUploadingPhoto(null);
  };

  const handleCloseCongrats = async () => {
    if (congratsModal) {
      try { await api.put(`/bookings/${congratsModal}/acknowledge`); } catch (err) {}
    }
    setCongratsModal(null);
    load();
  };

  const filtered = orders.filter(o =>
    o.skillRequired?.toLowerCase().includes(search.toLowerCase()) ||
    o.description?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerId?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="portal-layout">
      <PortalSidebar navItems={NAV_ITEMS} title="Worker Portal" />
      <div className="portal-main">
        <div className="portal-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4>My Jobs</h4>
          <button className="btn btn--outline btn--sm" onClick={() => load()} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div className="portal-content">
          {/* Filters */}
          <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-subtle)' }} />
                <input className="form-input" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'].map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: filter === s ? 'var(--color-rust)' : 'var(--color-cream)', color: filter === s ? '#fff' : 'var(--color-mid)', transition: 'all 0.2s' }}>
                    {s === 'all' ? 'All' : STATUS_BADGES[s]?.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div className="spinner spinner--lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 64 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
              <p style={{ color: 'var(--color-subtle)' }}>No jobs found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((order, i) => {
                const badge = STATUS_BADGES[order.status] || STATUS_BADGES.pending;
                return (
                  <motion.div key={order._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid var(--color-border)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <img src={order.customerId?.avatar || `https://ui-avatars.com/api/?name=C&background=FAF5F0&color=2C2C2C`} className="avatar avatar--md" alt="" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700 }}>{order.customerId?.name || 'Customer'}</span>
                        <span style={{ padding: '4px 10px', borderRadius: 20, background: badge.bg, color: badge.color, fontSize: '0.75rem', fontWeight: 700 }}>{badge.label}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-subtle)', marginBottom: 6 }}>{order.skillRequired} • {new Date(order.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {order.scheduledTime}</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-mid)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{order.description}</p>
                      {order.status === 'in_progress' && order.startedAt && <LiveTimer startedAt={order.startedAt} />}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-rust)', marginBottom: 8 }}>₹{order.subtotal}</div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Link to="/worker/messages" state={{ newChatUserId: order.customerId?._id, newChatUser: order.customerId }} className="btn btn--ghost btn--sm">💬 Chat</Link>
                        <button className="btn btn--ghost btn--sm" onClick={() => setSelectedOrder(order)}><Eye size={14} /> View</button>
                        {order.status === 'pending' && (
                          <>
                            <button className="btn btn--primary btn--sm" onClick={() => handleAccept(order._id)}>
                              <CheckCircle size={14} /> Accept
                            </button>
                            <button
                              className="btn btn--sm"
                              style={{ background: '#FEF2F2', color: '#E74C3C', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => { setRejectModal(order._id); setRejectReason(''); }}>
                              <ThumbsDown size={14} /> Decline
                            </button>
                          </>
                        )}
                        {order.status === 'accepted' && (
                          <button className="btn btn--primary btn--sm" onClick={() => handleArrive(order._id)}>
                            📍 Mark Arrived
                          </button>
                        )}
                        {order.status === 'arrived' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-rust)', fontWeight: 600 }}>Waiting for Customer App...</span>
                        )}
                        {order.status === 'in_progress' && !order.initialConditionPhoto && (
                          <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
                            {uploadingPhoto === order._id ? 'Uploading...' : '📷 Upload Initial Photo'}
                            <input type="file" style={{ display: 'none' }} onChange={(e) => { if(e.target.files[0]) handleUploadPhoto(order._id, e.target.files[0]) }} />
                          </label>
                        )}
                        {order.status === 'in_progress' && order.initialConditionPhoto && (
                          <button className="btn btn--forest btn--sm" disabled={completing === order._id}
                            onClick={() => handleCompleteDynamic(order)}>
                            {completing === order._id ? <span className="spinner spinner--white" style={{ width: 14, height: 14 }} /> : <CheckCircle size={14} />} Finish Job
                          </button>
                        )}
                        {order.status === 'payment_pending' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-mid)', fontWeight: 600 }}>Waiting for Payment...</span>
                        )}
                        {order.status === 'completed' && !order.workerAcknowledgedPayment && (
                          <button className="btn btn--primary btn--sm" onClick={() => setCongratsModal(order._id)}>
                            💳 Payment Received
                          </button>
                        )}
                        {order.status === 'completed' && order.workerAcknowledgedPayment && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-forest)', fontWeight: 600 }}>✅ Completed</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="flex-between" style={{ marginBottom: 24 }}>
              <h3 style={{ margin: 0 }}>Job Details</h3>
              <button onClick={() => setSelectedOrder(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['Customer', selectedOrder.customerId?.name],
                ['Skill', selectedOrder.skillRequired],
                ['Date', new Date(selectedOrder.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                ['Time', selectedOrder.scheduledTime],
                ['Location', selectedOrder.location?.address],
                ['Payment', `₹${selectedOrder.subtotal} (${selectedOrder.paymentStatus})`],
                ['Status', STATUS_BADGES[selectedOrder.status]?.label],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-subtle)', width: 80, flexShrink: 0, paddingTop: 2, fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-charcoal)' }}>{v}</span>
                </div>
              ))}
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-subtle)', fontWeight: 600 }}>Description</span>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-mid)' }}>{selectedOrder.description}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject / Decline Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Decline This Job?</h3>
              <button onClick={() => setRejectModal(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>
            <p style={{ color: 'var(--color-mid)', fontSize: '0.9rem', marginBottom: 16 }}>
              The customer will be notified and shown other available workers in your area.
            </p>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Reason (optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. I'm fully booked on that date, or out of service area..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--ghost btn--full" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="btn btn--full"
                style={{ background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                onClick={handleReject}
                disabled={rejecting}>
                {rejecting ? <span className="spinner spinner--white" style={{ width: 16, height: 16 }} /> : '❌ Decline Job'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Receipt Preview Modal (before Finish Job) ── */}
      {receiptModal && (() => {
        const proj = calcProjectedBill(receiptModal.startedAt, receiptModal.workerRate, receiptModal.platformFeePercent);
        return (
          <div className="modal-overlay" onClick={() => setReceiptModal(null)}>
            <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="flex-between" style={{ marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>🧾 Job Completion Receipt</h3>
                <button onClick={() => setReceiptModal(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-mid)', marginBottom: 20 }}>Projected bill based on time tracked so far (minimum 1 hour applies):</p>
              <div style={{ background: '#F8F9FA', border: '1px dashed #CCC', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                {[
                  ['Duration Tracked', `${proj?.durationHours} hrs`, false],
                  ['Labor Rate', `₹${receiptModal.workerRate} / hr`, false],
                  ['Net Subtotal', `₹${proj?.subtotal}`, false],
                  ['Platform Fee (15%)', `₹${proj?.platformFee}`, false],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8 }}>
                    <span style={{ color: 'var(--color-mid)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid #E0E0E0', paddingTop: 10, marginTop: 4 }}>
                  <span>Customer Pays</span>
                  <span style={{ color: 'var(--color-rust)' }}>₹{proj?.total}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', marginTop: 10, marginBottom: 0 }}>
                  ✅ Your earnings = ₹{proj?.subtotal} (platform fee deducted from customer's bill)
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn--ghost btn--full" onClick={() => setReceiptModal(null)}>Cancel</button>
                <button className="btn btn--primary btn--full" disabled={completing === receiptModal._id} onClick={confirmFinishJob}>
                  {completing === receiptModal._id ? <span className="spinner spinner--white" style={{ width: 16, height: 16 }} /> : '✅ Confirm & Finish Job'}
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Post-payment receipt (after customer pays) ── */}
      {receiptDone && (
        <div className="modal-overlay" onClick={() => setReceiptDone(null)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>🧾 Final Payment Receipt</h3>
              <button onClick={() => setReceiptDone(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>
            <div style={{ background: '#F8F9FA', border: '1px dashed #CCC', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              {[
                ['Duration Tracked', `${receiptDone.durationHours} hrs`],
                ['Labor Rate', `₹${receiptDone.workerRate} / hr`],
                ['Net Subtotal', `₹${receiptDone.subtotal}`],
                ['Platform Fee', `₹${receiptDone.platformFee}`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8 }}>
                  <span style={{ color: 'var(--color-mid)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid #E0E0E0', paddingTop: 10, marginTop: 4 }}>
                <span>Total Billed</span>
                <span style={{ color: 'var(--color-rust)' }}>₹{receiptDone.totalAmount}</span>
              </div>
            </div>
            <button className="btn btn--primary btn--full" onClick={() => setReceiptDone(null)}>Close</button>
          </motion.div>
        </div>
      )}

      {/* ── Congrats Modal (after payment acknowledged) ── */}
      {congratsModal && (
        <div className="modal-overlay" onClick={handleCloseCongrats}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
            <h3 style={{ marginBottom: 12, color: 'var(--color-charcoal)' }}>Congratulations on your work completion!</h3>
            <p style={{ color: 'var(--color-mid)', fontSize: '1rem', fontStyle: 'italic', marginBottom: 32 }}>
              "Hard work beats talent when talent doesn't work hard. Keep up the great job!"
            </p>
            <button className="btn btn--primary btn--full btn--lg" onClick={handleCloseCongrats}>
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
