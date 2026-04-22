import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Edit, Camera } from 'lucide-react';
import api from '../../services/api';
import { PortalSidebar } from './WorkerDashboard';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { path: '/worker/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/worker/orders', icon: '💼', label: 'My Jobs' },
  { path: '/worker/messages', icon: '💬', label: 'Messages' },
  { path: '/worker/profile', icon: '👤', label: 'Profile' },
];

const VDoc = ({ label, status }) => {
  const cfg = {
    verified: { color: '#27AE60', bg: '#EAF5EE', icon: '✅' },
    pending:  { color: '#E67E22', bg: '#FEF3E2', icon: '⏳' },
    rejected: { color: '#E74C3C', bg: '#FEF2F2', icon: '❌' },
  }[status] || { color: '#888', bg: '#F5F5F5', icon: '?' };
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: cfg.bg, borderRadius: 10, alignItems: 'center' }}>
      <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
      <span style={{ fontSize: '0.85rem', color: cfg.color, fontWeight: 600 }}>{label}</span>
    </div>
  );
};

export default function WorkerProfile() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.put('/auth/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ avatar: res.data.data.avatar });
      toast.success('Profile photo updated! 📸');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    }
    setUploadingAvatar(false);
  };

  useEffect(() => {
    api.get('/workers/profile').then(r => {
      setProfile(r.data.data);
      setEditData({ bio: r.data.data.bio || '', primarySkill: r.data.data.primarySkill || '', cityOfOperation: r.data.data.cityOfOperation || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    try {
      await api.put('/workers/profile', editData);
      setProfile(p => ({ ...p, ...editData }));
      setEditing(false);
      toast.success('Profile updated!');
    } catch {}
  };

  if (loading) return <div className="portal-layout"><PortalSidebar navItems={NAV_ITEMS} title="Worker Portal" /><div className="portal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner spinner--lg" /></div></div>;

  return (
    <div className="portal-layout">
      <PortalSidebar navItems={NAV_ITEMS} title="Worker Portal" />
      <div className="portal-main">
        <div className="portal-topbar flex-between">
          <h4>My Profile</h4>
          <button className="btn btn--primary btn--sm" onClick={() => editing ? saveProfile() : setEditing(true)}>
            {editing ? '💾 Save Changes' : <><Edit size={14} /> Edit Profile</>}
          </button>
        </div>
        <div className="portal-content">
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
            {/* Left: Avatar + Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'W')}&background=D4501D&color=fff&size=200`} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--color-rust)' }} />
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                  <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                    style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--color-rust)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {uploadingAvatar ? <span className="spinner spinner--white" style={{ width: 14, height: 14 }} /> : <Camera size={14} color="#fff" />}
                  </button>
                </div>
                <h3 style={{ marginBottom: 4 }}>{user?.name}</h3>
                <p style={{ color: 'var(--color-mid)', fontSize: '0.9rem', marginBottom: 12 }}>{profile?.primarySkill}</p>
                {user?.isVerified ? (
                  <span style={{ background: '#FEF9E7', color: '#7D6608', padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, display: 'inline-block' }}>⭐ Verified Worker</span>
                ) : (
                  <span style={{ background: '#FEF3E2', color: '#E67E22', padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, display: 'inline-block' }}>⏳ Pending Verification</span>
                )}
                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 20, paddingTop: 20, display: 'flex', justifyContent: 'space-around' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{profile?.overallRating || 0}⭐</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)' }}>Rating</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{profile?.totalJobsCompleted || 0}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)' }}>Jobs</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{profile?.yearsExperience || 0}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)' }}>Yrs Exp</div>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="card">
                <h5 style={{ marginBottom: 16 }}>Verification Status</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <VDoc label="Aadhar Verified" status={profile?.verificationDocuments?.aadhar} />
                  <VDoc label="Insurance Active" status={profile?.verificationDocuments?.insurance} />
                  <VDoc label="Bank Verified" status={profile?.verificationDocuments?.bankDetails} />
                  <VDoc label="Portfolio Reviewed" status={profile?.verificationDocuments?.portfolio} />
                </div>
              </div>
            </div>

            {/* Right: Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <h5 style={{ marginBottom: 20 }}>About Me</h5>
                {editing ? (
                  <textarea className="form-textarea" value={editData.bio} onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))} rows={5} placeholder="Describe your skills and experience..." />
                ) : (
                  <p style={{ color: 'var(--color-mid)', lineHeight: 1.8, marginBottom: 20 }}>{profile?.bio || 'No bio added yet.'}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', fontWeight: 600, marginBottom: 4 }}>PRIMARY SKILL</div>
                    {editing ? <input className="form-input" value={editData.primarySkill} onChange={e => setEditData(d => ({ ...d, primarySkill: e.target.value }))} /> :
                      <div style={{ fontWeight: 600 }}>{profile?.primarySkill}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', fontWeight: 600, marginBottom: 4 }}>CITY</div>
                    {editing ? <input className="form-input" value={editData.cityOfOperation} onChange={e => setEditData(d => ({ ...d, cityOfOperation: e.target.value }))} /> :
                      <div style={{ fontWeight: 600 }}>{profile?.cityOfOperation}</div>}
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="card">
                <h5 style={{ marginBottom: 16 }}>Skills & Rates</h5>
                {profile?.skills?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {profile.skills.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-cream)', borderRadius: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.skillName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)' }}>{s.experience} years experience</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-rust)' }}>₹{s.ratePerHour}/hr</div>
                          {s.rating > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)' }}>⭐ {s.rating}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--color-subtle)', fontSize: '0.85rem' }}>No skills added yet. Complete your registration.</p>}
              </div>

              {/* Portfolio */}
              {profile?.portfolio?.length > 0 && (
                <div className="card">
                  <h5 style={{ marginBottom: 16 }}>Work Portfolio</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                    {profile.portfolio.map((img, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={img.imageUrl} alt={img.description} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                        {img.isAIFlagged && (
                          <div style={{ position: 'absolute', top: 4, right: 4, background: '#FEF3E2', color: '#E67E22', padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700 }}>⚠ Flagged</div>
                        )}
                        {img.adminReview === 'approved' && (
                          <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--color-forest-pale)', color: 'var(--color-forest)', padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700 }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
