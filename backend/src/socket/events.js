const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Connected users: userId -> socketId
const connectedUsers = new Map();

const initSocketEvents = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: ${userId}`);

    // Join personal room
    socket.join(userId.toString());
    connectedUsers.set(userId.toString(), socket.id);

    // Emit online status to contacts
    socket.broadcast.emit('user:online', { userId });

    // ── CHAT EVENTS ────────────────────────────────
    socket.on('chat:typing', ({ recipientId }) => {
      io.to(recipientId.toString()).emit('chat:typing', { senderId: userId });
    });

    socket.on('chat:stop_typing', ({ recipientId }) => {
      io.to(recipientId.toString()).emit('chat:stop_typing', { senderId: userId });
    });

    // ── JOB EVENTS ────────────────────────────────
    // Worker emits this to notify customer of arrival
    socket.on('worker:on_way', ({ customerId, bookingId, eta }) => {
      io.to(customerId.toString()).emit('worker:on_way', { bookingId, eta, message: `Worker is on the way! ETA: ${eta} mins` });
    });

    // Location update (for live tracking)
    socket.on('worker:location', ({ customerId, bookingId, lat, lng }) => {
      io.to(customerId.toString()).emit('worker:location_update', { bookingId, lat, lng });
    });

    // ── NOTIFICATION EVENTS ───────────────────────
    // Emit real-time notification count
    socket.on('notifications:get_count', async () => {
      const Notification = require('../models/Notification');
      const count = await Notification.countDocuments({ userId, isRead: false });
      socket.emit('notifications:count', { count });
    });

    // ── DISCONNECT ────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);
      connectedUsers.delete(userId.toString());
      socket.broadcast.emit('user:offline', { userId });
    });
  });

  return connectedUsers;
};

/**
 * All Socket.io Events Reference:
 *
 * EMITTED BY SERVER:
 * job:request          { bookingId, skillRequired, scheduledDate, totalAmount }
 * job:accepted         { bookingId }
 * job:cancelled        { bookingId, reason }
 * job:completed        { bookingId, message }
 * job:status_update    { bookingId, status }
 * worker:on_way        { bookingId, eta, message }
 * worker:location_update{ bookingId, lat, lng }
 * payment:received     { bookingId, amount }
 * chat:message         { message: MessageObject }
 * chat:read            { conversationId }
 * chat:typing          { senderId }
 * chat:stop_typing     { senderId }
 * review:new           { rating, text, bookingId }
 * notifications:count  { count }
 * user:online          { userId }
 * user:offline         { userId }
 *
 * EMITTED BY CLIENT:
 * chat:typing          { recipientId }
 * chat:stop_typing     { recipientId }
 * worker:on_way        { customerId, bookingId, eta }
 * worker:location      { customerId, bookingId, lat, lng }
 * notifications:get_count
 */

module.exports = initSocketEvents;
