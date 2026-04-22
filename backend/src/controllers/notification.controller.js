const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
    Notification.countDocuments({ userId: req.userId }),
    Notification.countDocuments({ userId: req.userId, isRead: false }),
  ]);
  res.json({ success: true, data: { notifications, total, unreadCount } });
};

const markRead = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { isRead: true, readAt: new Date() });
  res.json({ success: true });
};

const markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.userId, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'All notifications marked as read' });
};

module.exports = { getNotifications, markRead, markAllRead };
