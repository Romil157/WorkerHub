const User = require('../models/User');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const cloudinaryService = require('../services/cloudinary.service');
const aiDetection = require('../services/aiDetection.service');
const emailService = require('../services/email.service');

// GET /api/workers/profile
const getProfile = async (req, res) => {
  const worker = await Worker.findOne({ userId: req.userId }).populate('userId', '-passwordHash -refreshToken');
  if (!worker) throw new AppError('Worker profile not found', 404);
  res.json({ success: true, data: worker });
};

// PUT /api/workers/profile
const updateProfile = async (req, res) => {
  const { bio, primarySkill, cityOfOperation, yearsExperience, skills, bankDetails } = req.body;
  const updates = {};
  if (bio !== undefined) updates.bio = bio;
  if (primarySkill !== undefined) updates.primarySkill = primarySkill;
  if (cityOfOperation !== undefined) updates.cityOfOperation = cityOfOperation;
  if (yearsExperience !== undefined) updates.yearsExperience = yearsExperience;
  if (skills !== undefined) updates.skills = skills;
  if (bankDetails !== undefined) updates.bankDetails = bankDetails;

  const worker = await Worker.findOneAndUpdate({ userId: req.userId }, { $set: updates }, { new: true });
  res.json({ success: true, message: 'Profile updated', data: worker });
};

// GET /api/workers/dashboard
const getDashboard = async (req, res) => {
  const worker = await Worker.findOne({ userId: req.userId });
  if (!worker) throw new AppError('Worker not found', 404);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [upcomingJobs, recentReviews, todayEarnings, monthEarnings] = await Promise.all([
    Booking.find({ workerId: req.userId, status: { $in: ['pending', 'accepted'] }, scheduledDate: { $gte: today } })
      .populate('customerId', 'name avatar')
      .sort({ scheduledDate: 1 })
      .limit(5),
    Review.find({ reviewedId: req.userId })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5),
    Booking.aggregate([
      { $match: { workerId: req.userId, status: 'completed', completedAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$subtotal' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { workerId: req.userId, status: 'completed', completedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$subtotal' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      worker,
      stats: {
        todayEarnings: todayEarnings[0]?.total || 0,
        todayJobs: todayEarnings[0]?.count || 0,
        monthEarnings: monthEarnings[0]?.total || 0,
        monthJobs: monthEarnings[0]?.count || 0,
        totalEarnings: worker.totalEarnings,
        totalJobs: worker.totalJobsCompleted,
        rating: worker.overallRating,
        reviews: worker.totalReviews,
        completionRate: worker.completionRate,
      },
      upcomingJobs,
      recentReviews,
    },
  });
};

// GET /api/workers/earnings
const getEarnings = async (req, res) => {
  const { period = 'week' } = req.query;
  let startDate = new Date();
  if (period === 'today') startDate.setHours(0, 0, 0, 0);
  else if (period === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (period === 'month') startDate.setDate(startDate.getDate() - 30);
  else if (req.query.startDate) startDate = new Date(req.query.startDate);

  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

  const earnings = await Booking.aggregate([
    { $match: { workerId: req.userId, status: 'completed', completedAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        total: { $sum: '$subtotal' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$subtotal' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: { earnings, period } });
};

// GET /api/workers/orders
const getOrders = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { workerId: req.userId };
  if (status) query.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('customerId', 'name avatar phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Booking.countDocuments(query),
  ]);

  res.json({ success: true, data: { bookings, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
};

// PUT /api/workers/orders/:bookingId/complete
const completeOrder = async (req, res) => {
  const { bookingId } = req.params;
  const { afterPhotos } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, workerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'accepted' && booking.status !== 'in_progress') {
    throw new AppError('Cannot complete this booking', 400);
  }

  booking.status = 'completed';
  booking.completedAt = new Date();
  if (afterPhotos) booking.afterPhotos = afterPhotos;
  await booking.save();

  // Update worker stats
  await Worker.findOneAndUpdate(
    { userId: req.userId },
    { $inc: { totalJobsCompleted: 1, totalEarnings: booking.subtotal } }
  );

  // Send review request to customer
  await emailService.sendReviewRequest(booking.customerId, bookingId);

  // Notify customer
  await Notification.create({
    userId: booking.customerId,
    type: 'job_completed',
    title: 'Job Completed!',
    message: 'Your job has been marked as completed. Please leave a review.',
    relatedId: booking._id,
    relatedType: 'booking',
    deliveryChannels: { inApp: true, email: true },
  });

  const io = req.app.get('io');
  io.to(booking.customerId.toString()).emit('job:completed', { bookingId, message: 'Your job is completed!' });

  res.json({ success: true, message: 'Job marked as completed', data: booking });
};

// PUT /api/workers/availability
const updateAvailability = async (req, res) => {
  const { availabilityCalendar, isAvailableNow } = req.body;
  const updates = {};
  if (availabilityCalendar) updates.availabilityCalendar = availabilityCalendar;
  if (isAvailableNow !== undefined) updates.isAvailableNow = isAvailableNow;

  const worker = await Worker.findOneAndUpdate({ userId: req.userId }, { $set: updates }, { new: true });
  res.json({ success: true, message: 'Availability updated', data: worker });
};

// POST /api/workers/upload-aadhar
const uploadAadhar = async (req, res) => {
  const { aadharNumber, fullName } = req.body;
  const files = req.files;

  if (!files?.aadharFront || !files?.aadharBack) {
    throw new AppError('Both Aadhar front and back photos are required', 400);
  }
  if (!aadharNumber || !/^\d{12}$/.test(aadharNumber.replace(/\s/g, ''))) {
    throw new AppError('Invalid Aadhar number. Must be 12 digits.', 400);
  }

  // Upload to Cloudinary (or dev placeholder)
  let frontResult, backResult;
  try {
    [frontResult, backResult] = await Promise.all([
      cloudinaryService.uploadFile(files.aadharFront[0].buffer, 'aadhar'),
      cloudinaryService.uploadFile(files.aadharBack[0].buffer, 'aadhar'),
    ]);
  } catch (uploadErr) {
    throw new AppError('Document upload failed. Please try again. ' + uploadErr.message, 500);
  }

  // AI detection check (safe — always returns false in dev)
  const [frontAI, backAI] = await Promise.all([
    aiDetection.checkImage(frontResult.secure_url),
    aiDetection.checkImage(backResult.secure_url),
  ]);

  const isAIFlagged = frontAI.isAI || backAI.isAI;

  await Worker.findOneAndUpdate(
    { userId: req.userId },
    {
      $set: {
        'aadhar.number': aadharNumber.replace(/\s/g, ''),
        'aadhar.fullName': fullName,
        'aadhar.frontPhoto': frontResult.secure_url,
        'aadhar.backPhoto': backResult.secure_url,
        'aadhar.verified': false,
        'verificationDocuments.aadhar': 'pending',
        registrationStep: 3,
      },
    },
    { new: true }
  );

  if (isAIFlagged) {
    const user = await User.findById(req.userId);
    await emailService.sendAIImageFlaggedEmail(user.email, user.name, 'Aadhar document');
  }

  res.json({
    success: true,
    message: isAIFlagged
      ? 'Aadhar uploaded but flagged for review. Please ensure documents are genuine.'
      : 'Aadhar uploaded successfully. Pending admin verification.',
    data: { isAIFlagged },
  });
};

// POST /api/workers/upload-insurance
const uploadInsurance = async (req, res) => {
  const { provider, policyNumber, holderName, coverageAmount, startDate, endDate, premium, premiumFrequency } = req.body;

  if (!req.file) throw new AppError('Insurance policy document is required', 400);

  // Validate policy not expired
  if (new Date(endDate) < new Date()) {
    throw new AppError('Insurance policy is expired. Please upload a valid policy.', 400);
  }

  const uploadResult = await cloudinaryService.uploadFile(req.file.buffer, 'insurance');

  await Worker.findOneAndUpdate(
    { userId: req.userId },
    {
      $set: {
        insurance: {
          provider, policyNumber, holderName,
          coverageAmount: parseFloat(coverageAmount),
          policyDocument: uploadResult.secure_url,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          premium: parseFloat(premium),
          premiumFrequency,
          status: 'pending',
          verified: false,
        },
        'verificationDocuments.insurance': 'pending',
        registrationStep: 5,
      },
    }
  );

  res.json({ success: true, message: 'Insurance document uploaded. Pending verification (1-2 business days).' });
};

// POST /api/workers/upload-portfolio
const uploadPortfolio = async (req, res) => {
  if (!req.files || req.files.length === 0) throw new AppError('At least one image is required', 400);

  const imageData = JSON.parse(req.body.imageData || '[]');
  const uploadedImages = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const meta = imageData[i] || {};

    const uploadResult = await cloudinaryService.uploadFile(file.buffer, 'portfolio');
    const aiResult = await aiDetection.checkImage(uploadResult.secure_url);

    uploadedImages.push({
      imageUrl: uploadResult.secure_url,
      description: meta.description || '',
      skill: meta.skill || '',
      beforeAfter: meta.beforeAfter || 'single',
      isAIFlagged: aiResult.isAI,
      aiConfidence: aiResult.confidence,
      flaggedAt: aiResult.isAI ? new Date() : undefined,
      adminReview: 'pending',
    });
  }

  await Worker.findOneAndUpdate(
    { userId: req.userId },
    {
      $push: { portfolio: { $each: uploadedImages } },
      $set: { 'verificationDocuments.portfolio': 'pending', registrationStep: 4 },
    }
  );

  const flaggedCount = uploadedImages.filter((i) => i.isAIFlagged).length;
  if (flaggedCount > 0) {
    const user = await User.findById(req.userId);
    await emailService.sendAIImageFlaggedEmail(user.email, user.name, `${flaggedCount} portfolio image(s)`);
  }

  res.json({
    success: true,
    message: `${uploadedImages.length} image(s) uploaded. ${flaggedCount} flagged for review.`,
    data: { uploaded: uploadedImages.length, flagged: flaggedCount },
  });
};

// PUT /api/workers/avatar
const uploadAvatar = async (req, res) => {
  if (!req.file) throw new AppError('Image file is required', 400);
  const result = await cloudinaryService.uploadFile(req.file.buffer, 'avatars', { transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] });
  await User.findByIdAndUpdate(req.userId, { avatar: result.secure_url });
  res.json({ success: true, message: 'Avatar updated', data: { avatar: result.secure_url } });
};

module.exports = { getProfile, updateProfile, getDashboard, getEarnings, getOrders, completeOrder, updateAvailability, uploadAadhar, uploadInsurance, uploadPortfolio, uploadAvatar };
