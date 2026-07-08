import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, Clock, Shield, FileText } from 'lucide-react';
import api from '../../services/api';
import { AdminSidebar } from './AdminDashboard';
import toast from 'react-hot-toast';

export default function AdminVerification() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(null);
  const [processing, setProcessing] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/admin/verification?status=${filter}`);
      setWorkers(res.data.data.workers || []);
    } catch {}
    if (!silent) setLoading(false);
  };

  useEffect(() => { 
    load(); 
    // Auto-refresh the queue every 30 seconds silently in the background
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const approve = async (workerId) => {
    setProcessing(workerId);
    try {
      await api.put(`/admin/verification/${workerId}/approve`);
      toast.success('Worker approved and notified via email! ✅');
      setSelected(null);
      load();
    } catch {}
    setProcessing(null);
  };

  const reject = async (workerId) => {
    if (!rejectReason.trim()) { toast.error('Enter rejection reason'); return; }
    setProcessing(workerId);
    try {
      await api.put(`/admin/verification/${workerId}/reject`, { reason: rejectReason });
      toast.success('Worker rejected and notified.');
      setShowReject(null);
      setRejectReason('');
      load();
    } catch {}
    setProcessing(null);
  };

  const VBadge = ({ status, label }) => {
    const cfg = { verified: { bg: '#EAF5EE', c: '#27AE60' }, pending: { bg: '#FEF3E2', c: '#E67E22' }, rejected: { bg: '#FEF2F2', c: '#E74C3C' }, incomplete: { bg: '#F5F5F5', c: '#888' } }[status] || { bg: '#F5F5F5', c: '#888' };
    return <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.c, fontSize: '0.7rem', fontWeight: 700 }}>{label}</span>;
  };

  return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ background: '#F8F9FA' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0 }}>Verification Queue</h4>
          <button className="btn btn--sm btn--ghost" onClick={() => load(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={16} /> Refresh
          </button>
        </div>
        <div style={{ padding: 32 }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['pending', 'verified', 'rejected', 'incomplete'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                style={{
                  padding: '8px 20px', borderRadius: 10, fontFamily: 'inherit',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  background: filter === s ? 'var(--color-rust)' : '#fff',
                  color: filter === s ? '#fff' : 'var(--color-mid)',
                  border: `1px solid ${filter === s ? 'var(--color-rust)' : 'var(--color-border)'}`,
                  transition: 'all 0.2s',
                }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 24 }}>
            {/* Worker List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div className="spinner spinner--lg" /></div>
                : workers.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 16, padding: 64, textAlign: 'center', color: 'var(--color-subtle)', border: '1px solid var(--color-border)' }}>
                    <Shield size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                    <p>No workers in {filter} queue</p>
                  </div>
                ) : workers.map((worker, i) => (
                  <motion.div key={worker._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: `2px solid ${selected?._id === worker._id ? 'var(--color-rust)' : 'var(--color-border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setSelected(selected?._id === worker._id ? null : worker)}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <img src={worker.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.userId?.name || 'W')}&background=D4501D&color=fff`} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700 }}>{worker.userId?.name}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <VBadge status={worker.verificationStatus} label={worker.verificationStatus} />
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)', marginBottom: 8 }}>
                          {worker.primarySkill} • {worker.cityOfOperation} • {worker.userId?.email}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <VBadge status={worker.verificationDocuments?.aadhar} label={`🪪 Aadhar: ${worker.verificationDocuments?.aadhar || 'N/A'}`} />
                          <VBadge status={worker.verificationDocuments?.insurance} label={`🛡️ Insurance: ${worker.verificationDocuments?.insurance || 'N/A'}`} />
                          <VBadge status={worker.verificationDocuments?.bankDetails} label={`🏦 Bank: ${worker.verificationDocuments?.bankDetails || 'N/A'}`} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {filter === 'pending' && (
                          <>
                            <button className="btn btn--forest btn--sm" disabled={processing === worker._id} onClick={e => { e.stopPropagation(); approve(worker._id); }}>
                              {processing === worker._id ? <span className="spinner spinner--white" style={{ width: 14, height: 14 }} /> : <><CheckCircle size={14} /> Approve</>}
                            </button>
                            <button className="btn btn--sm" style={{ background: '#FEF2F2', color: '#E74C3C', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem' }} onClick={e => { e.stopPropagation(); setShowReject(worker._id); setSelected(null); }}>
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>

            {/* Detail Panel */}
            {selected && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid var(--color-border)', height: 'fit-content', position: 'sticky', top: 80 }}>
                <h5 style={{ marginBottom: 20 }}>Document Details</h5>
                {[
                  { title: 'Aadhar Details', icon: '🪪', data: selected.aadhar, fields: [['Name', 'fullName'], ['Number', 'number'], ['Verified', 'verified']] },
                  { title: 'Insurance', icon: '🛡️', data: selected.insurance, fields: [['Provider', 'provider'], ['Policy #', 'policyNumber'], ['Coverage', 'coverageAmount'], ['Expires', 'endDate']] },
                  { title: 'Bank Account', icon: '🏦', data: selected.bankDetails, fields: [['Bank', 'bankName'], ['Account', 'accountNumber'], ['IFSC', 'ifscCode']] },
                ].map(section => (
                  <div key={section.title} style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, display: 'flex', gap: 6 }}>{section.icon} {section.title}</div>
                    {section.fields.map(([label, key]) => section.data?.[key] !== undefined && (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                        <span style={{ color: 'var(--color-subtle)' }}>{label}</span>
                        <span style={{ fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>
                          {key === 'number' ? `XXXX-XXXX-${String(section.data[key]).slice(-4)}` : key === 'endDate' ? new Date(section.data[key]).toLocaleDateString('en-IN') : key === 'verified' ? (section.data[key] ? '✅ Yes' : '❌ No') : section.data[key]}
                        </span>
                      </div>
                    ))}
                    
                    {/* Render verificationResult if present (Phase 6) */}
                    {section.title === 'Aadhar Details' && section.data?.verificationResult && (
                      <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: section.data.verificationResult.verdict === 'pass' ? '#EAF5EE' : section.data.verificationResult.verdict === 'reject' ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${section.data.verificationResult.verdict === 'pass' ? '#27AE60' : section.data.verificationResult.verdict === 'reject' ? '#E74C3C' : '#F0C36D'}` }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: section.data.verificationResult.verdict === 'pass' ? '#1A5D3D' : section.data.verificationResult.verdict === 'reject' ? '#C0392B' : '#92400E', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                          <span>🔍 Fraud Verdict: {section.data.verificationResult.verdict.toUpperCase().replace(/_/g, ' ')}</span>
                          <span>Score: {Math.round(section.data.verificationResult.overallConfidence * 100)}%</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-mid)', lineHeight: 1.5 }}>
                          <div>• Checksum: {section.data.verificationResult.checks?.checksumValid ? '✅ Valid' : '❌ Invalid'}</div>
                          <div>• QR Scan: {section.data.verificationResult.checks?.qrCrossCheck === 'match' ? '✅ Match' : section.data.verificationResult.checks?.qrCrossCheck === 'mismatch' ? '⚠️ Mismatch' : '❔ Unreadable'}</div>
                          <div>• OCR: {section.data.verificationResult.checks?.ocrCrossCheck === 'match' ? '✅ Match' : section.data.verificationResult.checks?.ocrCrossCheck === 'mismatch' ? '⚠️ Mismatch' : section.data.verificationResult.checks?.ocrCrossCheck === 'skipped' ? '⏭️ Skipped' : '❔ Unreadable'}</div>
                          <div>• AI Detection Score: {section.data.verificationResult.checks?.aiGeneratedScore?.toFixed(2)} ({section.data.verificationResult.checks?.aiDetectionProvider})</div>
                        </div>
                        {section.data.verificationResult.reasons?.length > 0 && (
                          <div style={{ marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 6 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>Flagged Reasons:</div>
                            {section.data.verificationResult.reasons.map((r, ri) => (
                              <div key={ri} style={{ fontSize: '0.68rem', color: '#C0392B', marginTop: 2 }}>- {r}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {selected.portfolio?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10 }}>📸 Portfolio ({selected.portfolio.length} photos)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {selected.portfolio.slice(0, 4).map((img, i) => (
                        <img key={i} src={img.imageUrl} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8 }} />
                      ))}
                    </div>
                  </div>
                )}

                {filter === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--forest btn--full" disabled={processing === selected._id} onClick={() => approve(selected._id)}>
                      {processing === selected._id ? '...' : '✅ Approve Worker'}
                    </button>
                    <button className="btn btn--full" style={{ background: '#FEF2F2', color: '#E74C3C', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem' }} onClick={() => { setShowReject(selected._id); setSelected(null); }}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showReject && (
        <div className="modal-overlay" onClick={() => setShowReject(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3 style={{ marginBottom: 8 }}>Reject Worker</h3>
            <p style={{ color: 'var(--color-mid)', marginBottom: 20, fontSize: '0.9rem' }}>Provide a clear reason. This will be sent to the worker via email.</p>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Rejection Reason *</label>
              <textarea className="form-textarea" rows={4} placeholder="e.g., Aadhar document is unclear/blurry. Insurance policy has expired. Please resubmit clear documents." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--ghost btn--full" onClick={() => setShowReject(null)}>Cancel</button>
              <button className="btn btn--full btn--lg" style={{ background: '#E74C3C', color: '#fff' }} onClick={() => reject(showReject)} disabled={processing}>
                {processing ? '...' : 'Send Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
