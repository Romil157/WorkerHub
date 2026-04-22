import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Star, MapPin, CheckCircle, ArrowRight, Wrench, Menu, Search, Award, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../services/api';

const SKILLS = [
  'Plumbing', 'Electrical Work', 'Carpentry', 'Painting', 'AC Repair', 
  'House Cleaning', 'Pest Control', 'Gardening', 'Home Appliance Repair'
];

export default function LandingPageV2() {
  const navigate = useNavigate();
  const [searchSkill, setSearchSkill] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = () => {
    navigate(`/customer/search${searchSkill ? `?skill=${searchSkill}` : ''}`);
  };

  return (
    <div style={{ background: '#0F172A', minHeight: '100vh', color: '#fff', overflowX: 'hidden' }}>
      
      {/* ── Premium Floating Navbar ── */}
      <nav style={{ 
        position: 'fixed', top: isScrolled ? 10 : 20, left: '50%', transform: 'translateX(-50%)', 
        width: '95%', maxWidth: 1200, zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 100,
        transition: 'all 0.3s ease',
        padding: '0 24px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>
            <Wrench size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px' }}>WorkerHub</span>
        </div>

        <div style={{ display: 'none', gap: 32, fontSize: '0.95rem', fontWeight: 500, color: '#CBD5E1', '@media(min-width: 768px)': { display: 'flex' } }} className="desktop-links">
          <a href="#how" style={{ transition: 'color 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.target.style.color='#fff'} onMouseOut={e=>e.target.style.color='#CBD5E1'}>How it Works</a>
          <a href="#trust" style={{ transition: 'color 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.target.style.color='#fff'} onMouseOut={e=>e.target.style.color='#CBD5E1'}>Trust & Safety</a>
          <a href="#services" style={{ transition: 'color 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.target.style.color='#fff'} onMouseOut={e=>e.target.style.color='#CBD5E1'}>Services</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/worker/login" style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fff', textDecoration: 'none' }}>Worker Login</Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
          <Link to="/customer/login" style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fff', textDecoration: 'none' }}>Log In</Link>
          <Link to="/customer/register" style={{ 
            background: '#fff', color: '#0F172A', padding: '10px 24px', borderRadius: 50, 
            fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', transition: 'transform 0.2s',
            boxShadow: '0 4px 10px rgba(255,255,255,0.1)'
          }} onMouseOver={e => e.target.style.transform='scale(1.03)'} onMouseOut={e => e.target.style.transform='scale(1)'}>
            Book Now
          </Link>
        </div>
      </nav>

      {/* ── Cinematic Hero Section ── */}
      <section style={{ position: 'relative', paddingTop: 180, paddingBottom: 100 }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, alignItems: 'center' }}>
            
            {/* Left Content */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px 16px', borderRadius: 50, marginBottom: 24 }}>
                <Shield size={14} color="#818CF8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818CF8', letterSpacing: '0.5px' }}>100% Gov-ID Verified Professionals</span>
              </div>
              
              <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', lineHeight: 1.1, fontWeight: 800, marginBottom: 24, letterSpacing: '-1px' }}>
                Craftsmanship you <br />
                can <span style={{ color: '#818CF8', position: 'relative' }}>
                  rely absolute on.
                  <svg style={{ position: 'absolute', bottom: -5, left: 0, width: '100%', height: 12 }} viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M0,10 Q50,0 100,10" fill="none" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              
              <p style={{ fontSize: '1.2rem', color: '#94A3B8', marginBottom: 40, lineHeight: 1.6, maxWidth: 540 }}>
                Stop risking your home with unverified strangers. WorkerHub deploys thoroughly vetted, highly-rated professionals directly to your doorstep in minutes.
              </p>

              {/* Action Bar */}
              <div style={{ display: 'flex', gap: 12, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 12, maxWidth: 480, backdropFilter: 'blur(10px)' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 12 }}>
                  <Search size={20} color="#64748B" />
                  <select 
                    value={searchSkill} 
                    onChange={e => setSearchSkill(e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="" style={{ color: '#000' }}>What service do you need?</option>
                    {SKILLS.map(s => <option key={s} value={s} style={{ color: '#000' }}>{s}</option>)}
                  </select>
                </div>
                <button onClick={handleSearch} style={{ background: '#6366F1', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 12, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.target.style.background='#4F46E5'} onMouseOut={e=>e.target.style.background='#6366F1'}>
                  Search <ArrowRight size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 40, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>4.9/5</span>
                  <div style={{ display: 'flex', color: '#FCD34D' }}>
                    {[1,2,3,4,5].map(i=><Star key={i} size={14} fill="currentColor" />)}
                  </div>
                </div>
                <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>15k+</span>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Jobs Completed</span>
                </div>
              </div>
            </motion.div>

            {/* Right Images (Bento/Mosaic) */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} style={{ position: 'relative', height: 600 }}>
              {/* Main Image */}
              <div style={{ position: 'absolute', top: 40, right: 0, width: '85%', height: '80%', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <img src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Professional Work" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, transparent 50%)' }} />
              </div>
              
              {/* Floating Element 1 */}
              <div style={{ position: 'absolute', bottom: 60, left: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', padding: 20, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxWidth: 260 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={24} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Job Finished</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Payment secured.</div>
                </div>
              </div>

              {/* Floating Element 2 */}
              <div style={{ position: 'absolute', top: 80, left: -20, background: '#fff', color: '#0F172A', padding: 16, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <img src="https://ui-avatars.com/api/?name=Rakesh&background=6366F1&color=fff" style={{ width: 40, height: 40, borderRadius: '50%' }} alt="Avatar" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Pro Electrician</div>
                  <div style={{ color: '#64748B', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="#F59E0B" color="#F59E0B" /> 4.9 Top Rated</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── profound Quote Section ── */}
      <section style={{ padding: '80px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="container" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <Award size={48} color="#6366F1" style={{ marginBottom: 24, opacity: 0.8 }} />
          <p style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-display)', fontStyle: 'italic', lineHeight: 1.3, color: '#E2E8F0', fontWeight: 300 }}>
            "We believed that letting someone into your home should never be a gamble. That's why we engineered the most rigorously verified workforce in the country."
          </p>
        </div>
      </section>

      {/* ── Footer / Push down visually ── */}
      <footer style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
        <p>© 2026 WorkerHub. All Rights Reserved.</p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24 }}>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}
