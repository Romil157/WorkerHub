// Force Google DNS FIRST — bypasses ISP blocking MongoDB SRV lookups
require('dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('express-async-errors');
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { globalLimiter } = require('./src/middleware/rateLimiter');
const initSocketEvents = require('./src/socket/events');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const workerRoutes = require('./src/routes/worker.routes');
const customerRoutes = require('./src/routes/customer.routes');
const bookingRoutes = require('./src/routes/booking.routes');
const adminRoutes = require('./src/routes/admin.routes');
const webhookRoutes = require('./src/routes/webhook.routes');
const reviewRoutes = require('./src/routes/review.routes');
const messageRoutes = require('./src/routes/message.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const skillRoutes = require('./src/routes/skill.routes');

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter
app.use(globalLimiter);

// Parsing middleware
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (skip in test env)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/skills', skillRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Initialize Socket.io events
initSocketEvents(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`🚀 WorkerHub server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = { app, httpServer, io };
