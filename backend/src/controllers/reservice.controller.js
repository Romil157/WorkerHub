const ReserviceRequest = require('../models/ReserviceRequest');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

const GRACE_WINDOW_HOURS = 48;

/**
 * POST /api/reservice
 * Customer requests a re-service for a completed booking.
 * Business rules:
 *   - Booking must be completed.
 *   - Within 48-hour grace window from completion.
 *   - Max one re-service per booking.
 *   - Goes to the same worker.
 */
const createReserviceRequest = async (req, res) => {
  const { bookingId, reason } = req.body;

  if (!bookingId || !reason) {
    throw new AppError('bookingId and reason are required', 400);
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    customerId: req.userId,
  });

  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'completed') {
    throw new AppError('Re-service is only available for completed bookings', 400);
  }

  // Check grace window
  const completedAt = booking.completedAt || booking.paidAt || booking.updatedAt;
  const graceDeadline = new Date(completedAt.getTime() + GRACE_WINDOW_HOURS * 60 * 60 * 1000);

  if (new Date() > graceDeadline) {
    throw new AppError(
      `Re-service window has expired. Requests must be made within ${GRACE_WINDOW_HOURS} hours of job completion.`,
      400
    );
  }

  // Check max one per booking
  const existing = await ReserviceRequest.findOne({ originalBookingId: bookingId });
  if (existing) {
    throw new AppError('A re-service request already exists for this booking', 400);
  }

  const reserviceRequest = await ReserviceRequest.create({
    originalBookingId: bookingId,
    customerId: req.userId,
    workerId: booking.workerId,
    reason,
    graceDeadline,
  });

  // Link to booking
  booking.reserviceRequestId = reserviceRequest._id;
  await booking.save();

  // Notify worker
  await Notification.create({
    userId: booking.workerId,
    type: 'reservice_request',
    title: 'Re-service Requested',
    message: `Customer has requested a re-service for ${booking.skillRequired}. Reason: ${reason.slice(0, 100)}`,
    relatedId: reserviceRequest._id,
    relatedType: 'reservice',
    deliveryChannels: { inApp: true },
  });

  const io = req.app.get('io');
  io.to(booking.workerId.toString()).emit('reservice:requested', {
    reserviceId: reserviceRequest._id,
    bookingId,
    reason,
  });

  res.status(201).json({
    success: true,
    message: 'Re-service request submitted. The worker will be notified.',
    data: reserviceRequest,
  });
};

/**
 * GET /api/reservice/customer
 * List current customer's re-service requests.
 */
const getCustomerReserviceRequests = async (req, res) => {
  const requests = await ReserviceRequest.find({ customerId: req.userId })
    .populate('originalBookingId', 'skillRequired description scheduledDate totalAmount')
    .populate('workerId', 'name avatar')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
};

/**
 * GET /api/reservice/worker
 * List current worker's incoming re-service requests.
 */
const getWorkerReserviceRequests = async (req, res) => {
  const requests = await ReserviceRequest.find({ workerId: req.userId })
    .populate('originalBookingId', 'skillRequired description scheduledDate totalAmount')
    .populate('customerId', 'name avatar phone')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
};

/**
 * PUT /api/reservice/:id/schedule
 * Worker schedules the re-service visit.
 */
const scheduleReservice = async (req, res) => {
  const { scheduledFor } = req.body;

  if (!scheduledFor) {
    throw new AppError('scheduledFor date is required', 400);
  }

  const request = await ReserviceRequest.findOne({
    _id: req.params.id,
    workerId: req.userId,
  });

  if (!request) throw new AppError('Re-service request not found', 404);
  if (request.status !== 'requested') {
    throw new AppError('This re-service is no longer in requested state', 400);
  }

  request.status = 'scheduled';
  request.scheduledFor = new Date(scheduledFor);
  await request.save();

  // Notify customer
  await Notification.create({
    userId: request.customerId,
    type: 'reservice_scheduled',
    title: 'Re-service Scheduled',
    message: `Your re-service has been scheduled for ${new Date(scheduledFor).toLocaleString()}.`,
    relatedId: request._id,
    relatedType: 'reservice',
    deliveryChannels: { inApp: true },
  });

  const io = req.app.get('io');
  io.to(request.customerId.toString()).emit('reservice:scheduled', {
    reserviceId: request._id,
    scheduledFor,
  });

  res.json({ success: true, message: 'Re-service scheduled', data: request });
};

/**
 * PUT /api/reservice/:id/complete
 * Worker marks re-service as completed.
 */
const completeReservice = async (req, res) => {
  const request = await ReserviceRequest.findOne({
    _id: req.params.id,
    workerId: req.userId,
  });

  if (!request) throw new AppError('Re-service request not found', 404);
  if (request.status !== 'scheduled') {
    throw new AppError('Re-service must be scheduled before completing', 400);
  }

  request.status = 'completed';
  request.completedAt = new Date();
  await request.save();

  // Notify customer
  await Notification.create({
    userId: request.customerId,
    type: 'reservice_completed',
    title: 'Re-service Completed',
    message: 'Your re-service has been completed. We hope everything is in order now.',
    relatedId: request._id,
    relatedType: 'reservice',
    deliveryChannels: { inApp: true },
  });

  const io = req.app.get('io');
  io.to(request.customerId.toString()).emit('reservice:completed', {
    reserviceId: request._id,
  });

  res.json({ success: true, message: 'Re-service marked as complete', data: request });
};

module.exports = {
  createReserviceRequest,
  getCustomerReserviceRequests,
  getWorkerReserviceRequests,
  scheduleReservice,
  completeReservice,
};
