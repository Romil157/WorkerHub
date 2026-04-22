import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setAdmin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/admin/login', { email, password });
      const { admin, token } = res.data.data;
      setAdmin(admin, token);
      toast.success(`Welcome, ${admin.name}!`);
      navigate('/admin/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check credentials or ensure server is running.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('admin@workerhub.in');
    setPassword('Admin@123456');
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: 'var(--color-rust)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={32} color="#fff" />
          </div>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Admin Portal</h2>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.9rem' }}>WorkerHub Management Dashboard</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,.05)', backdropFilter: 'blur(10px)', borderRadius: 24, padding: 36, border: '1px solid rgba(255,255,255,.1)' }}>
          {/* Error Alert */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(231,76,60,.2)', border: '1px solid rgba(231,76,60,.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="#E74C3C" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: '#ff8a75', fontSize: '0.85rem' }}>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ color: 'rgba(255,255,255,.8)' }}>Admin Email</label>
              <input
                type="email" className="form-input"
                placeholder="admin@workerhub.in"
                value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                style={{ background: 'rgba(255,255,255,.08)', border: `1px solid ${error ? 'rgba(231,76,60,.5)' : 'rgba(255,255,255,.15)'}`, color: '#fff' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="form-label" style={{ color: 'rgba(255,255,255,.8)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} className="form-input"
                  placeholder="Admin password"
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={{ background: 'rgba(255,255,255,.08)', border: `1px solid ${error ? 'rgba(231,76,60,.5)' : 'rgba(255,255,255,.15)'}`, color: '#fff', paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading || !email || !password}>
              {loading
                ? <><span className="spinner spinner--white" style={{ width: 18, height: 18 }} /> Logging in...</>
                : '🔐 Secure Login'}
            </button>
          </form>

          {/* Demo Credentials — Clickable */}
          <div
            onClick={fillDemo}
            style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(212,80,29,.15)', borderRadius: 10, border: '1px solid rgba(212,80,29,.3)', fontSize: '0.8rem', color: 'rgba(255,255,255,.7)', cursor: 'pointer', transition: 'background 0.2s' }}
            title="Click to autofill">
            <strong style={{ color: 'var(--color-rust)' }}>👆 Click to autofill demo credentials:</strong><br />
            Email: admin@workerhub.in<br />
            Password: Admin@123456
          </div>

          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 10, fontSize: '0.75rem', color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
            ⚠️ Make sure the backend server is running on port 5000 and the database is seeded before logging in.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
