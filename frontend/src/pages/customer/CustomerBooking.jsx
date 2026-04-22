import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, CreditCard, CheckCircle, ArrowLeft, ArrowRight, IndianRupee } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', icon: '📱', desc: 'Pay via GPay, PhonePe, Paytm' },
  { id: 'card', label: 'Credit/Debit Card', icon: '💳', desc: 'All major cards accepted' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦', desc: 'All major banks' },
  { id: 'wallet', label: 'Wallet', icon: '👛', desc: 'Paytm, Amazon Pay' },
  { id: 'cash', label: 'Cash on Completion', icon: '💵', desc: 'Pay directly to worker after job is done' },
];

export default function CustomerBooking() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [worker, setWorker] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState({
    description: '',
    scheduledDate: '',
    scheduledTime: '10:00',
    selectedSkill: '',
    paymentMethod: 'upi',
    address: user?.primaryAddress?.address || '',
    city: user?.primaryAddress?.city || '',
    pincode: user?.primaryAddress?.pincode || '',
    specialInstructions: '',
  });

  useEffect(() => { api.get(`/customers/workers/${workerId}`).then(r => { setWorker(r.data.data); setBooking(b => ({ ...b, selectedSkill: r.data.data.primarySkill })); }).catch(() => {}); }, [workerId]);

  const rate = worker?.skills?.find(s => s.skillName === booking.selectedSkill)?.ratePerHour || worker?.skills?.[0]?.ratePerHour || 300;
  // Minimum projection base
  const minimumSubtotal = rate;
  const platformFee = Math.round(minimumSubtotal * 0.15);
  const total = minimumSubtotal + platformFee;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        workerId,
        skillRequired: booking.selectedSkill,
        description: booking.description,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        paymentMethod: booking.paymentMethod,
        location: { address: booking.address, city: booking.city, pincode: booking.pincode },
        specialInstructions: booking.specialInstructions,
      });

      if (booking.paymentMethod !== 'cash') {
        toast.success('Booking requested! Final payment will be computed automatically when the worker completes the job.');
        navigate('/customer/orders');
      } else {
        toast.success('Booking created! You will pay cash after the dynamic charges are calculated.');
        navigate('/customer/orders');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Booking failed. Please try again.';
      toast.error(msg);
    }
    setLoading(false);
  };

  const set = (key, val) => setBooking(b => ({ ...b, [key]: val }));

  if (!worker) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner spinner--lg" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '16px 0' }}>
        <div className="container flex-between">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.9rem', color: 'var(--color-mid)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowLeft size={18} /> Back
          </button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Book a Worker</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(s => <div key={s} style={{ width: 10, height: 10, borderRadius: '50%', background: step >= s ? 'var(--color-rust)' : 'var(--color-border)', transition: 'background 0.3s' }} />)}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 920 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
          {/* Form */}
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            {step === 1 && (
              <div className="card" style={{ padding: 32 }}>
                <h3 style={{ marginBottom: 4 }}>Job Details</h3>
                <p style={{ color: 'var(--color-mid)', marginBottom: 28, fontSize: '0.9rem' }}>Tell the worker what you need</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Skill Required</label>
                    <select className="form-select" value={booking.selectedSkill} onChange={e => set('selectedSkill', e.target.value)}>
                      {worker.skills?.map(s => <option key={s.skillName} value={s.skillName}>{s.skillName} — ₹{s.ratePerHour}/hr</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Job Description *</label>
                    <textarea className="form-textarea" rows={4} placeholder="Describe the problem in detail. E.g., 'Kitchen tap is leaking from the base. Need immediate repair.'" value={booking.description} onChange={e => set('description', e.target.value)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Scheduled Date *</label>
                      <input type="date" className="form-input" value={booking.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} min={minDate.toISOString().split('T')[0]} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Preferred Time *</label>
                      <input type="time" className="form-input" value={booking.scheduledTime} onChange={e => set('scheduledTime', e.target.value)} min="08:00" max="20:00" />
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ background: 'var(--color-rust-pale)', border: '1px solid var(--color-rust)', borderRadius: 8, padding: 16, color: 'var(--color-rust)', fontSize: '0.9rem' }}>
                      <strong>Note:</strong> We bill dynamically based on the exact time worked (Minimum 1 hour charge). Our platform only charges the <strong>labour cost</strong>. Any equipment or material charges must be handled separately.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Special Instructions (optional)</label>
                    <textarea className="form-textarea" rows={2} placeholder="Any access instructions, parking details, etc." value={booking.specialInstructions} onChange={e => set('specialInstructions', e.target.value)} />
                  </div>
                </div>

                <button className="btn btn--primary btn--full btn--lg" style={{ marginTop: 28 }} onClick={() => { if (!booking.description || !booking.scheduledDate) { toast.error('Fill in all required fields'); return; } setStep(2); }}>
                  Continue to Address <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="card" style={{ padding: 32 }}>
                <h3 style={{ marginBottom: 4 }}>Service Location</h3>
                <p style={{ color: 'var(--color-mid)', marginBottom: 28, fontSize: '0.9rem' }}>Where should the worker come?</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Address *</label>
                    <textarea className="form-textarea" rows={3} placeholder="House number, street, landmark..." value={booking.address} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">City *</label>
                      <input className="form-input" value={booking.city} onChange={e => set('city', e.target.value)} placeholder="Bangalore" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pincode *</label>
                      <input className="form-input" value={booking.pincode} onChange={e => set('pincode', e.target.value)} placeholder="560034" maxLength={6} />
                    </div>
                  </div>
                </div>

                <button className="btn btn--primary btn--full btn--lg" style={{ marginTop: 28 }} onClick={() => { if (!booking.address || !booking.city) { toast.error('Fill in address details'); return; } setStep(3); }}>
                  Continue to Payment <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="card" style={{ padding: 32 }}>
                <h3 style={{ marginBottom: 4 }}>Payment Method</h3>
                <p style={{ color: 'var(--color-mid)', marginBottom: 28, fontSize: '0.9rem' }}>Secure payment powered by Razorpay</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {PAYMENT_METHODS.map(pm => (
                    <label key={pm.id} style={{ display: 'flex', gap: 16, padding: '16px 20px', border: `2px solid ${booking.paymentMethod === pm.id ? 'var(--color-rust)' : 'var(--color-border)'}`, borderRadius: 12, cursor: 'pointer', background: booking.paymentMethod === pm.id ? 'var(--color-rust-pale)' : '#fff', transition: 'all 0.2s', alignItems: 'center' }}>
                      <input type="radio" name="payment" value={pm.id} checked={booking.paymentMethod === pm.id} onChange={e => set('paymentMethod', e.target.value)} style={{ accentColor: 'var(--color-rust)', flexShrink: 0 }} />
                      <span style={{ fontSize: '1.3rem' }}>{pm.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pm.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>{pm.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ background: 'var(--color-cream)', borderRadius: 12, padding: 20, marginTop: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-mid)' }}>Minimum Labour Fee (1h × ₹{rate})</span>
                    <span>₹{minimumSubtotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-mid)' }}>Platform Fee (15%)</span>
                    <span>₹{platformFee}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    <span>Estimated Minimum</span>
                    <span style={{ color: 'var(--color-rust)' }}>₹{total}</span>
                  </div>
                </div>

                <div style={{ background: 'var(--color-forest-pale)', borderRadius: 10, padding: 12, marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--color-forest)' }}>
                  <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  You will pay nothing right now! The worker will calculate exact hourly billing at the end of the job.
                </div>

                <button className="btn btn--primary btn--full btn--xl" style={{ marginTop: 24 }} onClick={handleSubmit} disabled={loading}>
                  {loading ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Processing...</> : `Request Worker`}
                </button>
              </div>
            )}
          </motion.div>

          {/* Summary Sidebar */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <img src={worker.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.userId?.name || 'W')}&background=D4501D&color=fff`} className="avatar avatar--md" alt="" />
                <div>
                  <div style={{ fontWeight: 700 }}>{worker.userId?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>{booking.selectedSkill}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)' }}>⭐ {worker.overallRating} ({worker.totalReviews})</div>
                </div>
              </div>
              <div className="divider" />
              {booking.scheduledDate && <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>📅 {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>}
              {booking.scheduledTime && <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>⏰ {booking.scheduledTime}</div>}
              <div style={{ fontSize: '0.85rem', marginBottom: 16 }}>⏱ Dynamic Billing (Min 1 Hour)</div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}><span style={{ color: 'var(--color-mid)' }}>Min Subtotal</span><span>₹{minimumSubtotal}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.85rem' }}><span style={{ color: 'var(--color-mid)' }}>Min Platform Fee</span><span>₹{platformFee}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem' }}><span>Min Total</span><span style={{ color: 'var(--color-rust)' }}>₹{total}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
