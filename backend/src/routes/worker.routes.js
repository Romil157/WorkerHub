const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, uploadAadhar, uploadInsurance,
  uploadPortfolio, getDashboard, getOrders, completeOrder, updateAvailability,
  getEarnings, uploadAvatar,
} = require('../controllers/worker.controller');
const { getRoute } = require('../controllers/route.controller');
const { protect, workerOnly, verifiedWorkerOnly } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../services/cloudinary.service');

router.use(protect, workerOnly);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/avatar', upload.single('avatar'), uploadAvatar);
router.get('/dashboard', getDashboard);
router.get('/earnings', getEarnings);
router.get('/orders', getOrders);
router.put('/orders/:bookingId/complete', completeOrder);
router.put('/availability', updateAvailability);
router.get('/route', getRoute);

// Document uploads (rate limited)
router.post('/upload-aadhar', uploadLimiter, upload.fields([
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
]), uploadAadhar);

router.post('/upload-insurance', uploadLimiter, upload.single('insuranceDoc'), uploadInsurance);

router.post('/upload-portfolio', uploadLimiter, upload.array('portfolioImages', 10), uploadPortfolio);

module.exports = router;
