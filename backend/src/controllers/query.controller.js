const Query = require('../models/Query');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/queries
 * Submit a question (any authenticated user).
 */
const createQuery = async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim().length === 0) {
    throw new AppError('Question is required', 400);
  }

  const askerType = req.user.userType; // 'customer' or 'worker'

  const query = await Query.create({
    askerId: req.userId,
    askerType,
    question: question.trim(),
  });

  res.status(201).json({
    success: true,
    message: 'Your question has been submitted. We will respond soon.',
    data: query,
  });
};

/**
 * GET /api/queries/mine
 * List the current user's own queries.
 */
const getMyQueries = async (req, res) => {
  const queries = await Query.find({ askerId: req.userId })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: queries });
};

/**
 * GET /api/queries
 * Admin: list all queries, filterable by status.
 */
const getAllQueries = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;

  const [queries, total] = await Promise.all([
    Query.find(filter)
      .populate('askerId', 'name avatar userType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Query.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      queries,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    },
  });
};

/**
 * PUT /api/queries/:id/reply
 * Admin: reply to a query.
 */
const replyToQuery = async (req, res) => {
  const { reply } = req.body;

  if (!reply || reply.trim().length === 0) {
    throw new AppError('Reply text is required', 400);
  }

  const query = await Query.findById(req.params.id);
  if (!query) throw new AppError('Query not found', 404);

  query.adminReply = reply.trim();
  query.repliedBy = req.adminId;
  query.repliedAt = new Date();
  query.status = 'answered';
  await query.save();

  // Notify the user via socket
  const io = req.app.get('io');
  io.to(query.askerId.toString()).emit('query:answered', {
    queryId: query._id,
    reply: reply.trim(),
  });

  res.json({ success: true, message: 'Reply sent', data: query });
};

/**
 * PUT /api/queries/:id/close
 * Admin: close a query.
 */
const closeQuery = async (req, res) => {
  const query = await Query.findById(req.params.id);
  if (!query) throw new AppError('Query not found', 404);

  query.status = 'closed';
  await query.save();

  res.json({ success: true, message: 'Query closed', data: query });
};

module.exports = { createQuery, getMyQueries, getAllQueries, replyToQuery, closeQuery };
