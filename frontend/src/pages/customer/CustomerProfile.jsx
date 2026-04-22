import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, MapPin, Calendar, Edit3, Camera, Save, X, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { CustomerSidebar } from './CustomerDashboard';
import { getCurrentCity } from '../../services/geolocation';
import { Loader } from 'lucide-react';

export default function CustomerProfile() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || '',
    email: user?.email || '',
    fullAddress: user?.primaryAddress?.address || '',
    pincode: user?.primaryAddress?.pincode || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatePayload = {
        name: form.name, 
        city: form.city,
        primaryAddress: {
          address: form.fullAddress,
          city: form.city,
          pincode: form.pincode || '000000',
        }
      };
      const res = await api.put('/auth/profile', updatePayload);
      updateUser({ 
        name: form.name, 
        city: form.city,
        primaryAddress: updatePayload.primaryAddress 
      });
      toast.success('Profile updated! ✅');
      setEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleGeoFill = async () => {
    setGeoLoading(true);
    try {
      const { city, postcode, fullAddress } = await getCurrentCity();
      if (city || fullAddress) {
        setForm(f => ({ 
          ...f, 
          city: city || f.city, 
          pincode: postcode || f.pincode,
          fullAddress: fullAddress || f.fullAddress 
        }));
        toast.success(`📍 Location detected: ${city || 'Address found'}`);
      }
    } catch (err) {
      toast.error(err.message || 'Location access denied.');
    }
    setGeoLoading(false);
  };

  const InfoRow = ({ icon, label, value, editable, field }) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-forest)' }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        {editing && editable ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              style={{ padding: '6px 10px', fontSize: '0.9rem' }}
            />
            {field === 'city' && (
              <button type="button" onClick={handleGeoFill} disabled={geoLoading}
                style={{ padding: '0 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', cursor: 'pointer', color: 'var(--color-forest)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {geoLoading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : '📍'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.95rem', color: 'var(--color-charcoal)', fontWeight: 500 }}>{value || '—'}</div>
        )}
      </div>
      {editable && !editing && (
        <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-subtle)' }}>
          <Edit3 size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div className="portal-layout">
      <CustomerSidebar />
      <div className="portal-main" style={{ background: '#F8F9FA' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0 }}>My Profile</h4>
          {editing ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}><X size={15} /> Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner spinner--white" style={{ width: 14, height: 14 }} /> : <><Save size={15} /> Save Changes</>}
              </button>
            </div>
          ) : (
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}><Edit3 size={15} /> Edit Profile</button>
          )}
        </div>

        <div style={{ padding: 32, maxWidth: 720 }}>
          {/* Profile Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'linear-gradient(135deg, var(--color-forest) 0%, #2E86AB 100%)', borderRadius: 20, padding: '32px', marginBottom: 28, color: '#fff', display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=ffffff&color=1A5D3D&size=128&bold=true`}
                style={{ width: 88, height: 88, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.4)', objectFit: 'cover' }}
                alt={user?.name}
              />
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px', color: '#fff' }}>{user?.name}</h2>
              <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>{user?.email}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  👤 Customer
                </span>
                {user?.city && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                    📍 {user.city}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Info Card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '8px 24px', border: '1px solid var(--color-border)', marginBottom: 20 }}>
            <InfoRow icon={<User size={16} />} label="Full Name" value={user?.name} editable field="name" />
            <InfoRow icon={<Phone size={16} />} label="Phone Number" value={user?.phone} />
            <InfoRow icon={<Mail size={16} />} label="Email Address" value={user?.email} />
            <InfoRow icon={<MapPin size={16} />} label="City (Used for worker search)" value={user?.city} editable field="city" />
            <InfoRow icon={<MapPin size={16} />} label="Full Address / Building Name" value={user?.primaryAddress?.address} editable field="fullAddress" />
            <InfoRow icon={<MapPin size={16} />} label="Pincode" value={user?.primaryAddress?.pincode} editable field="pincode" />
          </div>

          {/* City info note */}
          {!user?.city && (
            <div style={{ background: '#FEF3E2', border: '1px solid #F39C12', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: '#7D5600', display: 'flex', gap: 10, alignItems: 'center' }}>
              ⚠️ <strong>Set your city</strong> — Without a city, you'll see workers from all locations. Set it to see only nearby workers.
              <button className="btn btn--sm" style={{ background: '#F39C12', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', marginLeft: 'auto' }}
                onClick={() => setEditing(true)}>Set City</button>
            </div>
          )}

          {/* Danger Zone */}
          <div style={{ background: '#FEF2F2', borderRadius: 16, padding: '20px 24px', border: '1px solid #FADBD8' }}>
            <h5 style={{ margin: '0 0 12px', color: '#E74C3C' }}>Account</h5>
            <button className="btn btn--sm" style={{ background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => { logout(); navigate('/'); }}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
