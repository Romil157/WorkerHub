import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

/**
 * Reusable Notification Bell — fetches /api/notifications, shows dropdown, marks as read.
 * Usage: <NotificationBell />
 */
export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    try {
      const res = await api.get('/notifications?limit=15');
      setNotifications(res.data.data?.notifications || res.data.data || []);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const markOne = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(ns => ns.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const ICONS = {
    job_accepted: '✅', job_completed: '🎉', review_received: '⭐',
    verification_approved: '🏅', payment_received: '💰', new_message: '💬',
    cancellation: '❌', default: '🔔',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        style={{ background: 'var(--color-cream)', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bell size={18} color="var(--color-mid)" />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, background: '#E74C3C', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute', right: 0, top: '110%', width: 340, background: '#fff', borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications {unread > 0 && <span style={{ background: '#E74C3C', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.7rem', marginLeft: 6 }}>{unread}</span>}</span>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--color-forest)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-subtle)', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                  No notifications yet
                </div>
              ) : notifications.map(n => (
                <div key={n._id} onClick={() => markOne(n._id)}
                  style={{ padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', background: n.isRead ? '#fff' : 'var(--color-cream)', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 2 }}>{ICONS[n.type] || ICONS.default}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: '0.85rem', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-mid)', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle)', marginTop: 4 }}>
                      {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!n.isRead && <div style={{ width: 8, height: 8, background: 'var(--color-rust)', borderRadius: '50%', flexShrink: 0, marginTop: 6 }} />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
