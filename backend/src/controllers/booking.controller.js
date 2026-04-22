const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/email.service');
const cloudinaryService = require('../services/cloudinary.service');

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_your')) {
    return null; // dev mode
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

// POST /api/bookings
const createBooking = async (req, res) => {
  const {
    workerId, skillRequired, description, specialInstructions,
    location, scheduledDate, scheduledTime,
    estimatedDuration = 2,  // hours from frontend
    paymentMethod = 'upi',
  } = req.body;

  if (!workerId || !skillRequired || !scheduledDate) {
    throw new AppError('workerId, skillRequired and scheduledDate are required', 400);
  }

  // Look up by Worker Profile _id (what the frontend URL contains)
  // Also accept userId lookup as fallback
  let workerProfile = await Worker.findById(workerId);
  if (!workerProfile) {
    workerProfile = await Worker.findOne({ userId: workerId });
  }
  if (!workerProfile) throw new AppError('Worker not found', 404);

  // In dev mode allow unverified workers; in prod enforce verified
  if (process.env.NODE_ENV === 'production' && workerProfile.verificationStatus !== 'verified') {
    throw new AppError('Worker is not verified', 404);
  }

  const skill = workerProfile.skills.find((s) => s.skillName === skillRequired);
  const ratePerHour = skill?.ratePerHour || workerProfile.skills[0]?.ratePerHour || 300;

  // estimatedDuration comes in HOURS from the frontend (0.5, 1, 2, etc.)
  const durationHours = Number(estimatedDuration);
  const subtotal = Math.round(ratePerHour * durationHours);
  const platformFeePercent = 15;
  const platformFee = Math.round(subtotal * platformFeePercent / 100);
  const totalAmount = subtotal + platformFee;

  let problemPhotos = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map((f) => cloudinaryService.uploadFile(f.buffer, 'bookings'));
    const uploadResults = await Promise.all(uploadPromises);
    problemPhotos = uploadResults.map(r => r.secure_url);
  }

  // --- Check for time slot collisions ---
  // Extract exact day bounds without strict timezone bleed
  const reqDate = new Date(scheduledDate);
  const startOfDay = new Date(reqDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(reqDate.setHours(23, 59, 59, 999));

  // Find confirmed/active bookings on this exact day
  const activeBookings = await Booking.find({
    workerId: workerProfile.userId,
    status: { $in: ['accepted', 'in_progress'] },
    scheduledDate: { $gte: startOfDay, $lte: endOfDay }
  });

  // Calculate new booking duration in minutes since midnight for perfect comparison
  const [newH, newM] = scheduledTime.split(':').map(Number);
  const newStartMin = newH * 60 + newM;
  const newEndMin = newStartMin + (durationHours * 60);

  const hasCollision = activeBookings.some((b) => {
    const [existH, existM] = b.scheduledTime.split(':').map(Number);
    const existStartMin = existH * 60 + existM;
    const existEndMin = existStartMin + ((b.durationHours || 1) * 60);
    
    // Core collision math: overlap occurs if (Start A < End B) AND (End A > Start B)
    return newStartMin < existEndMin && newEndMin > existStartMin;
  });

  if (hasCollision) {
    throw new AppError('The worker is not available at your time slot. Please try booking some other slot.', 400);
  }
  // --- End Collision Detection ---

  const booking = await Booking.create({
    customerId: req.userId,
    workerId: workerProfile.userId,   // always store the User _id
    workerProfileId: workerProfile._id,
    skillRequired,
    description,
    specialInstructions,
    location,
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
    estimatedDuration: durationHours,
    workerRate: ratePerHour,
    durationHours,
    subtotal,
    platformFeePercent,
    platformFee,
    totalAmount,
    paymentMethod: paymentMethod === 'cash' ? 'cash' : 'upi',
    paymentGateway: paymentMethod === 'cash' ? 'cash' : 'razorpay',
    problemPhotos,
  });

  // Notify worker
  await Notification.create({
    userId: workerProfile.userId,
    type: 'job_request',
    title: 'New Job Request! 🔔',
    message: `New ${skillRequired} job for ${new Date(scheduledDate).toDateString()}`,
    relatedId: booking._id,
    relatedType: 'booking',
    deliveryChannels: { inApp: true },
  });

  const io = req.app.get('io');
  io.to(workerProfile.userId.toString()).emit('job:request', {
    bookingId: booking._id,
    skillRequired,
    scheduledDate,
    totalAmount,
    message: 'New job request received!',
  });

  // Return razorpayOrderId: null in dev so frontend skips payment modal
  res.status(201).json({
    success: true,
    message: 'Booking created',
    data: { booking, razorpayOrderId: null },
  });
};

// POST /api/bookings/create-payment-order
const createPaymentOrder = async (req, res) => {
  const { bookingId } = req.body;
  const booking = await Booking.findOne({ _id: bookingId, customerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);

  const razorpay = getRazorpay();

  // Dev mode: return mock order
  if (!razorpay) {
    return res.json({
      success: true,
      data: {
        orderId: `mock_order_${Date.now()}`,
        amount: booking.totalAmount * 100,
        currency: 'INR',
        key: 'rzp_test_mock',
      },
    });
  }

  const order = await razorpay.orders.create({
    amount: booking.totalAmount * 100, // paise
    currency: 'INR',
    receipt: `wh_${bookingId}`,
    notes: { bookingId: bookingId.toString() },
  });

  booking.razorpayOrderId = order.id;
  booking.paymentStatus = 'pending';
  await booking.save();

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    },
  });
};

// POST /api/bookings/verify-payment
const verifyPayment = async (req, res) => {
  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, method } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, customerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);

  if (method === 'cash') {
    if (booking.paymentMethod !== 'cash') throw new AppError('Invalid payment method', 400);
    booking.status = 'completed';
    booking.paymentStatus = 'completed';
    booking.paidAt = new Date();
    await booking.save();
    
    const io = req.app.get('io');
    io.to(booking.workerId.toString()).emit('payment:received', { bookingId, amount: booking.totalAmount });
    
    return res.json({ success: true, message: 'Cash payment confirmed', data: booking });
  }

  // Dev mode: skip signature verification
  if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_secret') {
    booking.status = 'completed';
    booking.paymentStatus = 'completed';
    booking.razorpayPaymentId = razorpayPaymentId || `mock_pay_${Date.now()}`;
    booking.paidAt = new Date();
    await booking.save();
    return res.json({ success: true, message: 'Payment verified (dev mode)', data: booking });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    booking.paymentStatus = 'failed';
    await booking.save();
    throw new AppError('Payment verification failed', 400, 'PAYMENT_FAILED');
  }

  booking.status = 'completed';
  booking.paymentStatus = 'completed';
  booking.razorpayOrderId = razorpayOrderId;
  booking.razorpayPaymentId = razorpayPaymentId;
  booking.razorpaySignature = razorpaySignature;
  booking.paidAt = new Date();
  await booking.save();

  // Send confirmation email
  const [customer, worker] = await Promise.all([
    User.findById(booking.customerId),
    User.findById(booking.workerId),
  ]);
  await emailService.sendBookingConfirmation(customer, worker, booking);

  const io = req.app.get('io');
  io.to(booking.workerId.toString()).emit('payment:received', { bookingId, amount: booking.totalAmount });

  res.json({ success: true, message: 'Payment verified successfully', data: booking });
};

// PUT /api/bookings/:bookingId/accept
const acceptBooking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, workerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'pending') throw new AppError('Booking is not in pending state', 400);

  booking.status = 'accepted';
  booking.acceptedAt = new Date();
  await booking.save();

  await Notification.create({
    userId: booking.customerId,
    type: 'job_accepted',
    title: 'Worker Accepted Your Request!',
    message: `Your ${booking.skillRequired} job request has been accepted.`,
    relatedId: booking._id,
    relatedType: 'booking',
    deliveryChannels: { inApp: true, email: true },
  });

  const io = req.app.get('io');
  io.to(booking.customerId.toString()).emit('job:accepted', { bookingId: booking._id });

  res.json({ success: true, message: 'Booking accepted', data: booking });
};

// PUT /api/bookings/:bookingId/reject
const rejectBooking = async (req, res) => {
  const { rejectionReason } = req.body;
  const booking = await Booking.findOne({ _id: req.params.bookingId, workerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'pending') throw new AppError('Booking is not in pending state', 400);

  booking.status = 'rejected';
  booking.cancellationReason = rejectionReason || 'Worker is unavailable';
  booking.cancelledBy = 'worker';
  booking.cancelledAt = new Date();
  await booking.save();

  // Find alternative workers with same skill in same city
  const rejectedWorkerProfile = await Worker.findOne({ userId: req.userId });
  const alternativeWorkers = rejectedWorkerProfile
    ? await Worker.find({
        _id: { $ne: rejectedWorkerProfile._id },
        userId: { $ne: req.userId },
        'skills.skillName': booking.skillRequired,
        cityOfOperation: rejectedWorkerProfile.cityOfOperation,
        verificationStatus: process.env.NODE_ENV === 'production' ? 'verified' : { $exists: true },
        isAvailableNow: true,
      })
        .populate('userId', 'name avatar')
        .sort({ overallRating: -1 })
        .limit(5)
    : [];

  // Notify the customer
  await Notification.create({
    userId: booking.customerId,
    type: 'job_rejected',
    title: 'Worker Declined Your Request',
    message: `Your ${booking.skillRequired} request was declined. ${alternativeWorkers.length > 0 ? `${alternativeWorkers.length} similar workers available near you!` : 'Try searching for another worker.'}`,
    relatedId: booking._id,
    relatedType: 'booking',
    deliveryChannels: { inApp: true },
  });

  const io = req.app.get('io');
  io.to(booking.customerId.toString()).emit('job:rejected', {
    bookingId: booking._id,
    skill: booking.skillRequired,
    alternativeWorkers: alternativeWorkers.map(w => ({
      _id: w._id,
      name: w.userId?.name,
      avatar: w.userId?.avatar,
      overallRating: w.overallRating,
      primarySkill: w.primarySkill,
    })),
  });

  res.json({ success: true, message: 'Booking rejected', data: { booking, alternativeWorkers } });
};


// PUT /api/bookings/:bookingId/cancel
const cancelBooking = async (req, res) => {
  const { cancellationReason } = req.body;
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  const isCustomer = booking.customerId.toString() === req.userId.toString();
  const isWorker = booking.workerId.toString() === req.userId.toString();
  if (!isCustomer && !isWorker) throw new AppError('Unauthorized', 403);

  if (['completed', 'cancelled'].includes(booking.status)) {
    throw new AppError('Cannot cancel this booking', 400);
  }

  // Count previous cancellations by this customer
  let cancellationFee = 0;
  if (isCustomer) {
    const prevCancellations = await Booking.countDocuments({
      customerId: req.userId,
      status: 'cancelled',
      cancelledBy: 'customer',
    });
    // First cancellation is free, ₹50 from 2nd onwards
    cancellationFee = prevCancellations === 0 ? 0 : 50;
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = isCustomer ? 'customer' : 'worker';
  booking.cancellationReason = cancellationReason;
  booking.cancellationFee = cancellationFee;
  if (booking.paymentStatus === 'completed') {
    booking.refundStatus = 'pending';
    booking.refundAmount = booking.totalAmount - cancellationFee;
  }
  await booking.save();

  const io = req.app.get('io');
  const notifyId = isCustomer ? booking.workerId : booking.customerId;
  io.to(notifyId.toString()).emit('job:cancelled', { bookingId: booking._id, reason: cancellationReason });

  res.json({ success: true, message: 'Booking cancelled', data: booking });
};

// GET /api/bookings/:bookingId
const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate('customerId', 'name avatar phone')
    .populate('workerId', 'name avatar phone')
    .populate('workerProfileId', 'primarySkill skills overallRating');

  if (!booking) throw new AppError('Booking not found', 404);

  const userId = req.userId.toString();
  if (booking.customerId._id.toString() !== userId && booking.workerId._id.toString() !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  res.json({ success: true, data: booking });
};

// PUT /api/bookings/:bookingId/status
// PUT /api/bookings/:bookingId/arrive (Called by Worker)
const markArrived = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, workerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'accepted') throw new AppError('Booking must be accepted before arriving', 400);

  booking.status = 'arrived';
  booking.arrivedAt = new Date();
  await booking.save();

  const io = req.app.get('io');
  io.to(booking.customerId.toString()).emit('job:arrived', { bookingId: booking._id });

  await Notification.create({
    userId: booking.customerId,
    type: 'worker_arrived',
    title: 'Worker has arrived!',
    message: `Your worker for ${booking.skillRequired} is outside. Please accept them to start the timer.`,
    relatedId: booking._id,
    relatedType: 'booking',
    deliveryChannels: { inApp: true, push: true },
  });

  res.json({ success: true, message: 'Marked as arrived', data: booking });
};

// PUT /api/bookings/:bookingId/start-timer (Called by Customer)
const startTimer = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, customerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'arrived') throw new AppError('Worker has not arrived yet', 400);

  booking.status = 'in_progress';
  booking.startedAt = new Date();
  await booking.save();

  const io = req.app.get('io');
  io.to(booking.workerId.toString()).emit('job:started', { bookingId: booking._id });

  res.json({ success: true, message: 'Timer started. Worker can now begin.', data: booking });
};

// POST /api/bookings/:bookingId/upload-photo (Called by Worker)
const uploadInitialPhoto = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, workerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  
  if (!req.file) throw new AppError('No photo uploaded', 400);
  
  const uploadResult = await cloudinaryService.uploadFile(req.file.buffer, 'bookings');
  booking.initialConditionPhoto = uploadResult.secure_url;
  await booking.save();

  res.json({ success: true, message: 'Initial condition photo saved', data: booking });
};

// PUT /api/bookings/:bookingId/complete-dynamic (Called by Worker)
const completeJobDynamic = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, workerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'in_progress') throw new AppError('Job is not in progress', 400);

  booking.completedAt = new Date();
  
  // Mathematical calculation of dynamic hours
  const elapsedMs = booking.completedAt.getTime() - booking.startedAt.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  // User Requirement: Minimum 1 hour charge
  const durationHoursFinal = Math.max(1, Math.ceil(elapsedHours * 4) / 4); // Round to nearest 15 mins (0.25)
  
  booking.durationHours = durationHoursFinal;
  booking.subtotal = Math.round(booking.workerRate * durationHoursFinal);
  booking.platformFee = Math.round(booking.subtotal * (booking.platformFeePercent / 100));
  booking.totalAmount = booking.subtotal + booking.platformFee;
  booking.status = 'payment_pending';
  
  await booking.save();

  const io = req.app.get('io');
  io.to(booking.customerId.toString()).emit('job:payment_pending', { 
    bookingId: booking._id, 
    totalAmount: booking.totalAmount,
    durationHours: booking.durationHours
  });

  await Notification.create({
    userId: booking.customerId,
    type: 'payment_pending',
    title: 'Job Completed - Payment Required',
    message: `Worker finished in ${durationHoursFinal} hrs. Final bill: ₹${booking.totalAmount}. Please pay now.`,
    relatedId: booking._id,
    relatedType: 'booking',
    deliveryChannels: { inApp: true, push: true },
  });

  res.json({ success: true, message: 'Job completed. Waiting for customer payment.', data: booking });
};

// PUT /api/bookings/:bookingId/acknowledge
const acknowledgePayment = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, workerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  
  if (booking.status !== 'completed') throw new AppError('Job is not completed yet', 400);

  booking.workerAcknowledgedPayment = true;
  await booking.save();

  res.json({ success: true, message: 'Payment acknowledged', data: booking });
};

module.exports = { 
  createBooking, 
  createPaymentOrder, 
  verifyPayment, 
  acceptBooking, 
  rejectBooking, 
  cancelBooking, 
  getBookingById, 
  markArrived, 
  startTimer, 
  uploadInitialPhoto, 
  completeJobDynamic,
  acknowledgePayment
};

