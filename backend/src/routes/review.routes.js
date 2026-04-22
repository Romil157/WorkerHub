const express = require('express');
const router = express.Router();
const { createReview, getWorkerReviews, replyToReview, markHelpful } = require('../controllers/review.controller');
const { protect, customerOnly } = require('../middleware/auth');

router.get('/worker/:workerId', getWorkerReviews);
router.post('/', protect, customerOnly, createReview);
router.put('/:reviewId/reply', protect, replyToReview);
router.post('/:reviewId/helpful', protect, markHelpful);

module.exports = router;
