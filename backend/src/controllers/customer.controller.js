const User = require('../models/User');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { AppError } = require('../middleware/errorHandler');

// Metro area mappings — so 'Navi Mumbai', 'Thane' etc all count as 'Mumbai'

const METRO_GROUPS = {
  Mumbai: ['Mumbai', 'Navi Mumbai', 'Thane', 'Kalyan', 'Vasai', 'Mira Road'],
  Delhi: ['Delhi', 'New Delhi', 'Noida', 'Gurgaon', 'Gurugram', 'Faridabad', 'Ghaziabad'],
  Bangalore: ['Bangalore', 'Bengaluru', 'Whitefield', 'Electronic City', 'Hosur'],
  Hyderabad: ['Hyderabad', 'Secunderabad', 'Cyberabad', 'Gachibowli'],
  Chennai: ['Chennai', 'Tambaram', 'Velachery', 'Perambur'],
  Kolkata: ['Kolkata', 'Howrah', 'Salt Lake', 'Durgapur'],
  Pune: ['Pune', 'Pimpri', 'Chinchwad', 'Wakad'],
  Ahmedabad: ['Ahmedabad', 'Gandhinagar', 'Anand'],
};

// Returns all city variants for a given search city (handles metro areas)
const getCityVariants = (city) => {
  if (!city) return null;
  const normalised = city.trim();
  for (const [metro, variants] of Object.entries(METRO_GROUPS)) {
    if (variants.some(v => v.toLowerCase() === normalised.toLowerCase())) {
      return variants; // return all variants for metro group
    }
  }
  return [normalised]; // exact city only
};

// GET /api/customers/search
const searchWorkers = async (req, res) => {
  const {
    skill, city, minRating = 0, maxRate, minRate = 0,
    available, page = 1, limit = 12, sortBy = 'rating',
    lat, lng, radius = 20,
  } = req.query;

  const workerQuery = {};
  if (process.env.NODE_ENV === 'production') workerQuery.verificationStatus = 'verified';
  if (skill) workerQuery['skills.skillName'] = { $regex: skill, $options: 'i' };
  if (minRating) workerQuery.overallRating = { $gte: parseFloat(minRating) };
  if (available === 'true') workerQuery.isAvailableNow = true;
  if (maxRate) workerQuery['skills.ratePerHour'] = { $lte: parseInt(maxRate), $gte: parseInt(minRate) };

  // City filter: Try to get user city from token for logged-in customers
  // If the user is logged in, their profile city strictly overrides any search query params
  let filterCity = city;
  
  if (req.headers.authorization) {
    try {
      const jwt = require('jsonwebtoken');
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.userId && decoded.userId !== 'dev-admin-id') {
        const userDoc = await User.findById(decoded.userId).select('city');
        if (userDoc?.city) {
          filterCity = userDoc.city; // STRICT OVERRIDE
        }
      }
    } catch (_) { /* continue as guest */ }
  }

  if (filterCity) {
    const variants = getCityVariants(filterCity);
    if (process.env.NODE_ENV === 'production') {
      // In production: strict city match only
      workerQuery.cityOfOperation = { $in: variants };
    } else {
      // In dev: show workers in matching city OR workers with no city set (newly registered)
      workerQuery.$or = [
        { cityOfOperation: { $in: variants } },
        { cityOfOperation: { $exists: false } },
        { cityOfOperation: null },
        { cityOfOperation: '' },
      ];
    }
  }

  // Geo-query if coords provided
  if (lat && lng) {
    workerQuery.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radius * 1000,
      },
    };
  }

  const sortOptions = {
    rating: { overallRating: -1 },
    reviews: { totalReviews: -1 },
    jobs: { totalJobsCompleted: -1 },
  };

  const [workers, total] = await Promise.all([
    Worker.find(workerQuery)
      .populate('userId', 'name avatar city primaryAddress')
      .sort(sortOptions[sortBy] || sortOptions.rating)
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Worker.countDocuments(workerQuery),
  ]);

  res.json({
    success: true,
    data: { workers, total, page: parseInt(page), totalPages: Math.ceil(total / limit) },
  });
};


// GET /api/customers/workers/:workerId
const getWorkerPublicProfile = async (req, res) => {
  const worker = await Worker.findById(req.params.workerId)
    .populate('userId', 'name avatar primaryAddress createdAt');
  if (!worker) {
    throw new AppError('Worker not found', 404);
  }
  // In production, only show verified workers
  if (process.env.NODE_ENV === 'production' && worker.verificationStatus !== 'verified') {
    throw new AppError('Worker not found', 404);
  }

  const reviews = await Review.find({ reviewedId: worker.userId })
    .populate('reviewerId', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(10);

  // Return worker directly as `data` (not nested) — frontend expects data to BE the worker
  res.json({ success: true, data: { ...worker.toObject(), reviews } });
};

// GET /api/customers/dashboard
const getDashboard = async (req, res) => {
  const customer = await Customer.findOne({ userId: req.userId })
    .populate({ path: 'favoriteWorkers', populate: { path: 'userId', select: 'name avatar' } });

  const activeOrders = await Booking.find({
    customerId: req.userId,
    status: { $in: ['pending', 'accepted', 'in_progress'] },
  })
    .populate('workerId', 'name avatar')
    .populate('workerProfileId', 'primarySkill overallRating')
    .sort({ scheduledDate: 1 });

  const recentOrders = await Booking.find({
    customerId: req.userId,
    status: { $in: ['completed', 'cancelled'] },
  })
    .populate('workerId', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({ success: true, data: { customer, activeOrders, recentOrders } });
};

// GET /api/customers/orders
const getOrders = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { customerId: req.userId };
  if (status && status !== 'all') query.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('workerId', 'name avatar phone')
      .populate('workerProfileId', 'primarySkill overallRating')
      .populate('reserviceRequestId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Booking.countDocuments(query),
  ]);

  res.json({ success: true, data: { bookings, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
};

// GET /api/customers/favorites
const getFavorites = async (req, res) => {
  const customer = await Customer.findOne({ userId: req.userId })
    .populate({ path: 'favoriteWorkers', populate: { path: 'userId', select: 'name avatar' } });
  res.json({ success: true, data: customer?.favoriteWorkers || [] });
};

// POST /api/customers/favorites/:workerId
const toggleFavorite = async (req, res) => {
  const { workerId } = req.params;
  const customer = await Customer.findOne({ userId: req.userId });
  if (!customer) throw new AppError('Customer profile not found', 404);

  const isFavorite = customer.favoriteWorkers.includes(workerId);
  if (isFavorite) {
    customer.favoriteWorkers = customer.favoriteWorkers.filter((id) => id.toString() !== workerId);
  } else {
    customer.favoriteWorkers.push(workerId);
  }
  await customer.save();

  res.json({ success: true, message: isFavorite ? 'Removed from favorites' : 'Added to favorites', isFavorite: !isFavorite });
};

// POST /api/customers/complaints
const fileComplaint = async (req, res) => {
  const Complaint = require('../models/Complaint');
  const { bookingId, reason, description } = req.body;
  if (!bookingId || !reason || !description) {
    throw new AppError('bookingId, reason and description are required', 400);
  }

  const booking = await Booking.findOne({ _id: bookingId, customerId: req.userId });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.hasComplaint) throw new AppError('A complaint already exists for this booking', 400);

  const complaint = await Complaint.create({
    complainantId: req.userId,
    complainantType: 'customer',
    respondentId: booking.workerId,
    bookingId: booking._id,
    reason,
    description,
    timeline: [{ action: 'Complaint filed by customer', performedBy: req.userId, performedByRole: 'customer' }],
  });

  booking.hasComplaint = true;
  booking.complaintId = complaint._id;
  await booking.save();

  res.status(201).json({ success: true, message: 'Complaint filed successfully', data: complaint });
};

// GET /api/customers/complaints
const getMyComplaints = async (req, res) => {
  const Complaint = require('../models/Complaint');
  const complaints = await Complaint.find({ complainantId: req.userId })
    .populate('respondentId', 'name avatar')
    .populate('bookingId', 'skillRequired totalAmount scheduledDate')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: complaints });
};

module.exports = { searchWorkers, getWorkerPublicProfile, getDashboard, getOrders, getFavorites, toggleFavorite, fileComplaint, getMyComplaints };
