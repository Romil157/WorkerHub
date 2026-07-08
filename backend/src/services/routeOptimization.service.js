/**
 * Route Optimization Service
 *
 * Computes an efficient visiting order for a worker's accepted same-day bookings
 * using a nearest-neighbor greedy heuristic.
 *
 * Algorithm: start from the worker's current location, pick the closest unvisited
 * stop (by Haversine distance), repeat until all stops are visited.
 *
 * Future upgrade: if stop counts regularly exceed 10, consider implementing
 * 2-opt local search or an exact TSP solver (e.g. branch-and-bound or OR-Tools).
 * For realistic daily volumes (<10 stops), nearest-neighbor is fast and produces
 * routes within ~25% of optimal on average.
 *
 * Directions: calls OpenRouteService Directions API to get turn-by-turn polyline,
 * per-leg distances, and durations. Falls back to straight-line estimates if no
 * ORS key is configured.
 */

const https = require('https');
const http = require('http');

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;

/**
 * Haversine distance between two lat/lng points, in kilometers.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Nearest-neighbor heuristic ordering.
 * @param {{lat: number, lng: number}} origin - worker's current location
 * @param {Array<{id: string, lat: number, lng: number}>} stops
 * @returns {Array} stops reordered by nearest-neighbor from origin
 */
function nearestNeighborOrder(origin, stops) {
  if (stops.length <= 1) return [...stops];

  const ordered = [];
  const remaining = [...stops];
  let current = { lat: origin.lat, lng: origin.lng };

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const picked = remaining.splice(nearestIdx, 1)[0];
    ordered.push(picked);
    current = { lat: picked.lat, lng: picked.lng };
  }

  return ordered;
}

/**
 * Call OpenRouteService Directions API.
 * @param {Array<[number, number]>} coordinates - array of [lng, lat] pairs (ORS uses lng,lat order)
 * @returns {Promise<{legs: Array, geometry: string}>}
 */
function fetchORSDirections(coordinates) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      coordinates,
      instructions: false,
      geometry: true,
      format: 'json',
    });

    const options = {
      hostname: 'api.openrouteservice.org',
      path: '/v2/directions/driving-car/json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ORS_API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`ORS API error: ${parsed.error.message || JSON.stringify(parsed.error)}`));
            return;
          }
          if (!parsed.routes || parsed.routes.length === 0) {
            reject(new Error('ORS returned no routes'));
            return;
          }
          const route = parsed.routes[0];
          resolve({
            legs: route.segments || [],
            geometry: route.geometry || '',
            totalDistance: route.summary?.distance || 0, // meters
            totalDuration: route.summary?.duration || 0, // seconds
          });
        } catch (e) {
          reject(new Error(`Failed to parse ORS response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Main entry point: compute an optimized route for a worker's bookings.
 *
 * @param {{lat: number, lng: number}} workerLocation
 * @param {Array<Object>} bookings - Mongoose booking documents with location.coordinates
 * @returns {Promise<{stops: Array, polyline: string, totalDistanceKm: number, totalDurationMin: number}>}
 */
async function computeRoute(workerLocation, bookings) {
  // Build stop list from bookings
  const stops = bookings.map((b) => {
    const coords = b.location?.coordinates || {};
    return {
      id: b._id.toString(),
      lat: coords.lat || 0,
      lng: coords.lng || 0,
      address: b.location?.address || '',
      scheduledTime: b.scheduledTime || '',
      skillRequired: b.skillRequired || '',
      customerName: '', // populated after ordering
      booking: b,
    };
  });

  // Order by nearest-neighbor heuristic
  const ordered = nearestNeighborOrder(workerLocation, stops);

  // Try to get real directions from ORS
  if (ORS_API_KEY && ORS_API_KEY !== 'your_ors_api_key') {
    try {
      // ORS expects [lng, lat] coordinate pairs
      const coordinates = [
        [workerLocation.lng, workerLocation.lat],
        ...ordered.map((s) => [s.lng, s.lat]),
      ];

      const directions = await fetchORSDirections(coordinates);

      // Build stop details with leg-level data
      let cumulativeMin = 0;
      const enrichedStops = ordered.map((stop, idx) => {
        const leg = directions.legs[idx] || {};
        const legDistKm = (leg.distance || 0) / 1000;
        const legDurMin = (leg.duration || 0) / 60;
        cumulativeMin += legDurMin;

        return {
          bookingId: stop.id,
          order: idx + 1,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          scheduledTime: stop.scheduledTime,
          skillRequired: stop.skillRequired,
          estimatedArrivalMin: Math.round(cumulativeMin),
          distanceKm: Math.round(legDistKm * 10) / 10,
          durationMin: Math.round(legDurMin),
        };
      });

      return {
        stops: enrichedStops,
        polyline: directions.geometry,
        totalDistanceKm: Math.round((directions.totalDistance / 1000) * 10) / 10,
        totalDurationMin: Math.round(directions.totalDuration / 60),
      };
    } catch (err) {
      // Fall through to offline estimation if ORS fails
      console.warn('ORS directions call failed, using offline estimates:', err.message);
    }
  }

  // Offline fallback: straight-line distance estimates
  // Assume average urban speed of 25 km/h for time estimates
  const AVG_SPEED_KMH = 25;
  let totalDist = 0;
  let cumulativeMin = 0;
  let prevLat = workerLocation.lat;
  let prevLng = workerLocation.lng;

  const fallbackStops = ordered.map((stop, idx) => {
    const legDist = haversineKm(prevLat, prevLng, stop.lat, stop.lng);
    // Multiply straight-line by 1.4 to approximate road distance
    const roadDist = legDist * 1.4;
    const legMin = (roadDist / AVG_SPEED_KMH) * 60;
    totalDist += roadDist;
    cumulativeMin += legMin;
    prevLat = stop.lat;
    prevLng = stop.lng;

    return {
      bookingId: stop.id,
      order: idx + 1,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      scheduledTime: stop.scheduledTime,
      skillRequired: stop.skillRequired,
      estimatedArrivalMin: Math.round(cumulativeMin),
      distanceKm: Math.round(roadDist * 10) / 10,
      durationMin: Math.round(legMin),
    };
  });

  return {
    stops: fallbackStops,
    polyline: null,
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    totalDurationMin: Math.round(cumulativeMin),
  };
}

module.exports = { computeRoute, haversineKm, nearestNeighborOrder };
