const express = require('express');
const router = express.Router();
const {
  searchWorkers, getWorkerPublicProfile, getDashboard,
  toggleFavorite, getOrders, getFavorites, fileComplaint, getMyComplaints,
} = require('../controllers/customer.controller');
const { getWorkerAvailability } = require('../controllers/availability.controller');
const { protect, customerOnly } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiter');

// Public search (no auth needed)
router.get('/search', searchLimiter, searchWorkers);
router.get('/workers/:workerId', getWorkerPublicProfile);
router.get('/workers/:workerId/availability', getWorkerAvailability);

// Protected customer routes
router.use(protect, customerOnly);
router.get('/dashboard', getDashboard);
router.get('/orders', getOrders);
router.get('/favorites', getFavorites);
router.post('/favorites/:workerId', toggleFavorite);
router.post('/complaints', fileComplaint);
router.get('/complaints', getMyComplaints);

module.exports = router;
