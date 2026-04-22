const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

const createReview = async (req, res) => {
  const { bookingId, rating, text, photos, isAnonymous } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, customerId: req.userId, status: 'completed' });
  if (!booking) throw new AppError('Booking not found or not completed', 404);
  if (booking.customerReviewId) throw new AppError('Review already submitted for this booking', 400);

  const review = await Review.create({
    bookingId, rating, text, photos,
    reviewerId: req.userId,
    reviewedId: booking.workerId,
    reviewerType: 'customer',
    isAnonymous: isAnonymous || false,
    isVerified: true,
  });

  booking.customerReviewId = review._id;
  await booking.save();

  // Update worker rating
  const allReviews = await Review.find({ reviewedId: booking.workerId });
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await Worker.findOneAndUpdate({ userId: booking.workerId }, { overallRating: parseFloat(avgRating.toFixed(1)), totalReviews: allReviews.length });

  // Notify worker (Socket.io + DB)
  await Notification.create({ userId: booking.workerId, type: 'review_received', title: 'New Review!', message: `You received a ${rating}-star review.`, relatedId: review._id, relatedType: 'review', deliveryChannels: { inApp: true } });

  const io = req.app.get('io');
  io.to(booking.workerId.toString()).emit('review:new', { rating, text: text?.slice(0, 100), bookingId });

  res.status(201).json({ success: true, message: 'Review submitted', data: review });
};

const getWorkerReviews = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const [reviews, total] = await Promise.all([
    Review.find({ reviewedId: req.params.workerId, reviewerType: 'customer' })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Review.countDocuments({ reviewedId: req.params.workerId }),
  ]);
  res.json({ success: true, data: { reviews, total } });
};

const replyToReview = async (req, res) => {
  const { text } = req.body;
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw new AppError('Review not found', 404);
  if (review.reviewedId.toString() !== req.userId.toString()) throw new AppError('Unauthorized', 403);

  review.reply = { text, repliedAt: new Date() };
  await review.save();
  res.json({ success: true, message: 'Reply added', data: review });
};

const markHelpful = async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw new AppError('Review not found', 404);
  const alreadyVoted = review.helpfulVoters.includes(req.userId);
  if (alreadyVoted) {
    review.helpfulVoters.pull(req.userId);
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
  } else {
    review.helpfulVoters.push(req.userId);
    review.helpfulCount++;
  }
  await review.save();
  res.json({ success: true, helpful: !alreadyVoted, count: review.helpfulCount });
};

module.exports = { createReview, getWorkerReviews, replyToReview, markHelpful };
