const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Generate tokens
const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

// Protect middleware — requires valid access token
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Access denied. No token provided.', 401, 'AUTHENTICATION_FAILED'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If a dev admin token accidentally hits a standard route, it will have userId 'dev-admin-id'
    // which Mongoose cannot cast to ObjectId. Handle it gracefully.
    if (decoded.userId === 'dev-admin-id' || decoded.role === 'admin') {
      return next(new AppError('Admin token cannot be used for user routes', 401, 'AUTHENTICATION_FAILED'));
    }

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) return next(new AppError('User not found', 401, 'AUTHENTICATION_FAILED'));
    if (user.isBanned) return next(new AppError('Account is banned', 403, 'AUTHORIZATION_FAILED'));

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(err); // Allowed to bubble to the global error handler perfectly
    }
    return next(new AppError('Authentication failed: Invalid user ID or token', 401, 'AUTHENTICATION_FAILED'));
  }
};

// Protect Admin routes
const protectAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Access denied.', 401, 'AUTHENTICATION_FAILED'));
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.role !== 'admin') {
    return next(new AppError('Admin access required', 403, 'AUTHORIZATION_FAILED'));
  }

  // DEV MODE BYPASS — skip DB lookup for the hardcoded dev admin token
  if (process.env.NODE_ENV !== 'production' && decoded.userId === 'dev-admin-id') {
    req.admin = { _id: 'dev-admin-id', name: 'Super Admin', role: 'super_admin' };
    req.adminId = 'dev-admin-id';
    return next();
  }

  const admin = await Admin.findById(decoded.userId);
  if (!admin) return next(new AppError('Admin not found', 401, 'AUTHENTICATION_FAILED'));

  req.admin = admin;
  req.adminId = admin._id;
  next();
};

// Role check: only workers
const workerOnly = (req, res, next) => {
  if (req.user?.userType !== 'worker') {
    return next(new AppError('Worker access required', 403, 'AUTHORIZATION_FAILED'));
  }
  next();
};

// Role check: only customers
const customerOnly = (req, res, next) => {
  if (req.user?.userType !== 'customer') {
    return next(new AppError('Customer access required', 403, 'AUTHORIZATION_FAILED'));
  }
  next();
};

// Require worker to be verified
const verifiedWorkerOnly = (req, res, next) => {
  if (req.user?.userType !== 'worker') {
    return next(new AppError('Worker access required', 403, 'AUTHORIZATION_FAILED'));
  }
  if (req.user.isVerified !== true) {
    return next(new AppError('Your account is pending verification by admin.', 403, 'VERIFICATION_FAILED'));
  }
  next();
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  protect,
  protectAdmin,
  workerOnly,
  customerOnly,
  verifiedWorkerOnly,
};
