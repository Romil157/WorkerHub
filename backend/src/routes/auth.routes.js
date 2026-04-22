const express = require('express');
const router = express.Router();
const {
  register, login, sendOTP, verifyOTP, refreshToken, logout, verifyEmail, uploadAvatar, updateProfile, googleLogin
} = require('../controllers/auth.controller');
const { otpLimiter, loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');
const { upload } = require('../services/cloudinary.service');

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/google', loginLimiter, googleLogin);
router.post('/send-otp', otpLimiter, sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.get('/verify-email/:token', verifyEmail);
router.put('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.put('/profile', protect, updateProfile);

module.exports = router;
