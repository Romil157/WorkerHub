const express = require('express');
const router = express.Router();
const {
  createBooking, createPaymentOrder, verifyPayment,
  acceptBooking, rejectBooking, cancelBooking, getBookingById,
  markArrived, startTimer, uploadInitialPhoto, completeJobDynamic, acknowledgePayment
} = require('../controllers/booking.controller');

const { protect, customerOnly, workerOnly } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../services/cloudinary.service');

router.use(protect);

router.get('/:bookingId', getBookingById);

// Customer actions
router.post('/', customerOnly, upload.array('problemPhotos', 5), createBooking);
router.post('/create-payment-order', customerOnly, paymentLimiter, createPaymentOrder);
router.post('/verify-payment', customerOnly, verifyPayment);
router.put('/:bookingId/cancel', cancelBooking);
router.put('/:bookingId/start-timer', customerOnly, startTimer);

// Worker actions
router.put('/:bookingId/accept', workerOnly, acceptBooking);
router.put('/:bookingId/reject', workerOnly, rejectBooking);
router.put('/:bookingId/arrive', workerOnly, markArrived);
router.post('/:bookingId/upload-photo', workerOnly, upload.single('initialConditionPhoto'), uploadInitialPhoto);
router.put('/:bookingId/complete-dynamic', workerOnly, completeJobDynamic);
router.put('/:bookingId/acknowledge', workerOnly, acknowledgePayment);

module.exports = router;
