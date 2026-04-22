const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Standard error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  SERVER_ERROR: 'SERVER_ERROR',
};

// 404 handler
const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, ERROR_CODES.NOT_FOUND));
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, errorCode } = err;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      message: `Validation failed: ${errors.join(', ')}`,
      errors,
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      errorCode: ERROR_CODES.DUPLICATE_ENTRY,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      errorCode: ERROR_CODES.AUTHENTICATION_FAILED,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      errorCode: ERROR_CODES.AUTHENTICATION_FAILED,
      message: 'Token expired',
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      errorCode: ERROR_CODES.FILE_UPLOAD_FAILED,
      message: 'File size too large. Maximum allowed: 5MB',
    });
  }

  // Log non-operational errors
  if (!err.isOperational) {
    logger.error('Unhandled error:', err);
    statusCode = 500;
    message = 'Internal server error';
    errorCode = ERROR_CODES.SERVER_ERROR;
  }

  res.status(statusCode).json({
    success: false,
    errorCode: errorCode || ERROR_CODES.SERVER_ERROR,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { AppError, ERROR_CODES, notFound, errorHandler };
