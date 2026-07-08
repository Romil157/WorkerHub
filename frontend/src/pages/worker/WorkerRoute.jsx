import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Navigation, Clock, ChevronRight, AlertCircle,
  Briefcase, LayoutDashboard, MessageSquare, User, Wrench, Route as RouteIcon,
  Phone, ArrowRight, Loader2,
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { PortalSidebar } from './WorkerDashboard';
import { getCurrentCity } from '../../services/geolocation';

const NAV_ITEMS = [
  { path: '/worker/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { path: '/worker/orders', icon: <Briefcase size={18} />, label: 'My Jobs' },
  { path: '/worker/route', icon: <Navigation size={18} />, label: 'My Route' },
  { path: '/worker/messages', icon: <MessageSquare size={18} />, label: 'Messages' },
  { path: '/worker/profile', icon: <User size={18} />, label: 'Profile' },
];

export default function WorkerRoute() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    fetchRoute();
  }, []);

  useEffect(() => {
    if (routeData && routeData.stops.length > 0) {
      initMap();
    }
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [routeData]);

  const fetchRoute = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get worker's current location
      let lat = 19.076;
      let lng = 72.8777;
      try {
        const geo = await getCurrentCity();
        lat = geo.lat;
        lng = geo.lng;
      } catch {
        // Use default Mumbai coordinates if geolocation fails
      }

      const { data } = await api.get('/workers/route', {
        params: { lat, lng },
      });

      if (data.success) {
        setRouteData(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  const initMap = () => {
    if (!mapRef.current || !window.L) return;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const L = window.L;
    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    const bounds = [];

    // Add numbered markers for each stop
    routeData.stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;

      const markerIcon = L.divIcon({
        className: 'route-marker-icon',
        html: `<div style="
          width: 32px; height: 32px;
          background: ${idx === 0 ? 'var(--color-rust, #D4501D)' : 'var(--color-forest, #1E3A8A)'};
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          font-family: Poppins, sans-serif;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${stop.order}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Poppins, sans-serif; min-width: 180px;">
            <strong style="font-size: 14px;">Stop ${stop.order}</strong><br/>
            <span style="color: #555; font-size: 12px;">${stop.skillRequired}</span><br/>
            <span style="font-size: 12px;">${stop.address}</span><br/>
            <span style="color: #1E3A8A; font-weight: 600; font-size: 12px;">
              ETA: ~${stop.estimatedArrivalMin} min | ${stop.distanceKm} km
            </span>
          </div>
        `);

      markersRef.current.push(marker);
      bounds.push([stop.lat, stop.lng]);
    });

    // Draw polyline if available (encoded ORS geometry)
    if (routeData.polyline) {
      try {
        // ORS returns encoded polyline -- decode it
        const decoded = decodePolyline(routeData.polyline);
        if (decoded.length > 0) {
          L.polyline(decoded, {
            color: '#1E3A8A',
            weight: 4,
            opacity: 0.8,
            dashArray: null,
          }).addTo(map);
        }
      } catch {
        // If polyline decoding fails, draw straight lines between stops
        drawStraightLines(L, map, routeData.stops);
      }
    } else {
      // No polyline from API -- draw straight dashed lines between stops
      drawStraightLines(L, map, routeData.stops);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const drawStraightLines = (L, map, stops) => {
    const coords = stops
      .filter((s) => s.lat && s.lng)
      .map((s) => [s.lat, s.lng]);
    if (coords.length > 1) {
      L.polyline(coords, {
        color: '#1E3A8A',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8',
      }).addTo(map);
    }
  };

  // Decode Google/ORS encoded polyline format
  const decodePolyline = (encoded) => {
    const coords = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
  };

  const highlightStop = (stop) => {
    setSelectedStop(stop.bookingId);
    if (mapInstance.current && stop.lat && stop.lng) {
      mapInstance.current.setView([stop.lat, stop.lng], 15, { animate: true });
      const marker = markersRef.current[stop.order - 1];
      if (marker) marker.openPopup();
    }
  };

  const formatETA = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  // -- Render --

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-cream)' }}>
      <PortalSidebar navItems={NAV_ITEMS} title="Worker Portal" color="var(--color-rust)" />

      <main style={{ flex: 1, marginLeft: 260, padding: '24px 32px' }} className="portal-main">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-dark)', marginBottom: 4 }}>
              My Route Today
            </h1>
            <p style={{ color: 'var(--color-subtle)', fontSize: '0.85rem' }}>
              Optimized visiting order for your accepted jobs
            </p>
          </div>
          <button
            onClick={fetchRoute}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', background: 'var(--color-rust)', color: '#fff',
              borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.85rem',
              transition: 'var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-rust-dark)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-rust)')}
          >
            <Navigation size={16} /> Refresh Route
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              <Loader2 size={36} color="var(--color-rust)" />
            </motion.div>
            <p style={{ marginTop: 16, color: 'var(--color-subtle)', fontSize: '0.9rem' }}>
              Computing your optimized route...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#FDF0EB', border: '1px solid var(--color-rust-light)',
            borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex',
            alignItems: 'center', gap: 10,
          }}>
            <AlertCircle size={20} color="var(--color-rust)" />
            <span style={{ color: 'var(--color-rust-dark)', fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && routeData && routeData.stops.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center', padding: '60px 40px',
              background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Navigation size={48} color="var(--color-border)" strokeWidth={1.5} />
            <h3 style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-dark)' }}>
              No Jobs Scheduled for Today
            </h3>
            <p style={{ marginTop: 8, color: 'var(--color-subtle)', fontSize: '0.85rem', maxWidth: 400, margin: '8px auto 20px' }}>
              Accept some job requests and they will appear here with an optimized route.
            </p>
            <Link
              to="/worker/orders"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 24px', background: 'var(--color-forest)', color: '#fff',
                borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              <Briefcase size={16} /> View My Jobs
            </Link>
          </motion.div>
        )}

        {/* Route Content */}
        {!loading && !error && routeData && routeData.stops.length > 0 && (
          <>
            {/* Summary Bar */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap',
              }}
            >
              {[
                { label: 'Total Stops', value: routeData.stops.length, icon: <MapPin size={18} /> },
                { label: 'Total Distance', value: `${routeData.totalDistanceKm} km`, icon: <Navigation size={18} /> },
                { label: 'Est. Travel Time', value: formatETA(routeData.totalDurationMin), icon: <Clock size={18} /> },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    flex: '1 1 180px', background: 'var(--color-white)', borderRadius: 'var(--radius-md)',
                    padding: '16px 20px', border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-forest-pale)', color: 'var(--color-forest)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {stat.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', fontWeight: 500 }}>{stat.label}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-dark)' }}>{stat.value}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Map + Stop List */}
            <div style={{ display: 'flex', gap: 20, minHeight: 500 }} className="route-layout">
              {/* Stop List */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  width: 380, flexShrink: 0, background: 'var(--color-white)',
                  borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}
                className="route-stop-list"
              >
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-forest)', color: '#fff',
                }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Optimized Stop Order</h3>
                  <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 2 }}>
                    Nearest-neighbor routing -- tap a stop to view on map
                  </p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                  {routeData.stops.map((stop, idx) => (
                    <motion.div
                      key={stop.bookingId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => highlightStop(stop)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '14px 20px', cursor: 'pointer',
                        borderBottom: idx < routeData.stops.length - 1 ? '1px solid var(--color-border)' : 'none',
                        background: selectedStop === stop.bookingId ? 'var(--color-forest-pale)' : 'transparent',
                        transition: 'var(--transition-fast)',
                      }}
                      onMouseOver={(e) => {
                        if (selectedStop !== stop.bookingId) e.currentTarget.style.background = '#f8f6f3';
                      }}
                      onMouseOut={(e) => {
                        if (selectedStop !== stop.bookingId) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Number Badge */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: idx === 0 ? 'var(--color-rust)' : 'var(--color-forest)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem',
                      }}>
                        {stop.order}
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-dark)' }}>
                            {stop.skillRequired}
                          </span>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: stop.status === 'arrived' ? '#E8F5E9' : '#EFF6FF',
                            color: stop.status === 'arrived' ? 'var(--color-verified)' : 'var(--color-forest)',
                          }}>
                            {stop.status}
                          </span>
                        </div>

                        {stop.customerName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            {stop.customerAvatar && (
                              <img
                                src={stop.customerAvatar}
                                alt=""
                                style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            )}
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-mid)' }}>
                              {stop.customerName}
                            </span>
                          </div>
                        )}

                        <div style={{
                          fontSize: '0.75rem', color: 'var(--color-subtle)', marginTop: 4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          <MapPin size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />
                          {stop.address || 'Address not available'}
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-forest)', fontWeight: 600 }}>
                            <Clock size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />
                            {stop.scheduledTime || '--:--'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-mid)' }}>
                            {stop.distanceKm} km
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-mid)' }}>
                            ~{stop.durationMin} min drive
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={16} color="var(--color-subtle)" style={{ flexShrink: 0, marginTop: 8 }} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Map Container */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)',
                  minHeight: 500,
                }}
                className="route-map-container"
              >
                <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 500 }} id="route-map" />
              </motion.div>
            </div>
          </>
        )}
      </main>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .portal-main { margin-left: 0 !important; padding: 16px !important; }
          .route-layout { flex-direction: column !important; }
          .route-stop-list { width: 100% !important; max-height: 350px; }
          .route-map-container { min-height: 350px !important; }
        }
        .leaflet-container { font-family: Poppins, sans-serif !important; }
      `}</style>
    </div>
  );
}
