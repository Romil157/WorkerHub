import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wrench, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { GoogleLogin } from '@react-oauth/google';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [mode, setMode] = useState('password'); // default to password — simpler for testing
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    setError('');
    if (!phone) { setError('Enter your phone number first'); return; }
    setOtpLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: phone.startsWith('+') ? phone : `+91${phone}` });
      setOtpSent(true);
      toast.success('OTP sent! Check the backend console for the OTP in dev mode.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP';
      setError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let payload;
      if (mode === 'otp') {
        if (!phone || !otp) { setError('Enter phone number and OTP'); setLoading(false); return; }
        payload = { phone: phone.startsWith('+') ? phone : `+91${phone}`, otp, userType: 'customer' };
      } else {
        if (!email || !password) { setError('Enter email and password'); setLoading(false); return; }
        payload = { email, password, userType: 'customer' };
      }
      const res = await api.post('/auth/login', payload);
      setUser(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
      toast.success(`Welcome back, ${res.data.data.user.name}!`);
      navigate('/customer/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/google', { 
        credential: credentialResponse.credential,
        userType: 'customer'
      });
      setUser(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
      toast.success(`Welcome, ${res.data.data.user.name}!`);
      navigate('/customer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', display: 'flex' }}>
      {/* Left Panel */}
      <div style={{ flex: 1, background: 'var(--color-forest)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#fff' }}>
        <div style={{ maxWidth: 380 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, color: '#fff' }}>
            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={22} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>WorkerHub</span>
          </Link>
          <h2 style={{ color: '#fff', marginBottom: 16 }}>Find trusted workers in your neighbourhood 🏠</h2>
          <p style={{ opacity: 0.8, lineHeight: 1.7 }}>Every worker is Aadhar-verified, insured, and reviewed by real customers.</p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['✅ Aadhar Verified Workers', '✅ Life Insurance Required', '✅ Real Customer Reviews', '✅ Secure Razorpay Payments'].map(t => (
              <div key={t} style={{ opacity: 0.9, fontSize: '0.95rem' }}>{t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%' }}>
          <h2 style={{ marginBottom: 8 }}>Customer Login</h2>
          <p style={{ color: 'var(--color-mid)', marginBottom: 32, fontSize: '0.9rem' }}>Welcome back! Login to find and book workers.</p>

          {/* Error Alert */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #E74C3C', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="#E74C3C" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: '#E74C3C', fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', background: 'var(--color-cream)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {[['password', '🔒 Password'], ['otp', '📱 Phone OTP']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: mode === m ? 'var(--color-forest)' : 'transparent', color: mode === m ? '#fff' : 'var(--color-mid)', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
          
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Login was cancelled or failed.')}
              useOneTap
              theme="outline"
              size="large"
              shape="pill"
              context="signin"
              text="continue_with"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: 'var(--color-border)' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-subtle)' }}>OR LOGIN WITH EMAIL/PHONE</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <form onSubmit={handleLogin}>
            {mode === 'password' ? (
              <>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
                </div>
                <div className="form-group" style={{ marginBottom: 28 }}>
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" placeholder="Your password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Phone Number</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" placeholder="+91 9876543210" value={phone} onChange={e => { setPhone(e.target.value); setError(''); }} style={{ flex: 1 }} />
                    <button type="button" className="btn btn--secondary" style={{ whiteSpace: 'nowrap' }} onClick={handleSendOTP} disabled={otpLoading || otpSent}>
                      {otpLoading ? '...' : otpSent ? '✓ Sent' : 'Send OTP'}
                    </button>
                  </div>
                  {otpSent && <p style={{ fontSize: '0.78rem', color: 'var(--color-forest)', marginTop: 6, fontWeight: 500 }}>📋 OTP printed in backend console (dev mode)</p>}
                </div>
                {otpSent && (
                  <div className="form-group" style={{ marginBottom: 28 }}>
                    <label className="form-label">Enter OTP</label>
                    <input className="form-input" placeholder="6-digit OTP" value={otp} onChange={e => { setOtp(e.target.value); setError(''); }} maxLength={6} style={{ letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center' }} />
                  </div>
                )}
              </>
            )}
            <button type="submit" className="btn btn--forest btn--full btn--lg" disabled={loading}>
              {loading ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Logging in...</> : <>Login <ArrowRight size={18} /></>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--color-mid)' }}>
            No account? <Link to="/customer/register" style={{ color: 'var(--color-forest)', fontWeight: 600 }}>Register for free</Link>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8rem', color: 'var(--color-subtle)' }}>
            Worker? <Link to="/worker/login" style={{ color: 'var(--color-rust)', fontWeight: 600 }}>Worker Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
