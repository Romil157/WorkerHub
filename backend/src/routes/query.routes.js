const express = require('express');
const router = express.Router();
const {
  createQuery,
  getMyQueries,
  getAllQueries,
  replyToQuery,
  closeQuery,
} = require('../controllers/query.controller');
const { protect, protectAdmin } = require('../middleware/auth');

// User routes (any authenticated user can ask questions)
router.post('/', protect, createQuery);
router.get('/mine', protect, getMyQueries);

// Admin routes
router.get('/', protectAdmin, getAllQueries);
router.put('/:id/reply', protectAdmin, replyToQuery);
router.put('/:id/close', protectAdmin, closeQuery);

module.exports = router;
