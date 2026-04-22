const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const createLimiter = (windowMs, max, message, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, errorCode: 'RATE_LIMIT_EXCEEDED', message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
  });

// Global: 200 req / 15 min (1000 in dev)
const globalLimiter = createLimiter(
  15 * 60 * 1000,
  isDev ? 1000 : 200,
  'Too many requests. Please try again in 15 minutes.'
);

// OTP: 3 req / 10 min (50 in dev)
const otpLimiter = createLimiter(
  10 * 60 * 1000,
  isDev ? 50 : 3,
  'Too many OTP requests. Please wait 10 minutes before trying again.'
);

// Login: 5 attempts / 15 min (100 in dev)
const loginLimiter = createLimiter(
  15 * 60 * 1000,
  isDev ? 100 : 5,
  'Too many login attempts. Please try again in 15 minutes.'
);

// Registration: 3 req / 1 hour (100 in dev)
const registerLimiter = createLimiter(
  60 * 60 * 1000,
  isDev ? 100 : 3,
  'Too many registration attempts. Please try again in 1 hour.'
);

// Payment: 10 req / 1 hour (50 in dev)
const paymentLimiter = createLimiter(
  60 * 60 * 1000,
  isDev ? 50 : 10,
  'Too many payment requests. Please try again in 1 hour.'
);

// File upload: 20 req / 1 hour (100 in dev)
const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  isDev ? 100 : 20,
  'Too many file upload attempts. Please try again in 1 hour.'
);

// Search: 60 req / 1 min (500 in dev)
const searchLimiter = createLimiter(
  60 * 1000,
  isDev ? 500 : 60,
  'Too many search requests. Please slow down.'
);

module.exports = {
  globalLimiter,
  otpLimiter,
  loginLimiter,
  registerLimiter,
  paymentLimiter,
  uploadLimiter,
  searchLimiter,
};
