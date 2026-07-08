const express = require('express');
const router = express.Router();
const {
  createReserviceRequest,
  getCustomerReserviceRequests,
  getWorkerReserviceRequests,
  scheduleReservice,
  completeReservice,
} = require('../controllers/reservice.controller');
const { protect, customerOnly, workerOnly } = require('../middleware/auth');

router.use(protect);

// Customer actions
router.post('/', customerOnly, createReserviceRequest);
router.get('/customer', customerOnly, getCustomerReserviceRequests);

// Worker actions
router.get('/worker', workerOnly, getWorkerReserviceRequests);
router.put('/:id/schedule', workerOnly, scheduleReservice);
router.put('/:id/complete', workerOnly, completeReservice);

module.exports = router;
