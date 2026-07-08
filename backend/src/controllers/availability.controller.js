const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/customers/workers/:workerId/availability
 * Returns the worker's availability calendar and their booked slots for a given date range.
 * Used by the customer booking page to show open time slots.
 *
 * Query params:
 *   from - ISO date string (optional, defaults to today)
 *   to   - ISO date string (optional, defaults to 14 days from now)
 */
const getWorkerAvailability = async (req, res) => {
  const { workerId } = req.params;

  const worker = await Worker.findById(workerId).select('availabilityCalendar isAvailableNow');
  if (!worker) {
    throw new AppError('Worker not found', 404);
  }

  // Date range for checking existing bookings
  const from = req.query.from ? new Date(req.query.from) : new Date();
  from.setHours(0, 0, 0, 0);
  const to = req.query.to ? new Date(req.query.to) : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
  to.setHours(23, 59, 59, 999);

  // Get the worker's userId to look up bookings
  const workerDoc = await Worker.findById(workerId).select('userId');
  if (!workerDoc) throw new AppError('Worker not found', 404);

  // Fetch existing bookings in the date range to find busy slots
  const existingBookings = await Booking.find({
    workerId: workerDoc.userId,
    status: { $in: ['pending', 'accepted', 'arrived', 'in_progress'] },
    scheduledDate: { $gte: from, $lte: to },
  }).select('scheduledDate scheduledTime durationHours status');

  // Build busy slots array
  const busySlots = existingBookings.map((b) => ({
    date: b.scheduledDate,
    time: b.scheduledTime,
    durationHours: b.durationHours || 1,
    status: b.status,
  }));

  res.json({
    success: true,
    data: {
      availabilityCalendar: worker.availabilityCalendar || [],
      isAvailableNow: worker.isAvailableNow,
      busySlots,
      dateRange: { from, to },
    },
  });
};

module.exports = { getWorkerAvailability };
