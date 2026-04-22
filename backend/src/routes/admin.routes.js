const express = require('express');
const router = express.Router();
const {
  getDashboard, getVerificationQueue, getWorkerVerificationDetail,
  approveWorker, rejectWorker, getComplaints, getComplaintDetail,
  resolveComplaint, updateComplaintStatus, updateComplaintPriority,
  getUsers, getUserDetail, banUser, unbanUser,
  getAnalytics, adminLogin,
} = require('../controllers/admin.controller');
const { protectAdmin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, adminLogin);

// All routes below require admin auth
router.use(protectAdmin);

// Dashboard
router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);

// Verification
router.get('/verification', getVerificationQueue);
router.get('/verification/:workerId', getWorkerVerificationDetail);
router.put('/verification/:workerId/approve', approveWorker);
router.put('/verification/:workerId/reject', rejectWorker);

// Complaints
router.get('/complaints', getComplaints);
router.get('/complaints/:complaintId', getComplaintDetail);
router.put('/complaints/:complaintId/resolve', resolveComplaint);
router.put('/complaints/:complaintId/status', updateComplaintStatus);
router.put('/complaints/:complaintId/priority', updateComplaintPriority);

// Users
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetail);
router.put('/users/:userId/ban', banUser);
router.put('/users/:userId/unban', unbanUser);

module.exports = router;
