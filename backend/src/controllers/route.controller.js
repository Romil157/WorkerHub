const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const routeService = require('../services/routeOptimization.service');

/**
 * GET /api/workers/route
 * Returns an optimized visiting order for the worker's accepted/arrived bookings on a given day.
 *
 * Query params:
 *   lat  - worker's current latitude (required)
 *   lng  - worker's current longitude (required)
 *   date - ISO date string (optional, defaults to today)
 */
const getRoute = async (req, res) => {
  const { lat, lng, date } = req.query;

  if (!lat || !lng) {
    throw new AppError('lat and lng query params are required', 400);
  }

  const workerLocation = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
  };

  // Determine date range
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch accepted/arrived bookings for this worker on the target day
  const bookings = await Booking.find({
    workerId: req.userId,
    status: { $in: ['accepted', 'arrived'] },
    scheduledDate: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate('customerId', 'name avatar phone')
    .sort({ scheduledTime: 1 });

  if (bookings.length === 0) {
    return res.json({
      success: true,
      data: {
        stops: [],
        polyline: null,
        totalDistanceKm: 0,
        totalDurationMin: 0,
        message: 'No accepted jobs for today.',
      },
    });
  }

  // If only one booking, no optimization needed
  if (bookings.length === 1) {
    const b = bookings[0];
    const coords = b.location?.coordinates || {};
    const dist = routeService.haversineKm(
      workerLocation.lat, workerLocation.lng,
      coords.lat || 0, coords.lng || 0
    );
    const roadDist = dist * 1.4;
    const durMin = Math.round((roadDist / 25) * 60);

    return res.json({
      success: true,
      data: {
        stops: [{
          bookingId: b._id,
          order: 1,
          address: b.location?.address || '',
          lat: coords.lat || 0,
          lng: coords.lng || 0,
          scheduledTime: b.scheduledTime,
          skillRequired: b.skillRequired,
          customerName: b.customerId?.name || '',
          customerAvatar: b.customerId?.avatar || '',
          estimatedArrivalMin: durMin,
          distanceKm: Math.round(roadDist * 10) / 10,
          durationMin: durMin,
          status: b.status,
        }],
        polyline: null,
        totalDistanceKm: Math.round(roadDist * 10) / 10,
        totalDurationMin: durMin,
      },
    });
  }

  // Compute optimized route
  const result = await routeService.computeRoute(workerLocation, bookings);

  // Enrich stops with customer data
  const bookingMap = {};
  bookings.forEach((b) => {
    bookingMap[b._id.toString()] = b;
  });

  result.stops = result.stops.map((stop) => {
    const b = bookingMap[stop.bookingId];
    return {
      ...stop,
      customerName: b?.customerId?.name || '',
      customerAvatar: b?.customerId?.avatar || '',
      status: b?.status || '',
    };
  });

  res.json({ success: true, data: result });
};

module.exports = { getRoute };
