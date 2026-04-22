const Message = require('../models/Message');
const { AppError } = require('../middleware/errorHandler');

const getConversationId = (id1, id2) => [id1, id2].sort().join('_');

const getConversations = async (req, res) => {
  const userId = req.userId.toString();
  const messages = await Message.aggregate([
    { $match: { conversationId: { $regex: userId } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$conversationId', lastMessage: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$lastMessage' } },
    { $sort: { createdAt: -1 } },
    { $limit: 30 },
  ]);

  const populated = await Message.populate(messages, [
    { path: 'senderId', select: 'name avatar userType' },
    { path: 'recipientId', select: 'name avatar userType' },
  ]);

  res.json({ success: true, data: populated });
};

const getMessages = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const convId = getConversationId(req.userId.toString(), req.params.userId);

  const [messages, total] = await Promise.all([
    Message.find({ conversationId: convId, isDeleted: false })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Message.countDocuments({ conversationId: convId }),
  ]);

  // Mark unread as read
  await Message.updateMany({ conversationId: convId, recipientId: req.userId, isRead: false }, { isRead: true, readAt: new Date() });

  res.json({ success: true, data: { messages: messages.reverse(), total } });
};

const sendMessage = async (req, res) => {
  const { recipientId, text, type = 'text', bookingId, quickReply } = req.body;
  const convId = getConversationId(req.userId.toString(), recipientId);

  const attachments = req.files?.map((f) => ({ url: f.path, type: f.mimetype.split('/')[0], filename: f.originalname })) || [];

  const message = await Message.create({
    senderId: req.userId,
    recipientId,
    conversationId: convId,
    text, type, attachments, bookingId, quickReply,
  });

  await message.populate('senderId', 'name avatar');

  const io = req.app.get('io');
  io.to(recipientId.toString()).emit('chat:message', { message });

  res.status(201).json({ success: true, data: message });
};

const markRead = async (req, res) => {
  const convId = req.params.conversationId;
  await Message.updateMany({ conversationId: convId, recipientId: req.userId, isRead: false }, { isRead: true, readAt: new Date() });

  const io = req.app.get('io');
  const [id1, id2] = convId.split('_');
  const otherId = id1 === req.userId.toString() ? id2 : id1;
  io.to(otherId).emit('chat:read', { conversationId: convId });

  res.json({ success: true });
};

module.exports = { getConversations, getMessages, sendMessage, markRead };
