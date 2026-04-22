import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Shield, Clock, Briefcase, Heart, CheckCircle, ArrowRight, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function CustomerWorkerProfile() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/customers/workers/${workerId}`),
      api.get(`/reviews/worker/${workerId}`),
    ]).then(([w, r]) => {
      setWorker(w.data.data);
      setReviews(r.data.data.reviews || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [workerId]);

  const toggleFav = async () => {
    if (!user) { navigate('/customer/login'); return; }
    try {
      const res = await api.post(`/customers/favorites/${workerId}`);
      setIsFav(res.data.isFavorite);
      toast.success(res.data.isFavorite ? '❤️ Added to favorites' : 'Removed from favorites');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: 'var(--color-subtle)' }}>
        <div className="spinner spinner--lg" />
        <span style={{ fontSize: '0.9rem' }}>Loading worker profile...</span>
      </div>
    </div>
  );

  if (!worker) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream)', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: '3rem' }}>😕</div>
      <h3>Worker not found</h3>
      <Link to="/customer/search" className="btn btn--primary">Browse Workers</Link>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      {/* Navbar */}
      <nav style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Back button TOP LEFT */}
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-cream)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--color-mid)', fontWeight: 600, flexShrink: 0 }}>
            ← Back
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={toggleFav} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'inherit', fontSize: '0.85rem', color: isFav ? '#E74C3C' : 'var(--color-mid)' }}>
              <Heart size={16} fill={isFav ? '#E74C3C' : 'none'} /> {isFav ? 'Saved' : 'Save'}
            </button>
            {user && <Link to={`/customer/messages`} className="btn btn--ghost btn--sm"><MessageSquare size={16} /> Message</Link>}
            <button onClick={() => navigate(`/customer/booking/${workerId}`)} className="btn btn--primary btn--sm">
              Book Now <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* Left: Profile Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: '#fff', borderRadius: 20, padding: 32, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24 }}>
                <img src={worker.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.userId?.name || 'W')}&background=D4501D&color=fff&size=200`}
                  alt={worker.userId?.name} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--color-rust)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <h2 style={{ margin: 0 }}>{worker.userId?.name}</h2>
                    <span style={{ background: '#FEF9E7', color: '#7D6608', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, alignSelf: 'center' }}>⭐ Verified Worker</span>
                  </div>
                  <p style={{ color: 'var(--color-mid)', marginBottom: 12, fontSize: '1rem', fontWeight: 500 }}>{worker.primarySkill} Specialist</p>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.9rem' }}>
                      <Star size={16} fill="var(--color-gold)" color="var(--color-gold)" />
                      <strong>{worker.overallRating}</strong>
                      <span style={{ color: 'var(--color-subtle)' }}>({worker.totalReviews} reviews)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.85rem', color: 'var(--color-mid)' }}>
                      <MapPin size={14} /> {worker.cityOfOperation}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.85rem', color: 'var(--color-mid)' }}>
                      <Clock size={14} /> Responds in {worker.responseTime || 5} mins
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.85rem', color: 'var(--color-mid)' }}>
                      <Briefcase size={14} /> {worker.totalJobsCompleted} jobs done
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '16px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
                {worker.verificationDocuments?.aadhar === 'verified' && <span className="badge badge--rust"><Shield size={12} /> Aadhar Verified</span>}
                {worker.verificationDocuments?.insurance === 'verified' && <span className="badge badge--verified">🛡️ Insured</span>}
                {worker.verificationDocuments?.bankDetails === 'verified' && <span className="badge badge--info">🏦 Bank Verified</span>}
                {worker.verificationDocuments?.portfolio === 'verified' && <span className="badge badge--verified">📸 Portfolio Approved</span>}
              </div>

              <h5 style={{ marginBottom: 10 }}>About</h5>
              <p style={{ color: 'var(--color-mid)', lineHeight: 1.8 }}>{worker.bio || 'This worker has not added a bio yet.'}</p>
            </motion.div>

            {/* Skills */}
            <div className="card">
              <h4 style={{ marginBottom: 16 }}>Skills & Rates</h4>
              {worker.skills?.map((skill, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--color-cream)', borderRadius: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{skill.skillName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>{skill.experience} years experience {skill.certified && '• Certified'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-rust)' }}>₹{skill.ratePerHour}/hr</div>
                    {skill.rating > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)' }}>⭐ {skill.rating} ({skill.totalReviews} jobs)</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Portfolio */}
            {worker.portfolio?.length > 0 && (
              <div className="card">
                <h4 style={{ marginBottom: 16 }}>Work Portfolio</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                  {worker.portfolio.filter(p => import.meta.env.MODE === 'development' || p.adminReview === 'approved').map((img, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                      <img src={img.imageUrl} alt={img.description} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      {img.beforeAfter && <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,.6)', color: '#fff', padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{img.beforeAfter}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card">
              <h4 style={{ marginBottom: 20 }}>Customer Reviews ({reviews.length})</h4>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--color-subtle)', textAlign: 'center', padding: '20px 0' }}>No reviews yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {reviews.map(review => (
                    <div key={review._id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        <img src={review.reviewerId?.avatar || `https://ui-avatars.com/api/?name=C&background=FAF5F0`} className="avatar avatar--sm" alt="" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{review.isAnonymous ? 'Anonymous' : review.reviewerId?.name || 'Customer'}</span>
                            {review.isVerified && <span style={{ fontSize: '0.7rem', background: 'var(--color-forest-pale)', color: 'var(--color-forest)', padding: '2px 6px', borderRadius: 20, fontWeight: 600 }}>✓ Verified</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= review.rating ? 'var(--color-gold)' : '#ddd', fontSize: '0.9rem' }}>★</span>)}
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', marginLeft: 6 }}>{new Date(review.createdAt).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-mid)' }}>{review.text}</p>
                      {review.reply && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-cream)', borderRadius: 8, borderLeft: '3px solid var(--color-rust)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-rust)', marginBottom: 4 }}>Worker Reply</div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-mid)' }}>{review.reply.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking Card */}
          <div style={{ position: 'sticky', top: 80 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
              <h4 style={{ marginBottom: 4 }}>Book {worker.userId?.name?.split(' ')[0]}</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-mid)', marginBottom: 20 }}>
                {worker.isAvailableNow ? <span style={{ color: 'var(--color-forest)', fontWeight: 600 }}>🟢 Available Now</span> : '⏸ Check availability'}
              </div>

              {worker.skills?.map(s => (
                <div key={s.skillName} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                  <span>{s.skillName}</span>
                  <strong style={{ color: 'var(--color-rust)' }}>₹{s.ratePerHour}/hr</strong>
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                <button className="btn btn--primary btn--full btn--lg" onClick={() => user ? navigate(`/customer/booking/${workerId}`) : navigate('/customer/login')}>
                  Book Now <ArrowRight size={18} />
                </button>
                {user && (
                  <Link to={`/customer/messages`} className="btn btn--secondary btn--full">
                    <MessageSquare size={16} /> Send Message
                  </Link>
                )}
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Secure payment via Razorpay', 'Free cancellation (24h before)', 'Insurance-backed service'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-mid)' }}>
                    <CheckCircle size={14} color="var(--color-forest)" /> {f}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid var(--color-border)', marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { v: `${worker.completionRate || 98}%`, l: 'Completion' },
                  { v: `${worker.responseTime || 5} min`, l: 'Response' },
                  { v: `${worker.yearsExperience} yrs`, l: 'Experience' },
                  { v: `${worker.totalJobsCompleted}`, l: 'Jobs Done' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-dark)' }}>{s.v}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)' }}>{s.l}</div>
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
