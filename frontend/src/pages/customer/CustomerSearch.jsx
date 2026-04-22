import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Star, MapPin, Shield, LayoutDashboard, ChevronLeft } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const SKILLS = [
  'Plumbing', 'Electrical Work', 'Carpentry', 'Painting', 'AC Repair', 
  'House Cleaning', 'Pest Control', 'Gardening', 'Home Appliance Repair', 
  'Welding', 'Babysitting', 'Maid & Cooking', 'Dog Walking', 'Tutor', 
  'Driver', 'Beautician', 'Yoga Instructor'
];

export default function CustomerSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    skill: searchParams.get('skill') || '',
    city: user?.city || searchParams.get('city') || '',
    minRating: 0,
    maxRate: 2000,
    available: false,
    sortBy: 'rating',
  });
  const [showFilters, setShowFilters] = useState(false);

  // The city this customer is restricted to (from auth store)
  const customerCity = user?.city || '';
  const isLoggedIn = !!token && !!user;

  const search = async (p = 1) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: p, limit: 12, sortBy: filters.sortBy });
      if (filters.skill) q.set('skill', filters.skill);
      if (filters.minRating > 0) q.set('minRating', filters.minRating);
      if (filters.maxRate < 2000) q.set('maxRate', filters.maxRate);
      if (filters.available) q.set('available', 'true');
      // Explicitly send city from filters (which inherits from profile if locked)
      if (filters.city) q.set('city', filters.city);
      const res = await api.get(`/customers/search?${q}`);
      setWorkers(p === 1 ? res.data.data.workers : [...workers, ...res.data.data.workers]);
      setTotal(res.data.data.total);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { search(1); }, [filters, customerCity]);

  const WorkerCard = ({ worker }) => (
    <Link to={`/customer/worker/${worker._id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}
        style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={worker.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.userId?.name || 'W')}&background=D4501D&color=fff&size=400&bold=true`}
            alt={worker.userId?.name}
            style={{ width: '100%', height: 180, objectFit: 'cover', background: '#f0ede8' }}
            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.userId?.name || 'W')}&background=D4501D&color=fff&size=400&bold=true`; }}
          />
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
            {worker.isAvailableNow && (
              <span style={{ background: 'var(--color-forest)', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>🟢 Available</span>
            )}
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-charcoal)' }}>{worker.userId?.name || 'Unknown Worker'}</h5>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-charcoal)', flexShrink: 0 }}>
              <Star size={14} fill="var(--color-gold)" color="var(--color-gold)" />
              {worker.overallRating}
              <span style={{ fontWeight: 400, color: 'var(--color-subtle)', fontSize: '0.8rem' }}>({worker.totalReviews})</span>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-mid)', marginBottom: 12 }}>
            {worker.primarySkill} • {worker.yearsExperience} yrs exp
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <span style={{ background: '#FEF9E7', color: '#7D6608', padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>✓ Verified</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#EBF5FB', color: '#2471A3', padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>
              <Shield size={9} /> Aadhar
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--color-subtle)' }}>
              <MapPin size={12} /> {worker.cityOfOperation}
            </div>
            <span style={{ fontWeight: 800, color: 'var(--color-rust)', fontSize: '0.95rem' }}>
              ₹{worker.skills?.[0]?.ratePerHour || 300}/hr
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>

      {/* Sticky Top Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* City restriction banner */}
        {isLoggedIn && customerCity && (
          <div style={{ background: 'linear-gradient(90deg, var(--color-forest), #2E86AB)', color: '#fff', padding: '6px 24px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={13} />
            Showing workers in <strong style={{ marginLeft: 4 }}>{customerCity}</strong> — Workers outside your city are hidden
          </div>
        )}

        <div style={{ padding: '12px 24px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Back to Dashboard button */}
            {isLoggedIn ? (
              <button
                onClick={() => navigate('/customer/dashboard')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: '#fff', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem',
                  color: 'var(--color-forest)', flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--color-forest-pale)'}
                onMouseOut={e => e.currentTarget.style.background = '#fff'}
              >
                <ChevronLeft size={15} />
                <LayoutDashboard size={15} />
                Dashboard
              </button>
            ) : (
              <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-dark)', flexShrink: 0, textDecoration: 'none' }}>
                WorkerHub
              </Link>
            )}

            {/* Filters */}
            <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select
                className="form-select"
                value={filters.skill}
                onChange={e => setFilters(f => ({ ...f, skill: e.target.value }))}
                style={{ maxWidth: 220 }}
              >
                <option value="">All Skills</option>
                {SKILLS.map(s => <option key={s}>{s}</option>)}
              </select>

              <select
                className="form-select"
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                style={{ maxWidth: 160 }}
                disabled={isLoggedIn && !!customerCity} // Lock if logged in and profile has city
              >
                <option value="">All Cities</option>
                {customerCity && <option value={customerCity}>{customerCity} (Your City)</option>}
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Pune">Pune</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="zyx">zyx</option>
              </select>

              <select
                className="form-select"
                value={filters.sortBy}
                onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                style={{ maxWidth: 160 }}
              >
                <option value="rating">Sort: Rating</option>
                <option value="reviews">Sort: Reviews</option>
                <option value="jobs">Sort: Jobs Done</option>
              </select>

              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setShowFilters(!showFilters)}
                style={{ border: showFilters ? '1px solid var(--color-rust)' : undefined, color: showFilters ? 'var(--color-rust)' : undefined }}
              >
                <SlidersHorizontal size={16} /> Filters {showFilters ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 28, paddingBottom: 64 }}>
        <div style={{ display: 'flex', gap: 24 }}>

          {/* Filter Sidebar */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div className="card">
                <div className="flex-between" style={{ marginBottom: 20 }}>
                  <h5 style={{ margin: 0 }}>Filters</h5>
                  <button
                    onClick={() => setFilters({ skill: '', minRating: 0, maxRate: 2000, available: false, sortBy: 'rating' })}
                    style={{ fontSize: '0.8rem', color: 'var(--color-rust)', cursor: 'pointer', background: 'none', border: 'none' }}
                  >Reset All</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10 }}>Min Rating</div>
                    {[0, 3, 4, 4.5].map(r => (
                      <label key={r} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="radio" name="rating" checked={filters.minRating === r} onChange={() => setFilters(f => ({ ...f, minRating: r }))} style={{ accentColor: 'var(--color-rust)' }} />
                        {r === 0 ? 'All ratings' : `${r}+ ⭐`}
                      </label>
                    ))}
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10 }}>Max Rate: ₹{filters.maxRate}/hr</div>
                    <input type="range" min={100} max={2000} step={50} value={filters.maxRate}
                      onChange={e => setFilters(f => ({ ...f, maxRate: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--color-rust)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-subtle)' }}>
                      <span>₹100</span><span>₹2000</span>
                    </div>
                  </div>

                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                    <input type="checkbox" checked={filters.available}
                      onChange={e => setFilters(f => ({ ...f, available: e.target.checked }))}
                      style={{ accentColor: 'var(--color-forest)', width: 16, height: 16 }} />
                    🟢 Available Now
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Worker Grid */}
          <div style={{ flex: 1 }}>
            {!filters.skill ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                 <h2 style={{ fontSize: '2.2rem', marginBottom: 12, color: 'var(--color-charcoal)' }}>What do you need help with? 👋</h2>
                 <p style={{ color: 'var(--color-mid)', marginBottom: 40, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 40px' }}>
                   Select a service category below to find top-rated, verified professionals {customerCity ? `in ${customerCity}` : 'near you'}.
                 </p>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                    {SKILLS.map(s => (
                       <motion.div key={s} whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', borderColor: 'var(--color-rust)' }} onClick={() => setFilters(f => ({ ...f, skill: s }))}
                        style={{ background: '#fff', borderRadius: 16, padding: '24px 16px', cursor: 'pointer', border: '1px solid var(--color-border)', textAlign: 'center', transition: 'all 0.2s' }}>
                          <h4 style={{ margin: 0, color: 'var(--color-forest)', fontSize: '1rem' }}>{s}</h4>
                       </motion.div>
                    ))}
                 </div>
              </div>
            ) : (
              <>
                <div className="flex-between" style={{ marginBottom: 20 }}>
                  <p style={{ color: 'var(--color-mid)', margin: 0, fontSize: '0.9rem' }}>
                    {loading ? 'Searching...' : (
                      <>
                        Found <strong>{total}</strong> verified workers
                        {filters.skill ? ` for "${filters.skill}"` : ''}
                        {filters.city ? ` in ${filters.city}` : ''}
                      </>
                    )}
                  </p>
                  <button className="btn btn--sm btn--ghost" onClick={() => setFilters(f => ({ ...f, skill: '' }))} style={{ fontSize: '0.8rem' }}>
                    ← Change Category
                  </button>
                </div>

                {/* Skeleton loading */}
                {loading && workers.length === 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <div style={{ height: 180, background: 'linear-gradient(90deg, #f0ede8 25%, #e8e4df 50%, #f0ede8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                        <div style={{ padding: 16 }}>
                          <div style={{ height: 16, background: 'var(--color-border)', borderRadius: 4, marginBottom: 8, width: '70%' }} />
                          <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 4, width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>

            /* Empty state */
            ) : workers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-subtle)' }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔍</div>
                <h3>No workers found{customerCity ? ` in ${customerCity}` : ''}</h3>
                <p style={{ maxWidth: 380, margin: '0 auto 24px', color: 'var(--color-mid)' }}>
                  {customerCity
                    ? `We couldn't find verified workers in ${customerCity} matching your filters. Try adjusting the skill or filters.`
                    : 'Try adjusting your filters or search for a different skill.'}
                </p>
                <button
                  className="btn btn--primary"
                  onClick={() => setFilters({ skill: '', minRating: 0, maxRate: 2000, available: false, sortBy: 'rating' })}
                >Reset Filters</button>
              </div>

            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                  {workers.map((w, i) => (
                    <motion.div key={w._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <WorkerCard worker={w} />
                    </motion.div>
                  ))}
                </div>

                {workers.length < total && (
                  <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <button className="btn btn--secondary btn--lg" onClick={() => search(page + 1)} disabled={loading}>
                      {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Load More Workers'}
                    </button>
                  </div>
                )}
              </>
            )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
