import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../../services/api';
import { AdminSidebar } from './AdminDashboard';

const COLORS = ['#D4501D', '#1A5D3D', '#3498DB', '#F39C12', '#8E44AD', '#E74C3C', '#1ABC9C'];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics').then(r => setData(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="portal-layout"><AdminSidebar /><div className="portal-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner spinner--lg" /></div></div>;

  const { skillDemand = [], topWorkers = [], revenueByMonth = [], bookingStatusDist = [] } = data || {};

  return (
    <div className="portal-layout">
      <AdminSidebar />
      <div className="portal-main" style={{ background: '#F8F9FA' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Analytics & Reports</h4>
        </div>

        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Revenue Chart */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid var(--color-border)' }}>
            <h4 style={{ marginBottom: 20 }}>Monthly Revenue & Bookings</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} />
                <Tooltip formatter={(val, name) => [name === 'revenue' ? `₹${val.toLocaleString('en-IN')}` : val, name === 'revenue' ? 'Revenue' : 'Bookings']} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="var(--color-rust)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="bookings" name="Bookings" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Skill Demand */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginBottom: 20 }}>Top Skills by Demand</h4>
              {skillDemand.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={skillDemand.slice(0, 8)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-subtle)' }} />
                    <YAxis dataKey="_id" type="category" tick={{ fontSize: 10, fill: 'var(--color-subtle)' }} width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-forest)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-subtle)', fontSize: '0.85rem' }}>No booking data yet</div>}
            </div>

            {/* Booking Status Distribution */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginBottom: 20 }}>Booking Status Distribution</h4>
              {bookingStatusDist.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={bookingStatusDist} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id}: ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '0.65rem' }}>
                        {bookingStatusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {bookingStatusDist.map((s, i) => <span key={s._id} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />{s._id}: {s.count}</span>)}
                  </div>
                </>
              ) : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-subtle)', fontSize: '0.85rem' }}>No booking data yet</div>}
            </div>
          </div>

          {/* Top Workers */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid var(--color-border)' }}>
            <h4 style={{ marginBottom: 20 }}>Top Earning Workers</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8F9FA' }}>
                    {['Rank', 'Worker', 'Skill', 'Rating', 'Jobs', 'Total Earnings'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-subtle)', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topWorkers.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-subtle)' }}>No worker data yet</td></tr>
                  ) : topWorkers.map((worker, i) => (
                    <tr key={worker._id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: i < 3 ? ['var(--color-gold)', '#C0C0C0', '#CD7F32'][i] : 'var(--color-mid)', fontSize: '1rem' }}>#{i + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <img src={worker.userId?.avatar || `https://ui-avatars.com/api/?name=W&background=D4501D&color=fff`} className="avatar avatar--sm" alt="" />
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{worker.userId?.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-mid)' }}>{worker.primarySkill}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600 }}>⭐ {worker.overallRating}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{worker.totalJobsCompleted}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-rust)' }}>₹{worker.totalEarnings?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
