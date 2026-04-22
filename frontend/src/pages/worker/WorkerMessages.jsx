import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Phone } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { PortalSidebar } from './WorkerDashboard';
import useAuthStore from '../../store/authStore';

const NAV_ITEMS = [
  { path: '/worker/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/worker/orders', icon: '💼', label: 'My Jobs' },
  { path: '/worker/messages', icon: '💬', label: 'Messages' },
  { path: '/worker/profile', icon: '👤', label: 'Profile' },
];

const QUICK_REPLIES = ['On my way!', 'Will be 10 mins late', 'I have arrived', 'Job completed!', 'Can you share more photos?'];

export default function WorkerMessages() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const location = useLocation();

  useEffect(() => {
    api.get('/messages/conversations').then(r => {
      const convs = r.data.data || [];
      const initChatUserId = location.state?.newChatUserId;
      
      if (initChatUserId) {
        // Find existing conversation
        const existing = convs.find(c => {
          const otherId = c.senderId?._id === user?._id ? c.recipientId?._id : c.senderId?._id;
          return String(otherId) === String(initChatUserId);
        });

        if (existing) {
          setConversations(convs);
          setActive(existing);
        } else {
          // Add dummy conversation for UI
          const newChatUser = location.state?.newChatUser;
          const dummyConv = {
            _id: 'draft_' + initChatUserId,
            senderId: user,
            recipientId: { _id: initChatUserId, name: newChatUser?.name || 'Customer', avatar: newChatUser?.avatar },
            text: 'Send your first message...',
            isDraft: true
          };
          setConversations([dummyConv, ...convs]);
          setActive(dummyConv);
        }
      } else {
        setConversations(convs);
        if (convs.length > 0 && !active) setActive(convs[0]);
      }
    }).catch(() => {});
  }, [location.state?.newChatUserId]);

  useEffect(() => {
    if (!active) return;
    if (active.isDraft) { setMessages([]); return; }  // blank slate for new chat
    const otherId = getOtherId(active);
    if (!otherId) return;
    api.get(`/messages/${otherId}`).then(r => { setMessages(r.data.data?.messages || []); }).catch(() => {});
  }, [active]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const getOtherId = (conv) => {
    if (conv?.isDraft) return conv.recipientId?._id;
    if (conv?.senderId?._id === user?._id) return conv.recipientId?._id;
    return conv?.senderId?._id;
  };

  const sendMessage = async (msgText) => {
    const content = msgText || text;
    if (!content.trim() || !active) return;
    const otherId = getOtherId(active);
    if (!otherId) return;
    try {
      const res = await api.post('/messages', { recipientId: otherId, text: content });
      setMessages(m => [...m, res.data.data]);
      setText('');
      // If draft, reload conversations to get the real one
      if (active.isDraft) {
        const r = await api.get('/messages/conversations');
        const convs = r.data.data || [];
        const real = convs.find(c => {
          const id = c.senderId?._id === user?._id ? c.recipientId?._id : c.senderId?._id;
          return String(id) === String(otherId);
        });
        setConversations(convs);
        if (real) setActive(real);
      }
    } catch (e) { console.error(e); }
  };

  const getOther = (conv) => {
    if (conv?.isDraft) return conv.recipientId;
    return conv?.senderId?._id === user?._id ? conv.recipientId : conv.senderId;
  };

  return (
    <div className="portal-layout">
      <PortalSidebar navItems={NAV_ITEMS} title="Worker Portal" />
      <div className="portal-main">
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          {/* Conversation List */}
          <div style={{ width: 300, background: '#fff', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: 0 }}>Messages</h4>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-subtle)', fontSize: '0.85rem' }}>No conversations yet</div>
              ) : conversations.map(conv => {
                const other = getOther(conv);
                return (
                  <div key={conv._id} onClick={() => setActive(conv)}
                    style={{ padding: '16px', display: 'flex', gap: 12, cursor: 'pointer', borderBottom: '1px solid var(--color-border)', background: active?._id === conv._id ? 'var(--color-rust-pale)' : '#fff', transition: 'background 0.2s' }}>
                    <img src={other?.avatar || `https://ui-avatars.com/api/?name=U&background=FAF5F0&color=2C2C2C`} className="avatar avatar--sm" alt="" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{other?.name || 'User'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.text || 'No messages'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Window */}
          {active ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' }}>
              {/* Chat Header */}
              <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={getOther(active)?.avatar || `https://ui-avatars.com/api/?name=U&background=FAF5F0`} className="avatar avatar--sm" alt="" />
                <div>
                  <div style={{ fontWeight: 600 }}>{getOther(active)?.name || 'User'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-forest)', fontWeight: 500 }}>● Online</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.map(msg => {
                  const isMine = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                  return (
                    <div key={msg._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMine ? 'var(--color-rust)' : '#fff',
                        color: isMine ? '#fff' : 'var(--color-charcoal)',
                        fontSize: '0.9rem', boxShadow: 'var(--shadow-sm)',
                      }}>
                        {msg.text}
                        <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {isMine && <span style={{ marginLeft: 4 }}>{msg.isRead ? ' ✓✓' : ' ✓'}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              <div style={{ padding: '8px 20px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
                {QUICK_REPLIES.map(qr => (
                  <button key={qr} onClick={() => sendMessage(qr)}
                    style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: '16px 20px', background: '#fff', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12 }}>
                <input className="form-input" placeholder="Type a message..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  style={{ flex: 1 }} />
                <button className="btn btn--primary btn--icon" onClick={() => sendMessage()}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--color-subtle)' }}>
              <div style={{ fontSize: '4rem' }}>💬</div>
              <p style={{ margin: 0, fontWeight: 500 }}>Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
