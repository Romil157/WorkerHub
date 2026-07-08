import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, XCircle, AlertTriangle, Flag, ChevronDown, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { CustomerSidebar } from './CustomerDashboard';
import toast from 'react-hot-toast';

const STATUS = {
  pending:         { bg: '#FEF3E2', color: '#E67E22', label: '⏳ Pending' },
  accepted:        { bg: '#EBF5FB', color: '#3498DB', label: '✓ Accepted' },
  arrived:         { bg: '#FFF5E6', color: '#E67E22', label: '📍 Worker Arrived' },
  in_progress:     { bg: '#EAF5EE', color: '#1A5D3D', label: '🔵 Tracking Live' },
  payment_pending: { bg: '#EAF5EE', color: '#27ae60', label: '💳 Payment Required' },
  completed:       { bg: '#EAF5EE', color: '#27AE60', label: '✅ Completed' },
  cancelled:       { bg: '#FEF2F2', color: '#E74C3C', label: '❌ Cancelled' },
  rejected:        { bg: '#FEF2F2', color: '#C0392B', label: '🚫 Declined by Worker' },
};

const CANCEL_REASONS = [
  'Found another worker',
  'No longer needed',
  'Worker taking too long to accept',
  'Scheduled at wrong time',
  'Price is too high',
  'Personal emergency',
  'Other',
];

const COMPLAINT_REASONS = [
  'Worker was unprofessional',
  'Poor quality of work',
  'Worker was late / no show',
  'Overcharged for service',
  'Rude / inappropriate behavior',
  'Worker uncooperative/unprofessional',
  'Cost too high',
  'Other'
];

const LiveTimer = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState('00:00:00');
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => {
      const ms = Date.now() - start;
      const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
      const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    update();
    const intv = setInterval(update, 1000);
    return () => clearInterval(intv);
  }, [startedAt]);
  return <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-rust)', background: '#FEF3E2', padding: '6px 16px', borderRadius: 20, display: 'inline-block', marginBottom: 16 }}>⏱️ Live Tracker: {elapsed}</div>;
};

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Review modal
  const [reviewModal, setReviewModal] = useState(null);
  const [review, setReview] = useState({ rating: 5, text: '' });
  const [submitting, setSubmitting] = useState(false);

  // Cancel modal
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Complaint modal
  const [complaintModal, setComplaintModal] = useState(null);
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintCustomReason, setComplaintCustomReason] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [filing, setFiling] = useState(false);

  // Re-service state (Phase 4)
  const [reserviceModal, setReserviceModal] = useState(null);
  const [reserviceReason, setReserviceReason] = useState('');
  const [submittingReservice, setSubmittingReservice] = useState(false);

  // Detail expand
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      const q = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/customers/orders${q}`);
      setOrders(res.data.data.bookings || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);

  // Submit Review
  const submitReview = async () => {
    setSubmitting(true);
    try {
      await api.post('/reviews', { bookingId: reviewModal._id, rating: review.rating, text: review.text });
      toast.success('Review submitted! Thank you ⭐');
      const bId = reviewModal._id;
      setReviewModal(null);
      setReview({ rating: 5, text: '' });
      load();

      // Auto-trigger re-service prompt on low rating (<= 2 stars)
      if (review.rating <= 2) {
        const originalOrder = orders.find(o => o._id === bId);
        if (originalOrder && !originalOrder.reserviceRequestId) {
          setTimeout(() => {
            setReserviceModal(originalOrder);
          }, 600);
        }
      }
    } catch {}
    setSubmitting(false);
  };

  const handleRequestReservice = async () => {
    if (!reserviceReason.trim()) {
      toast.error('Please enter a reason for the re-service request');
      return;
    }
    setSubmittingReservice(true);
    try {
      await api.post('/reservice', {
        bookingId: reserviceModal._id,
        reason: reserviceReason.trim(),
      });
      toast.success('Re-service requested successfully! The worker has been notified.');
      setReserviceModal(null);
      setReserviceReason('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to request re-service');
    }
    setSubmittingReservice(false);
  };

  const handleStartTimer = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/start-timer`);
      toast.success('Authorization granted! Timer started ⏱️');
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to start timer'); }
  };

  const handlePayCheckout = async (order) => {
    if (order.paymentMethod === 'cash') {
       try {
         await api.post('/bookings/verify-payment', { bookingId: order._id, method: 'cash' });
         toast.success('Cash payment confirmed! Job completed 🎉');
         load();
       } catch (err) { toast.error(err?.response?.data?.message || 'Failed to verify cash payment'); }
       return;
    }
    
    try {
      const orderRes = await api.post('/bookings/create-payment-order', { bookingId: order._id });
      const { orderId, key } = orderRes.data.data;
      if (window.Razorpay && orderId) {
          const rzp = new window.Razorpay({
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || key,
            amount: order.totalAmount * 100,
            currency: 'INR',
            name: 'WorkerHub',
            description: `Dynamic Bill - ${order.skillRequired}`,
            order_id: orderId,
            handler: async (response) => {
              try {
                await api.post('/bookings/verify-payment', { 
                  bookingId: order._id, 
                  razorpayOrderId: response.razorpay_order_id, 
                  razorpayPaymentId: response.razorpay_payment_id, 
                  razorpaySignature: response.razorpay_signature 
                });
                toast.success('Payment successful! Job fully funded 🎉');
                load();
              } catch (verifyErr) { toast.error('Verification failed.'); }
            },
            theme: { color: '#1A5D3D' },
          });
          rzp.open();
      } else {
        toast.error('Payment gateway unavailable');
      }
    } catch (err) { toast.error('Failed to init payment gateway'); }
  };

  // Cancel Booking
  const submitCancel = async () => {
    const reason = cancelReason === 'Other' ? cancelCustomReason : cancelReason;
    if (!reason.trim()) { toast.error('Please select or enter a reason'); return; }
    setCancelling(true);
    try {
      const res = await api.put(`/bookings/${cancelModal._id}/cancel`, { cancellationReason: reason });
      const fee = res.data.data?.cancellationFee || 0;
      if (fee > 0) {
        toast.success(`Booking cancelled. Cancellation fee: ₹${fee}`);
      } else {
        toast.success('Booking cancelled successfully (no fee charged) 👍');
      }
      setCancelModal(null);
      setCancelReason('');
      setCancelCustomReason('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel');
    }
    setCancelling(false);
  };

  // File Complaint
  const submitComplaint = async () => {
    const reason = complaintReason === 'Other' ? complaintCustomReason : complaintReason;
    if (!reason.trim()) { toast.error('Please select a reason'); return; }
    if (!complaintDesc.trim()) { toast.error('Please describe the issue'); return; }
    setFiling(true);
    try {
      await api.post('/customers/complaints', {
        bookingId: complaintModal._id,
        reason,
        description: complaintDesc,
      });
      toast.success('Complaint filed! Our team will review it within 24 hours. 📋');
      setComplaintModal(null);
      setComplaintReason('');
      setComplaintCustomReason('');
      setComplaintDesc('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to file complaint');
    }
    setFiling(false);
  };

  const canCancel = (order) => ['pending', 'accepted'].includes(order.status);
  const canComplain = (order) => ['completed', 'in_progress', 'cancelled'].includes(order.status) && !order.hasComplaint;

  return (
    <div className="portal-layout">
      <CustomerSidebar />
      <div className="portal-main">
        <div className="portal-topbar flex-between" style={{ alignItems: 'center' }}>
          <h4>My Orders</h4>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn--outline btn--sm" onClick={() => load()} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/customer/search" className="btn btn--primary btn--sm">+ New Booking</Link>
          </div>
        </div>
        <div className="portal-content">
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ padding: '8px 16px', borderRadius: 20, border: '2px solid', borderColor: filter === s ? 'var(--color-forest)' : 'var(--color-border)', background: filter === s ? 'var(--color-forest)' : '#fff', color: filter === s ? '#fff' : 'var(--color-mid)', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                {s === 'all' ? 'All Orders' : STATUS[s]?.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div className="spinner spinner--lg" /></div>
          ) : orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 64 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
              <h4>No orders found</h4>
              <p style={{ color: 'var(--color-subtle)', marginBottom: 24 }}>Book your first service to see orders here</p>
              <Link to="/customer/search" className="btn btn--forest">Find Workers</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {orders.map((order, i) => {
                const s = STATUS[order.status] || STATUS.pending;
                const isExpanded = expandedId === order._id;
                return (
                  <motion.div key={order._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--color-border)', borderLeft: `4px solid ${s.color}`, overflow: 'hidden' }}>

                    {/* Main Row */}
                    <div style={{ padding: 24, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <img src={order.workerId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--md" alt="" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{order.skillRequired}</span>
                            <span style={{ padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 700 }}>{s.label}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-mid)', marginBottom: 8 }}>
                            Worker: <strong style={{ color: 'var(--color-charcoal)' }}>{order.workerId?.name}</strong> • {new Date(order.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {order.scheduledTime}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-mid)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{order.description}</p>
                          <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-rust)' }}>₹{order.totalAmount}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>Payment: {order.paymentStatus}</span>
                            {order.location?.city && <span style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>📍 {order.location.city}</span>}
                            <ChevronDown size={16} style={{ marginLeft: 'auto', color: 'var(--color-subtle)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}>
                          <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                            
                            {/* Live Timer for In-Progress Jobs */}
                            {order.status === 'in_progress' && order.startedAt && (
                              <div style={{ textAlign: 'center' }}><LiveTimer startedAt={order.startedAt} /></div>
                            )}

                            {/* Detailed Receipt for Finished Jobs */}
                            {['payment_pending', 'completed'].includes(order.status) && (
                              <div style={{ background: '#F8F9FA', border: '1px dashed #CCC', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
                                <h5 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #E0E0E0', paddingBottom: 8, color: 'var(--color-charcoal)' }}>🧾 Payment Calculation Receipt</h5>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                  <span style={{ color: 'var(--color-mid)' }}>Duration Tracked (Min 1hr rule)</span>
                                  <span style={{ fontWeight: 600 }}>{order.durationHours} hrs</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                  <span style={{ color: 'var(--color-mid)' }}>Labor Rate</span>
                                  <span style={{ fontWeight: 600 }}>₹{order.workerRate} / hr</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                  <span style={{ color: 'var(--color-mid)' }}>Net Subtotal</span>
                                  <span style={{ fontWeight: 600 }}>₹{order.subtotal}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 12 }}>
                                  <span style={{ color: 'var(--color-mid)' }}>Platform Fee (15%)</span>
                                  <span style={{ fontWeight: 600 }}>₹{order.platformFee}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px solid #E0E0E0', paddingTop: 8 }}>
                                  <span>Final Total</span>
                                  <span style={{ color: 'var(--color-rust)' }}>₹{order.totalAmount}</span>
                                </div>
                              </div>
                            )}

                            {/* Info row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                              <div style={{ background: 'var(--color-cream)', padding: '10px 14px', borderRadius: 10 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)', marginBottom: 2 }}>Duration</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{order.durationHours || order.estimatedDuration || 1}h</div>
                              </div>
                              <div style={{ background: 'var(--color-cream)', padding: '10px 14px', borderRadius: 10 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)', marginBottom: 2 }}>Rate</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{order.workerRate}/hr</div>
                              </div>
                              <div style={{ background: 'var(--color-cream)', padding: '10px 14px', borderRadius: 10 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)', marginBottom: 2 }}>Platform Fee</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{order.platformFee}</div>
                              </div>
                              {order.location?.address && (
                                <div style={{ background: 'var(--color-cream)', padding: '10px 14px', borderRadius: 10, gridColumn: 'span 2' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)', marginBottom: 2 }}>Address</div>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.location.address}, {order.location.city} - {order.location.pincode}</div>
                                </div>
                              )}
                            </div>

                            {/* Cancellation info */}
                            {order.status === 'cancelled' && (
                              <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem' }}>
                                <strong style={{ color: '#E74C3C' }}>Cancelled by {order.cancelledBy}</strong>
                                {order.cancellationReason && <p style={{ margin: '4px 0 0', color: 'var(--color-mid)' }}>Reason: {order.cancellationReason}</p>}
                                {order.cancellationFee > 0 && <p style={{ margin: '4px 0 0', color: '#E67E22', fontWeight: 600 }}>Cancellation fee: ₹{order.cancellationFee}</p>}
                              </div>
                            )}

                            {/* Complaint info */}
                            {order.hasComplaint && (
                              <div style={{ background: '#FFF3CD', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                                <Flag size={16} color="#856404" />
                                <span style={{ color: '#856404', fontWeight: 600 }}>Complaint filed — under review by our team</span>
                              </div>
                            )}

                            {/* Re-service Request Info */}
                            {order.reserviceRequestId && (
                              <div style={{ background: 'var(--color-rust-pale)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem' }}>
                                <strong style={{ color: 'var(--color-rust-dark)' }}>🛠️ Re-service: {order.reserviceRequestId.status === 'requested' ? 'Requested' : order.reserviceRequestId.status === 'scheduled' ? 'Scheduled' : 'Completed'}</strong>
                                {order.reserviceRequestId.reason && <p style={{ margin: '4px 0 0', color: 'var(--color-charcoal)' }}><strong>Reason:</strong> {order.reserviceRequestId.reason}</p>}
                                {order.reserviceRequestId.scheduledFor && <p style={{ margin: '4px 0 0', color: 'var(--color-forest)', fontWeight: 600 }}>📅 Scheduled Date: {new Date(order.reserviceRequestId.scheduledFor).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                                {order.reserviceRequestId.completedAt && <p style={{ margin: '4px 0 0', color: 'var(--color-verified)', fontWeight: 600 }}>✓ Completed on: {new Date(order.reserviceRequestId.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              {order.status === 'arrived' && (
                                <button className="btn btn--primary btn--sm" onClick={() => handleStartTimer(order._id)}>
                                  ⏱️ Authorize Entry & Start Timer
                                </button>
                              )}
                              
                              {order.status === 'payment_pending' && (
                                <button className="btn btn--forest btn--sm" onClick={() => handlePayCheckout(order)}>
                                  💳 Pay Final Bill (₹{order.totalAmount})
                                </button>
                              )}

                              {order.status === 'completed' && !order.customerReviewId && (
                                <button className="btn btn--primary btn--sm" onClick={() => setReviewModal(order)}>
                                  ⭐ Rate & Review
                                </button>
                              )}
                              {order.status === 'completed' && order.customerReviewId && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-forest)', fontWeight: 600, padding: '8px 12px', background: 'var(--color-forest-pale)', borderRadius: 8 }}>✓ Reviewed</span>
                              )}

                              {/* Request Re-service Button */}
                              {order.status === 'completed' && !order.reserviceRequestId && (
                                (() => {
                                  const compAt = order.completedAt || order.paidAt || order.updatedAt;
                                  const elapsed = Date.now() - new Date(compAt).getTime();
                                  const within48h = elapsed < 48 * 60 * 60 * 1000;
                                  return within48h ? (
                                    <button className="btn btn--sm" onClick={() => { setReserviceModal(order); setReserviceReason(''); }}
                                      style={{ background: 'var(--color-rust-pale)', color: 'var(--color-rust-dark)', border: '1px solid var(--color-rust-light)', fontWeight: 600 }}>
                                      🛠️ Request Re-service
                                    </button>
                                  ) : null;
                                })()
                              )}

                              {canCancel(order) && (
                                <button className="btn btn--sm" onClick={() => setCancelModal(order)}
                                  style={{ background: '#FEF2F2', color: '#E74C3C', border: '1px solid #E74C3C', fontWeight: 600 }}>
                                  <XCircle size={14} /> Cancel Booking
                                </button>
                              )}
                              {canComplain(order) && (
                                <button className="btn btn--sm" onClick={() => setComplaintModal(order)}
                                  style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #F0C36D', fontWeight: 600 }}>
                                  <Flag size={14} /> Report Issue
                                </button>
                              )}
                              <Link to="/customer/messages" state={{ newChatUserId: order.workerId?._id, newChatUser: order.workerId }} className="btn btn--ghost btn--sm">
                                💬 Chat with Worker
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===================== REVIEW MODAL ===================== */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: 24 }}>
              <h3 style={{ margin: 0 }}>Rate Your Experience</h3>
              <button onClick={() => setReviewModal(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, padding: '12px 16px', background: 'var(--color-cream)', borderRadius: 12 }}>
              <img src={reviewModal.workerId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--sm" alt="" />
              <div>
                <div style={{ fontWeight: 600 }}>{reviewModal.workerId?.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>{reviewModal.skillRequired}</div>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Your Rating</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1,2,3,4,5].map(r => (
                  <button key={r} onClick={() => setReview(rv => ({ ...rv, rating: r }))}
                    style={{ fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s', transform: r <= review.rating ? 'scale(1.2)' : 'scale(1)', color: r <= review.rating ? 'var(--color-gold)' : '#ddd' }}>★</button>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.85rem', color: 'var(--color-mid)' }}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][review.rating]}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Your Review (optional)</label>
              <textarea className="form-textarea" rows={4} placeholder="How was the experience?" value={review.text} onChange={e => setReview(rv => ({ ...rv, text: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--ghost btn--full" onClick={() => setReviewModal(null)}>Cancel</button>
              <button className="btn btn--primary btn--full" onClick={submitReview} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Review ⭐'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===================== CANCEL MODAL ===================== */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => setCancelModal(null)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            style={{ maxWidth: 480 }}>
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#E74C3C" /> Cancel Booking
              </h3>
              <button onClick={() => setCancelModal(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>

            {/* Booking summary */}
            <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={cancelModal.workerId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--sm" alt="" />
                <div>
                  <div style={{ fontWeight: 600 }}>{cancelModal.workerId?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>{cancelModal.skillRequired} • ₹{cancelModal.totalAmount}</div>
                </div>
              </div>
            </div>

            {/* Cancellation policy notice */}
            <div style={{ background: '#FFFBEB', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', border: '1px solid #F0C36D' }}>
              <strong style={{ color: '#92400E' }}>📋 Cancellation Policy</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: '#92400E', lineHeight: 1.8 }}>
                <li>1st cancellation: <strong style={{ color: '#16A34A' }}>FREE</strong></li>
                <li>2nd cancellation onwards: <strong>₹50 fee</strong></li>
              </ul>
            </div>

            {/* Reason selection */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Why are you cancelling? *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CANCEL_REASONS.map(r => (
                  <label key={r} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 10, border: `2px solid ${cancelReason === r ? '#E74C3C' : 'var(--color-border)'}`, background: cancelReason === r ? '#FEF2F2' : '#fff', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.9rem' }}>
                    <input type="radio" name="cancelReason" value={r} checked={cancelReason === r} onChange={() => setCancelReason(r)}
                      style={{ accentColor: '#E74C3C' }} />
                    {r}
                  </label>
                ))}
              </div>
            </div>

            {/* Custom reason text */}
            {cancelReason === 'Other' && (
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Please specify *</label>
                <textarea className="form-textarea" rows={3} placeholder="Tell us why you're cancelling..." value={cancelCustomReason} onChange={e => setCancelCustomReason(e.target.value)} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--ghost btn--full" onClick={() => setCancelModal(null)}>Keep Booking</button>
              <button className="btn btn--full" onClick={submitCancel} disabled={cancelling || !cancelReason}
                style={{ background: '#E74C3C', color: '#fff', fontWeight: 700 }}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===================== COMPLAINT MODAL ===================== */}
      {complaintModal && (
        <div className="modal-overlay" onClick={() => setComplaintModal(null)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            style={{ maxWidth: 500 }}>
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flag size={20} color="#856404" /> Report an Issue
              </h3>
              <button onClick={() => setComplaintModal(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>

            {/* Booking summary */}
            <div style={{ background: '#FFF3CD', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={complaintModal.workerId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--sm" alt="" />
                <div>
                  <div style={{ fontWeight: 600 }}>{complaintModal.workerId?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>{complaintModal.skillRequired} • {new Date(complaintModal.scheduledDate).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* Reason selection */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">What went wrong? *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {COMPLAINT_REASONS.map(r => (
                  <label key={r} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 10, border: `2px solid ${complaintReason === r ? '#856404' : 'var(--color-border)'}`, background: complaintReason === r ? '#FFF3CD' : '#fff', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.9rem' }}>
                    <input type="radio" name="complaintReason" value={r} checked={complaintReason === r} onChange={() => setComplaintReason(r)}
                      style={{ accentColor: '#856404' }} />
                    {r}
                  </label>
                ))}
              </div>
            </div>

            {/* Custom reason text for Other */}
            {complaintReason === 'Other' && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Please specify the issue *</label>
                <input className="form-input" placeholder="Brief summary..." value={complaintCustomReason} onChange={e => setComplaintCustomReason(e.target.value)} />
              </div>
            )}

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Describe the issue in detail *</label>
              <textarea className="form-textarea" rows={4} placeholder="Please provide as much detail as possible. Include dates, times, and what happened..." value={complaintDesc} onChange={e => setComplaintDesc(e.target.value)} />
            </div>

            <div style={{ background: 'var(--color-cream)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '0.8rem', color: 'var(--color-mid)' }}>
              🔒 Your complaint is confidential. Our team will review it within 24 hours and take appropriate action.
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--ghost btn--full" onClick={() => setComplaintModal(null)}>Cancel</button>
              <button className="btn btn--full" onClick={submitComplaint} disabled={filing || !complaintReason}
                style={{ background: '#856404', color: '#fff', fontWeight: 700 }}>
                {filing ? 'Filing...' : 'Submit Complaint'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===================== RESERVICE MODAL (Phase 4) ===================== */}
      {reserviceModal && (
        <div className="modal-overlay" onClick={() => setReserviceModal(null)}>
          <motion.div className="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            style={{ maxWidth: 480 }}>
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                🛠️ Request Re-service
              </h3>
              <button onClick={() => setReserviceModal(null)} className="btn btn--ghost btn--icon"><XCircle size={20} /></button>
            </div>

            {/* Booking summary */}
            <div style={{ background: 'var(--color-rust-pale)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={reserviceModal.workerId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--sm" alt="" />
                <div>
                  <div style={{ fontWeight: 600 }}>{reserviceModal.workerId?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>{reserviceModal.skillRequired} • completed ₹{reserviceModal.totalAmount}</div>
                </div>
              </div>
            </div>

            {/* Business rules callout */}
            <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
              <strong>📋 Re-service Agreement:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 16, lineHeight: 1.6 }}>
                <li>No extra charge -- completely covered.</li>
                <li>Goes to the same worker who did the original job.</li>
                <li>Limited to exactly one re-service per booking.</li>
              </ul>
            </div>

            {/* Reason input */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">What wasn't done right? *</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Explain what specific issues need fixing. E.g., 'The kitchen sink pipe is still dripping slightly when the water is turned on...'"
                value={reserviceReason}
                onChange={e => setReserviceReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--ghost btn--full" onClick={() => setReserviceModal(null)}>Cancel</button>
              <button className="btn btn--full" onClick={handleRequestReservice} disabled={submittingReservice}
                style={{ background: 'var(--color-rust)', color: '#fff', fontWeight: 700 }}>
                {submittingReservice ? 'Requesting...' : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
