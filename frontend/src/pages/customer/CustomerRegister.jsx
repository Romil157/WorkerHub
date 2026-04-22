import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Wrench, MapPin, Loader } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { getCurrentCity } from '../../services/geolocation';

const steps = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Address' },
  { id: 3, label: 'Terms & Conditions' },
];

export default function CustomerRegister() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', dateOfBirth: '', gender: '' });
  const [address, setAddress] = useState({ address: '', locality: '', city: '', pincode: '', label: 'Home' });
  const [checks, setChecks] = useState({ tos: false, privacy: false, complaint: false });
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  const a = (key) => ({ value: address[key], onChange: e => setAddress(p => ({ ...p, [key]: e.target.value })) });

  const step1Next = () => {
    if (!form.name || !form.phone || !form.email || !form.password) { toast.error('Fill all required fields'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setStep(2);
  };

  const step2Next = () => {
    if (!address.address || !address.city || !address.pincode) { toast.error('Fill all address fields'); return; }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!Object.values(checks).every(Boolean)) { toast.error('Accept all terms to continue'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        ...form, userType: 'customer',
        phone: form.phone.startsWith('+') ? form.phone : `+91${form.phone}`,
        primaryAddress: address,
        city: address.city, // Save city at top-level for worker search filtering
      });
      setUser(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
      toast.success('Welcome to WorkerHub! 🎉');
      navigate('/customer/dashboard');
    } catch {}
    setLoading(false);
  };

  const handleGeoFill = async () => {
    setGeoLoading(true);
    try {
      const { city, lat, lng } = await getCurrentCity();
      if (city) {
        setAddress(p => ({ ...p, city }));
        toast.success(`📍 City detected: ${city}`);
      } else {
        toast.error('Could not detect city. Please type it manually.');
      }
    } catch (err) {
      toast.error(err.message || 'Location access denied.');
    }
    setGeoLoading(false);
  };


  const StepBar = () => (
    <div style={{ display: 'flex', gap: 0, marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: step > s.id ? 'var(--color-forest)' : step === s.id ? 'var(--color-rust)' : 'var(--color-border)', color: step >= s.id ? '#fff' : 'var(--color-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.3s' }}>
              {step > s.id ? '✓' : s.id}
            </div>
            <span style={{ fontSize: '0.7rem', color: step === s.id ? 'var(--color-rust)' : 'var(--color-subtle)', marginTop: 4, fontWeight: step === s.id ? 600 : 400 }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.id ? 'var(--color-forest)' : 'var(--color-border)', margin: '0 4px', marginBottom: 16, transition: 'background 0.3s' }} />}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, background: 'var(--color-forest)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={22} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>WorkerHub</span>
          </Link>
          <h2>Create Customer Account</h2>
          <p style={{ color: 'var(--color-mid)', fontSize: '0.9rem' }}>Find and hire verified workers near you • Takes ~5 minutes</p>
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
          style={{ background: '#fff', borderRadius: 24, padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
          <StepBar />

          {step === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[['Full Name', 'name', 'John Doe'], ['Phone Number', 'phone', '+91 9876543210'], ['Email Address', 'email', 'john@email.com'], ['Password', 'password', '8+ characters']].map(([label, key, ph]) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label} *</label>
                    <input className="form-input" type={key === 'password' ? 'password' : 'text'} placeholder={ph} {...f(key)} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" {...f('dateOfBirth')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" {...f('gender')}>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <button className="btn btn--primary btn--full btn--lg" style={{ marginTop: 28 }} onClick={step1Next}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Address *</label>
                  <input className="form-input" placeholder="House/Flat No., Street Name" {...a('address')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Locality</label>
                    <input className="form-input" placeholder="Koramangala" {...a('locality')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-input" placeholder="Bangalore" {...a('city')} style={{ flex: 1 }} />
                      <button type="button" onClick={handleGeoFill} disabled={geoLoading}
                        style={{ padding: '0 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-forest)', flexShrink: 0 }}
                        title="Use my current location">
                        {geoLoading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={15} />}
                        {geoLoading ? '' : '📍'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input className="form-input" placeholder="560034" {...a('pincode')} maxLength={6} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Label</label>
                    <select className="form-select" {...a('label')}>
                      <option>Home</option>
                      <option>Office</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button className="btn btn--ghost" onClick={() => setStep(1)}><ArrowLeft size={18} /> Back</button>
                <button className="btn btn--primary btn--full btn--lg" onClick={step2Next}>Continue <ArrowRight size={18} /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'tos', label: 'I agree to the Terms of Service and User Agreement' },
                  { key: 'privacy', label: 'I have read and accept the Privacy Policy' },
                  { key: 'complaint', label: 'I accept the Dispute Resolution Policy' },
                ].map(item => (
                  <label key={item.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 16px', border: `2px solid ${checks[item.key] ? 'var(--color-forest)' : 'var(--color-border)'}`, borderRadius: 10, background: checks[item.key] ? 'var(--color-forest-pale)' : '#fff', transition: 'all 0.2s' }}>
                    <input type="checkbox" checked={checks[item.key]} onChange={() => setChecks(c => ({ ...c, [item.key]: !c[item.key] }))} style={{ accentColor: 'var(--color-forest)', width: 18, height: 18, marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button className="btn btn--ghost" onClick={() => setStep(2)}><ArrowLeft size={18} /> Back</button>
                <button className="btn btn--forest btn--full btn--lg" onClick={handleSubmit} disabled={loading || !Object.values(checks).every(Boolean)}>
                  {loading ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Creating account...</> : 'Create Account 🎉'}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--color-mid)' }}>
          Already have an account? <Link to="/customer/login" style={{ color: 'var(--color-forest)', fontWeight: 600 }}>Login here</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8rem', color: 'var(--color-subtle)' }}>
          Are you a worker? <Link to="/worker/register" style={{ color: 'var(--color-rust)', fontWeight: 600 }}>Register as Worker</Link>
        </p>
      </div>
    </div>
  );
}
