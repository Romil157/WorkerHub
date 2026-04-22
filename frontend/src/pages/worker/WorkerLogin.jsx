import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wrench, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { GoogleLogin } from '@react-oauth/google';

export default function WorkerLogin() {
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
      toast.success('OTP sent! Check the backend console in dev mode.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
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
        payload = { phone: phone.startsWith('+') ? phone : `+91${phone}`, otp, userType: 'worker' };
      } else {
        if (!email || !password) { setError('Enter email and password'); setLoading(false); return; }
        payload = { email, password, userType: 'worker' };
      }
      const res = await api.post('/auth/login', payload);
      setUser(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
      toast.success(`Welcome back, ${res.data.data.user.name}!`);
      navigate('/worker/dashboard');
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
        userType: 'worker'
      });
      setUser(res.data.data.user, res.data.data.accessToken, res.data.data.refreshToken);
      toast.success(`Welcome back, ${res.data.data.user.name}!`);
      navigate('/worker/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, background: 'var(--color-rust)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={22} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>WorkerHub</span>
          </Link>
          <h2 style={{ marginBottom: 8 }}>Welcome back! 👋</h2>
          <p style={{ color: 'var(--color-mid)', fontSize: '0.9rem' }}>Login to your worker account</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, padding: 36, boxShadow: 'var(--shadow-lg)' }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-cream)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {[['password', '🔒 Password'], ['otp', '📱 Phone OTP']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', background: mode === m ? 'var(--color-rust)' : 'transparent', color: mode === m ? '#fff' : 'var(--color-mid)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #E74C3C', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="#E74C3C" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: '#E74C3C', fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

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
            {mode === 'otp' ? (
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
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label className="form-label">Enter OTP</label>
                    <input className="form-input" placeholder="6-digit OTP" value={otp} onChange={e => { setOtp(e.target.value); setError(''); }} maxLength={6} style={{ letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center' }} />
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-rust)', fontSize: '0.8rem', cursor: 'pointer', marginTop: 4 }} onClick={() => { setOtpSent(false); setOtp(''); }}>
                      Resend OTP
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
                </div>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" placeholder="Your password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
                </div>
              </>
            )}

            <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
              {loading ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Logging in...</> : <>Login <ArrowRight size={18} /></>}
            </button>
          </form>

          {/* Seed credentials info */}
          <div style={{ marginTop: 20, padding: '10px 14px', background: 'var(--color-cream)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--color-mid)', lineHeight: 1.6 }}>
            💡 <strong>Demo Worker Login:</strong> Email: <code>worker.mumbai.1@demo.workerhub.in</code> | Password: <code>Demo@12345</code>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--color-mid)' }}>
            Don't have an account? <Link to="/worker/register" style={{ color: 'var(--color-rust)', fontWeight: 600 }}>Register as a Worker</Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', color: 'var(--color-subtle)' }}>
          Are you a customer? <Link to="/customer/login" style={{ color: 'var(--color-forest)', fontWeight: 600 }}>Customer Login</Link>
        </p>
      </div>
    </div>
  );
}
