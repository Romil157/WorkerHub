import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Star, MapPin, CheckCircle, ArrowRight, Wrench, Zap, Search, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import image1 from '../../assets/image1.jpeg';
import image2 from '../../assets/image2.jpeg';

const TRUST_METRICS = [
  { value: '5,000+', label: 'Verified Workers' },
  { value: '50,000+', label: 'Happy Customers' },
  { value: '₹50L+', label: 'Jobs Completed' },
  { value: '4.8★', label: 'Average Rating' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: <Search size={28} />, title: 'Search', desc: 'Find verified workers by skill and location near you.' },
  { step: '02', icon: <CheckCircle size={28} />, title: 'Verify & Book', desc: 'Every worker has Aadhar, insurance and document verification.' },
  { step: '03', icon: <Star size={28} />, title: 'Pay & Review', desc: 'Secure payments via UPI or card. Rate your experience.' },
];

const TESTIMONIALS = [
  { name: 'Anuj Mahajan', role: 'Customer, Bangalore', text: "Found a verified plumber in 10 minutes. Aadhar-verified badge gave me total confidence. Excellent service!", rating: 5, avatar: 'https://ui-avatars.com/api/?name=Anuj+Mahajan&background=D4501D&color=fff' },
  { name: 'Deepa Reddy', role: 'Customer, Hyderabad', text: "The insurance verification is a game-changer. I knew I was protected. Will use WorkerHub every time.", rating: 5, avatar: 'https://ui-avatars.com/api/?name=Deepa+Reddy&background=1A5D3D&color=fff' },
  { name: 'Rajesh Kumar', role: 'Plumber, WorkerHub Pro', text: "My earnings tripled after joining WorkerHub. The verified badge gets me 10x more bookings!", rating: 5, avatar: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=F39C12&color=fff' },
];

const SKILLS = [
  'Plumbing', 'Electrical Work', 'Carpentry', 'Painting', 'AC Repair',
  'House Cleaning', 'Pest Control', 'Gardening', 'Home Appliance Repair',
  'Welding', 'Babysitting', 'Maid & Cooking', 'Dog Walking', 'Tutor',
  'Driver', 'Beautician', 'Yoga Instructor'
];

const StarRating = ({ rating }) => (
  <div className="stars">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>★</span>
    ))}
  </div>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [searchSkill, setSearchSkill] = useState('');

  useEffect(() => {
    api.get('/customers/search?limit=6').then(r => setWorkers(r.data.data?.workers || [])).catch(() => { });
  }, []);

  const handleSearch = () => {
    navigate(`/customer/search${searchSkill ? `?skill=${searchSkill}` : ''}`);
  };

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* ── Navbar ── */}
      <nav style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 'var(--z-nav)' }}>
        <div className="container flex-between" style={{ height: 64 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--color-rust)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={20} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-dark)' }}>WorkerHub</span>
          </Link>
          <div style={{ display: 'flex', gap: 32, fontWeight: 600, fontSize: '0.95rem' }}>
            <a href="#how" style={{ color: 'var(--color-mid)', transition: 'color 0.2s' }}>How it Works</a>
            <a href="#testimonials" style={{ color: 'var(--color-mid)', transition: 'color 0.2s' }}>Testimonials</a>
          </div>
          <div className="flex gap-md" style={{ alignItems: 'center' }}>
            <Link to="/customer/login" className="btn btn--ghost btn--sm">Customer Login</Link>
            <Link to="/worker/login" className="btn btn--ghost btn--sm">Worker Login</Link>
            <Link to="/customer/register" className="btn btn--primary btn--sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '80px 0 60px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(212,80,29,.08) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, background: 'radial-gradient(circle, rgba(26,93,61,.06) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div className="container" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: 'left', flex: '1 1 500px', maxWidth: 640 }}>
              <div className="section-tag" style={{ justifyContent: 'flex-start' }}>
                <Shield size={14} /> Government-Level Verified Workers
              </div>
              <h1 style={{ marginBottom: 20, lineHeight: 1.15 }}>
                Hire{' '}
                <span style={{ color: 'var(--color-rust)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Trusted</span>
                {' '}Skilled Workers<br />Near You
              </h1>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-mid)', maxWidth: 600, margin: '0 0 40px 0' }}>
                Every worker on WorkerHub is verified with Aadhar ID, life insurance, and professional documents — so you can hire with complete confidence.
              </p>

              {/* Search Bar */}
              <div style={{ display: 'flex', gap: 12, maxWidth: 540, margin: '0 0 48px 0', background: '#fff', border: '2px solid var(--color-border)', borderRadius: 16, padding: 8 }}>
                <select
                  value={searchSkill}
                  onChange={e => setSearchSkill(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '0.95rem', padding: '4px 8px', background: 'transparent', color: 'var(--color-charcoal)' }}
                >
                  <option value="">Select a Skill...</option>
                  {SKILLS.map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={handleSearch} className="btn btn--primary" style={{ borderRadius: 10, padding: '10px 24px' }}>
                  <Search size={16} /> Search
                </button>
              </div>

              <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <Link to="/customer/register" className="btn btn--primary btn--lg">
                  Find a Worker <ArrowRight size={18} />
                </Link>
                <Link to="/worker/register" className="btn btn--secondary btn--lg">
                  Join as a Worker
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ flex: '1 1 400px' }}>
              <div style={{ position: 'relative', height: 500, borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
                <img src={image2} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Professional" />
                <div style={{ position: 'absolute', bottom: 24, left: 24, background: '#fff', padding: '16px 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-lg)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-verified)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={24} color="#fff" /></div>
                  <div><div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-charcoal)' }}>Job Completed</div><div style={{ fontSize: '0.85rem', color: 'var(--color-mid)' }}>Payment Fully Secured</div></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust Metrics ── */}
      <section style={{ padding: '40px 0', background: 'var(--color-rust)', color: '#fff' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center' }}>
            {TRUST_METRICS.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: 4 }}>{m.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-tag" style={{ justifyContent: 'center' }}>Simple Process</div>
            <h2>How WorkerHub Works</h2>
            <p style={{ color: 'var(--color-mid)', marginTop: 12, maxWidth: 480, margin: '12px auto 0' }}>Hire a verified professional in 3 easy steps</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, position: 'relative' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} viewport={{ once: true }}>
                <div className="card" style={{ textAlign: 'center', padding: 40, position: 'relative' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-rust)', letterSpacing: '0.1em', marginBottom: 16, opacity: 0.6 }}>STEP {step.step}</div>
                  <div style={{ width: 64, height: 64, background: 'var(--color-rust-pale)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-rust)' }}>
                    {step.icon}
                  </div>
                  <h4 style={{ marginBottom: 10 }}>{step.title}</h4>
                  <p style={{ color: 'var(--color-mid)', fontSize: '0.9rem' }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Workers ── */}
      <section className="section" style={{ background: 'var(--color-cream-dark)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="section-tag">Top Rated</div>
              <h2>Featured Verified Workers</h2>
            </div>
            <Link to="/customer/search" className="btn btn--secondary">View All Workers</Link>
          </div>

          {workers.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
              {workers.map((w, i) => (
                <motion.div key={w._id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}>
                  <Link to={`/customer/worker/${w._id}`} className="worker-card" style={{ display: 'block' }}>
                    <img src={w.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.userId?.name || 'W')}&background=D4501D&color=fff&size=200`} alt={w.userId?.name} className="worker-card__image" />
                    <div className="worker-card__body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="worker-card__name">{w.userId?.name}</div>
                          <div className="worker-card__skill">{w.primarySkill}</div>
                        </div>
                        <span className="verify-stamp">✓ Verified</span>
                      </div>
                      <div className="worker-card__rating">
                        <span style={{ color: 'var(--color-gold)' }}>★</span>
                        {w.overallRating} <span style={{ color: 'var(--color-subtle)', fontWeight: 400 }}>({w.totalReviews})</span>
                      </div>
                      <div className="worker-card__footer">
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-mid)' }}>
                          <MapPin size={12} style={{ display: 'inline', marginRight: 2 }} /> {w.cityOfOperation}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-rust)' }}>
                          ₹{w.skills?.[0]?.ratePerHour}/hr
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="card" style={{ height: 280, background: 'var(--color-cream)' }}>
                  <div style={{ height: 160, background: 'var(--color-border)', borderRadius: 8, marginBottom: 16, animation: 'pulse 2s ease infinite' }} />
                  <div style={{ height: 16, background: 'var(--color-border)', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 4, width: '60%' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Verification Trust ── */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="section-tag">Why Trust Us</div>
              <h2>India's Most Verified Worker Platform</h2>
              <p style={{ color: 'var(--color-mid)', marginTop: 16, marginBottom: 32 }}>
                We go beyond ordinary background checks. Every worker is verified at a government level before they can appear on our platform.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '🪪', title: 'Aadhar e-KYC Verified', desc: 'Official government identity verification with Digio/Signzy' },
                  { icon: '🛡️', title: 'Life Insurance Required', desc: 'Every worker must have active life insurance coverage' },
                  { icon: '🤖', title: 'AI Document Detection', desc: 'Documents checked for authenticity — no fakes allowed' },
                  { icon: '⭐', title: 'Reviewed by Real Customers', desc: 'Verified purchase reviews only — no fake ratings' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-mid)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div style={{ background: 'var(--color-white)', borderRadius: 24, padding: 40, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ width: 80, height: 80, background: 'var(--color-rust)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Shield size={40} color="#fff" />
                  </div>
                  <h3>WorkerHub Trust Certificate</h3>
                  <p style={{ color: 'var(--color-mid)', fontSize: '0.9rem', marginTop: 8 }}>Every verified worker has passed all of:</p>
                </div>
                {['✅ Aadhar Number Verified', '✅ Life Insurance Active', '✅ Bank Account Verified', '✅ Document Authenticity Checked', '✅ Admin-Reviewed Portfolio', '✅ No Active Complaints'].map(check => (
                  <div key={check} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem', fontWeight: 500 }}>{check}</div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section" style={{ background: 'var(--color-cream-dark)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-tag" style={{ justifyContent: 'center' }}>Reviews</div>
            <h2>Loved by Workers & Customers</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <div className="card card--elevated" style={{ padding: 32 }}>
                  <StarRating rating={t.rating} />
                  <p style={{ margin: '16px 0 24px', color: 'var(--color-charcoal)', lineHeight: 1.7, fontSize: '0.95rem' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={t.avatar} alt={t.name} className="avatar avatar--md" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── profound Quote & Images block ── */}
      <section className="section" style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <Shield size={48} color="var(--color-rust)" style={{ margin: '0 auto 24px', opacity: 0.8 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.5rem', lineHeight: 1.3, color: 'var(--color-charcoal)', marginBottom: 24 }}>
            "We believe that letting someone into your home should never be a gamble. Trust must be thoroughly verified, not just assumed."
          </h2>
          <p style={{ color: 'var(--color-mid)', fontSize: '1.1rem', marginBottom: 60 }}>— The WorkerHub Trust & Safety Board</p>

          {/* Added Images grid to increase scroll length and professionalism */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            <img src={image1} style={{ width: '100%', height: 350, objectFit: 'cover', borderRadius: 24, boxShadow: 'var(--shadow-md)' }} alt="Electrician at work" />
            <img src={image2} style={{ width: '100%', height: 350, objectFit: 'cover', borderRadius: 24, boxShadow: 'var(--shadow-md)' }} alt="Trust Handshake" />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 0', background: 'var(--color-forest)', color: '#fff', textAlign: 'center' }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 style={{ color: '#fff', marginBottom: 16 }}>Ready to Join WorkerHub?</h2>
            <p style={{ opacity: 0.85, maxWidth: 480, margin: '0 auto 40px', fontSize: '1rem' }}>
              Whether you're hiring or offering your skills — WorkerHub makes it safe, easy and trusted.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/customer/register" className="btn btn--xl" style={{ background: '#fff', color: 'var(--color-forest)' }}>
                Hire a Worker
              </Link>
              <Link to="/worker/register" className="btn btn--xl" style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.6)' }}>
                Join as a Worker
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#1A1A1A', color: '#fff', padding: '48px 0 24px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, background: 'var(--color-rust)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={18} color="#fff" />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>WorkerHub</span>
              </div>
              <p style={{ opacity: 0.6, fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 280 }}>India's most trusted hyperlocal skilled worker marketplace with government-level verification.</p>
            </div>
            {[
              { title: 'For Customers', links: ['Find Workers', 'How it Works', 'Pricing', 'Safety'] },
              { title: 'For Workers', links: ['Register', 'Benefits', 'Verification', 'Payouts'] },
              { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight: 600, marginBottom: 16, fontSize: '0.9rem' }}>{col.title}</div>
                {col.links.map(link => (
                  <div key={link} style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: 8, cursor: 'pointer' }}
                    onMouseEnter={e => e.target.style.opacity = 1}
                    onMouseLeave={e => e.target.style.opacity = 0.6}
                  >{link}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>© 2024 WorkerHub. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 24, opacity: 0.5, fontSize: '0.8rem' }}>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
