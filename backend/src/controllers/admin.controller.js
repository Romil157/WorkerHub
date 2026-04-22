const User = require('../models/User');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Complaint = require('../models/Complaint');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { AppError } = require('../middleware/errorHandler');
const { generateAccessToken } = require('../middleware/auth');
const emailService = require('../services/email.service');


// Helper: check if MongoDB is actually connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// POST /api/admin/login
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  // ── DEV MODE BYPASS ──────────────────────────────────────────
  // Works even when MongoDB is not connected (e.g. IP not whitelisted yet)
  if (process.env.NODE_ENV !== 'production' &&
      email === (process.env.ADMIN_INITIAL_EMAIL || 'admin@workerhub.in') &&
      password === (process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456')) {
    const fakeAdmin = { _id: 'dev-admin-id', name: 'Super Admin', email, role: 'super_admin', permissions: ['verify_workers', 'manage_complaints', 'view_analytics', 'manage_users'] };
    const token = generateAccessToken('dev-admin-id', 'admin');
    return res.json({ success: true, data: { admin: fakeAdmin, token } });
  }
  // ─────────────────────────────────────────────────────────────

  if (!isDbConnected()) throw new AppError('Database not connected. Please whitelist your IP in MongoDB Atlas Network Access.', 503);
  const admin = await Admin.findOne({ email, isActive: true });
  if (!admin) throw new AppError('Invalid credentials', 401);
  const valid = await admin.comparePassword(password);
  if (!valid) throw new AppError('Invalid credentials', 401);
  admin.lastLogin = new Date();
  await admin.save();
  const token = generateAccessToken(admin._id, 'admin');
  res.json({ success: true, data: { admin, token } });
};

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  // Return empty stats if DB not connected
  if (!isDbConnected()) {
    return res.json({
      success: true,
      _warning: 'Database not connected — showing placeholder data. Whitelist your IP in MongoDB Atlas.',
      data: {
        stats: { totalUsers: 0, totalWorkers: 0, verifiedWorkers: 0, pendingVerification: 0, totalBookings: 0, openComplaints: 0, todayBookings: 0, totalGMV: 0, totalPlatformRevenue: 0 },
        signupTrend: [],
      },
    });
  }

  const [
    totalUsers, totalWorkers, verifiedWorkers, pendingVerification,
    totalBookings, totalRevenue, openComplaints, todayBookings,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ userType: 'worker' }),
    Worker.countDocuments({ verificationStatus: 'verified' }),
    Worker.countDocuments({ verificationStatus: 'pending' }),
    Booking.countDocuments(),
    Booking.aggregate([{ $match: { paymentStatus: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, platform: { $sum: '$platformFee' } } }]),
    Complaint.countDocuments({ status: 'open' }),
    Booking.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
  ]);

  const signupTrend = await User.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers, totalWorkers, verifiedWorkers, pendingVerification,
        totalBookings, openComplaints, todayBookings,
        totalGMV: totalRevenue[0]?.total || 0,
        totalPlatformRevenue: totalRevenue[0]?.platform || 0,
      },
      signupTrend,
    },
  });
};

// GET /api/admin/analytics
const getAnalytics = async (req, res) => {
  if (!isDbConnected()) return res.json({ success: true, data: { skillDemand: [], topWorkers: [], revenueByMonth: [], bookingStatusDist: [] } });
  const [skillDemand, topWorkers, revenueByMonth, bookingStatusDist] = await Promise.all([
    Booking.aggregate([{ $group: { _id: '$skillRequired', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    Worker.find({ verificationStatus: 'verified' }).sort({ totalEarnings: -1 }).limit(10).populate('userId', 'name avatar'),
    Booking.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, bookings: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, data: { skillDemand, topWorkers, revenueByMonth, bookingStatusDist } });
};

// GET /api/admin/verification
const getVerificationQueue = async (req, res) => {
  if (!isDbConnected()) return res.json({ success: true, data: { workers: [], total: 0, page: 1 } });
  const { status = 'pending', page = 1, limit = 20 } = req.query;

  // When fetching "pending" queue, also include 'incomplete' workers who have
  // submitted their documents (registrationStep >= 3) but haven't been reviewed yet
  let statusQuery;
  if (status === 'pending') {
    statusQuery = {
      $or: [
        { verificationStatus: 'pending' },
        { verificationStatus: 'incomplete', registrationStep: { $gte: 3 } },
      ],
    };
  } else {
    statusQuery = { verificationStatus: status };
  }

  const [workers, total] = await Promise.all([
    Worker.find(statusQuery)
      .populate('userId', 'name email phone avatar createdAt')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Worker.countDocuments(statusQuery),
  ]);
  res.json({ success: true, data: { workers, total, page: parseInt(page) } });
};

// GET /api/admin/verification/:workerId
const getWorkerVerificationDetail = async (req, res) => {
  const worker = await Worker.findById(req.params.workerId)
    .populate('userId', 'name email phone avatar dateOfBirth gender createdAt');
  if (!worker) throw new AppError('Worker not found', 404);
  res.json({ success: true, data: worker });
};

// PUT /api/admin/verification/:workerId/approve
const approveWorker = async (req, res) => {
  const worker = await Worker.findById(req.params.workerId).populate('userId');
  if (!worker) throw new AppError('Worker not found', 404);

  worker.verificationStatus = 'verified';
  worker.verifiedAt = new Date();
  if (req.adminId) worker.verifiedBy = req.adminId; // only set if admin session exists
  worker.verificationDocuments = { aadhar: 'verified', insurance: 'verified', bankDetails: 'verified', portfolio: 'verified' };
  await worker.save();

  await User.findByIdAndUpdate(worker.userId._id, { isVerified: true });
  await emailService.sendVerificationApproved(worker.userId.email, worker.userId.name);

  await Notification.create({
    userId: worker.userId._id,
    type: 'verification_approved',
    title: 'Your Profile is Verified! 🎉',
    message: 'Congratulations! Your WorkerHub profile has been verified. You can now accept jobs.',
    deliveryChannels: { inApp: true, email: true },
  });

  res.json({ success: true, message: 'Worker approved and notified' });
};

// PUT /api/admin/verification/:workerId/reject
const rejectWorker = async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new AppError('Rejection reason is required', 400);

  const worker = await Worker.findById(req.params.workerId).populate('userId');
  if (!worker) throw new AppError('Worker not found', 404);

  worker.verificationStatus = 'rejected';
  worker.rejectionReason = reason;
  await worker.save();

  await emailService.sendVerificationRejected(worker.userId.email, worker.userId.name, reason);

  res.json({ success: true, message: 'Worker rejected and notified' });
};

// GET /api/admin/complaints
const getComplaints = async (req, res) => {
  if (!isDbConnected()) return res.json({ success: true, data: { complaints: [], total: 0, page: 1 } });
  const { status, priority, page = 1, limit = 15 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (priority) query.priority = priority;

  const [complaints, total] = await Promise.all([
    Complaint.find(query)
      .populate('complainantId', 'name avatar userType')
      .populate('respondentId', 'name avatar userType')
      .populate('bookingId', 'skillRequired totalAmount scheduledDate')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Complaint.countDocuments(query),
  ]);

  res.json({ success: true, data: { complaints, total, page: parseInt(page) } });
};

// GET /api/admin/complaints/:complaintId
const getComplaintDetail = async (req, res) => {
  const complaint = await Complaint.findById(req.params.complaintId)
    .populate('complainantId', 'name avatar phone email userType')
    .populate('respondentId', 'name avatar phone email userType')
    .populate('bookingId');
  if (!complaint) throw new AppError('Complaint not found', 404);
  res.json({ success: true, data: complaint });
};

// PUT /api/admin/complaints/:complaintId/resolve
const resolveComplaint = async (req, res) => {
  const { resolution, resolutionAmount, resolutionNotes, status } = req.body;
  const complaint = await Complaint.findById(req.params.complaintId)
    .populate('complainantId', 'name email')
    .populate('respondentId', 'name email');
  if (!complaint) throw new AppError('Complaint not found', 404);

  // Map frontend resolution values to valid enum values
  const RESOLUTION_MAP = {
    worker_warning: 'worker_warning',
    worker_ban: 'worker_ban',
    dismissed: 'dismissed',
    full_refund: 'full_refund',
    partial_refund: 'partial_refund',
    rework: 'rework',
    no_action: 'no_action',
    warning_issued: 'warning_issued',
  };

  const mappedResolution = RESOLUTION_MAP[resolution] || 'no_action';

  // Allow updating status (escalate / under_review) without requiring resolution
  complaint.status = status === 'escalated' ? 'escalated'
    : status === 'under_review' ? 'under_review'
    : 'resolved';

  if (mappedResolution) complaint.resolution = mappedResolution;
  if (resolutionAmount) complaint.resolutionAmount = resolutionAmount;
  if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
  if (complaint.status === 'resolved') complaint.resolvedAt = new Date();

  // Add timeline entry — no performedBy to avoid ObjectId cast errors
  complaint.timeline.push({
    action: `${complaint.status}: ${mappedResolution}. ${resolutionNotes || ''}`,
    performedByRole: 'admin',
    timestamp: new Date(),
  });

  await complaint.save();

  // Handle refund on booking if needed
  if (['full_refund', 'partial_refund'].includes(mappedResolution)) {
    await Booking.findByIdAndUpdate(complaint.bookingId, {
      refundStatus: 'pending',
      refundAmount: resolutionAmount,
      paymentStatus: 'refunded',
    });
  }

  // Notify complainant by email (only if fully resolved)
  if (complaint.status === 'resolved' && complaint.complainantId?.email) {
    try {
      await emailService.sendComplaintResolved(complaint.complainantId.email, complaint.complainantId.name, mappedResolution);
    } catch (_) { /* email failure shouldn't block the response */ }
  }

  res.json({ success: true, message: `Complaint ${complaint.status}` });
};


// GET /api/admin/users
const getUsers = async (req, res) => {
  if (!isDbConnected()) return res.json({ success: true, data: { users: [], total: 0, page: 1 } });
  const { search, userType, status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (userType) query.userType = userType;
  if (status) query.status = status;
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { phone: { $regex: search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  res.json({ success: true, data: { users, total, page: parseInt(page) } });
};

// GET /api/admin/users/:userId
const getUserDetail = async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw new AppError('User not found', 404);

  const [bookings, complaints] = await Promise.all([
    Booking.find({ $or: [{ customerId: user._id }, { workerId: user._id }] }).sort({ createdAt: -1 }).limit(10),
    Complaint.find({ $or: [{ complainantId: user._id }, { respondentId: user._id }] }).limit(5),
  ]);

  let profile = null;
  let reviews = [];
  let earningsSummary = null;

  if (user.userType === 'worker') {
    profile = await Worker.findOne({ userId: user._id });
    reviews = await Review.find({ reviewedId: user._id }).populate('reviewerId', 'name avatar').sort({ createdAt: -1 }).limit(10);
    const earningsAgg = await Booking.aggregate([
      { $match: { workerId: user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$subtotal' }, count: { $sum: 1 } } },
    ]);
    earningsSummary = earningsAgg[0] || { total: 0, count: 0 };
  } else {
    profile = await Customer.findOne({ userId: user._id });
    reviews = await Review.find({ reviewerId: user._id }).populate('reviewedId', 'name avatar').sort({ createdAt: -1 }).limit(10);
  }

  res.json({ success: true, data: { user, profile, bookings, complaints, reviews, earningsSummary } });
};


// PUT /api/admin/users/:userId/ban
const banUser = async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new AppError('Ban reason is required', 400);
  const user = await User.findByIdAndUpdate(req.params.userId, { isBanned: true, banReason: reason, bannedAt: new Date(), status: 'banned' }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, message: 'User banned', data: user });
};

// PUT /api/admin/users/:userId/unban
const unbanUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isBanned: false, banReason: null, bannedAt: null, status: 'active' }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, message: 'User unbanned', data: user });
};


// PUT /api/admin/complaints/:complaintId/status
const updateComplaintStatus = async (req, res) => {
  const { status } = req.body;
  const valid = ['open', 'under_review', 'resolved', 'escalated'];
  if (!valid.includes(status)) throw new AppError('Invalid status', 400);
  const complaint = await Complaint.findById(req.params.complaintId);
  if (!complaint) throw new AppError('Complaint not found', 404);
  complaint.status = status;
  complaint.timeline.push({ action: `Status changed to ${status} by admin`, performedByRole: 'admin', timestamp: new Date() });
  await complaint.save();
  res.json({ success: true, message: `Status updated to ${status}`, data: complaint });
};

// PUT /api/admin/complaints/:complaintId/priority
const updateComplaintPriority = async (req, res) => {
  const { priority } = req.body;
  const valid = ['low', 'medium', 'high', 'critical'];
  if (!valid.includes(priority)) throw new AppError('Invalid priority', 400);
  const complaint = await Complaint.findByIdAndUpdate(req.params.complaintId, { priority }, { new: true });
  if (!complaint) throw new AppError('Complaint not found', 404);
  res.json({ success: true, message: `Priority updated to ${priority}`, data: complaint });
};

module.exports = { adminLogin, getDashboard, getAnalytics, getVerificationQueue, getWorkerVerificationDetail, approveWorker, rejectWorker, getComplaints, getComplaintDetail, resolveComplaint, updateComplaintStatus, updateComplaintPriority, getUsers, getUserDetail, banUser, unbanUser };
