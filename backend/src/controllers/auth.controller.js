const User = require('../models/User');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const { AppError } = require('../middleware/errorHandler');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const emailService = require('../services/email.service');
const otpService = require('../services/otp.service');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// POST /api/auth/register
const register = async (req, res) => {
  const { userType, phone, email, name, dateOfBirth, gender, password, city } = req.body;

  if (!['worker', 'customer'].includes(userType)) throw new AppError('Invalid user type', 400);

  const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
  if (existingUser) {
    throw new AppError(
      existingUser.phone === phone ? 'Phone number already registered' : 'Email already registered',
      409, 'DUPLICATE_ENTRY'
    );
  }

  const user = await User.create({
    userType, phone, email, name, dateOfBirth, gender,
    passwordHash: password,
    city: city || '',
    status: 'active',
  });

  // Create role-specific profile
  if (userType === 'worker') {
    await Worker.create({ userId: user._id, registrationStep: 1 });
  } else {
    await Customer.create({ userId: user._id });
  }

  // Send verification email
  const verifyToken = crypto.randomBytes(32).toString('hex');
  user.otp = verifyToken;
  user.otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  await emailService.sendEmailVerification(email, name, verifyToken);

  const accessToken = generateAccessToken(user._id, userType);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email.',
    data: { user, accessToken, refreshToken },
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  const { phone, email, password, otp, userType } = req.body;

  const query = phone ? { phone } : { email };
  const user = await User.findOne({ ...query, userType });
  if (!user) throw new AppError('Invalid credentials', 401, 'AUTHENTICATION_FAILED');
  if (user.isBanned) throw new AppError('Your account has been banned. Contact support.', 403);

  // OTP login
  if (otp) {
    if (!user.verifyOTP(otp)) throw new AppError('Invalid or expired OTP', 401, 'AUTHENTICATION_FAILED');
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.phoneVerified = true;
  } else if (password) {
    const valid = await user.comparePassword(password);
    if (!valid) throw new AppError('Invalid credentials', 401, 'AUTHENTICATION_FAILED');
  } else {
    throw new AppError('Provide password or OTP', 400);
  }

  user.lastLogin = new Date();
  const accessToken = generateAccessToken(user._id, user.userType);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
};

// POST /api/auth/send-otp
const sendOTP = async (req, res) => {
  const { phone, purpose } = req.body; // purpose: login | verify
  const user = await User.findOne({ phone });
  if (!user) throw new AppError('Phone number not registered', 404);

  const otp = user.generateOTP();
  await user.save();

  // Try real Twilio, fallback to console log
  try {
    await otpService.sendSMS(phone, `Your WorkerHub OTP is: ${otp}. Valid for 10 minutes.`);
  } catch {
    console.log(`[DEV] OTP for ${phone}: ${otp}`); // dev fallback
  }

  res.json({ success: true, message: 'OTP sent successfully' });
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ phone });
  if (!user) throw new AppError('User not found', 404);

  if (!user.verifyOTP(otp)) throw new AppError('Invalid or expired OTP', 400);

  user.otp = undefined;
  user.otpExpiresAt = undefined;
  user.phoneVerified = true;
  await user.save();

  const accessToken = generateAccessToken(user._id, user.userType);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.json({ success: true, message: 'OTP verified', data: { user, accessToken, refreshToken } });
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) throw new AppError('Refresh token required', 400);

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  // Dev bypass: if DB is not connected, just re-issue from JWT payload
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    const newAccessToken = generateAccessToken(decoded.userId, decoded.role || 'worker');
    return res.json({ success: true, data: { accessToken: newAccessToken } });
  }

  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== token) throw new AppError('Invalid refresh token', 401);

  const newAccessToken = generateAccessToken(user._id, user.userType);
  res.json({ success: true, data: { accessToken: newAccessToken } });
};

// POST /api/auth/logout
const logout = async (req, res) => {
  req.user.refreshToken = undefined;
  await req.user.save();
  res.json({ success: true, message: 'Logged out successfully' });
};

// GET /api/auth/verify-email/:token
const verifyEmail = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ otp: token, otpExpiresAt: { $gt: new Date() } });
  if (!user) throw new AppError('Invalid or expired verification link', 400);

  user.emailVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully' });
};

// PUT /api/auth/avatar (shared by customer + worker)
const uploadAvatar = async (req, res) => {
  const cloudinaryService = require('../services/cloudinary.service');
  if (!req.file) throw new AppError('Image file is required', 400);
  const result = await cloudinaryService.uploadFile(req.file.buffer, 'avatars');
  await User.findByIdAndUpdate(req.userId, { avatar: result.secure_url });
  res.json({ success: true, message: 'Avatar updated', data: { avatar: result.secure_url } });
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  const { name, city, primaryAddress } = req.body;
  const user = await User.findById(req.userId);
  if (!user) throw new AppError('User not found', 404);

  if (name) user.name = name;
  if (city) user.city = city.trim();
  
  if (primaryAddress) {
    user.primaryAddress = {
      address: primaryAddress.address || '',
      city: primaryAddress.city || user.city || '',
      pincode: primaryAddress.pincode || '',
      label: 'Home'
    };
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
};

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE');

// POST /api/auth/google
const googleLogin = async (req, res) => {
  const { credential, userType } = req.body; // userType is optional but required if registering new user
  if (!credential) throw new AppError('Google token is missing', 400);

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
    });
    payload = ticket.getPayload();
  } catch (error) {
    throw new AppError('Invalid Google Token', 401);
  }

  const { email, name, picture, sub: googleId } = payload;

  let user = await User.findOne({ email });

  if (!user) {
    // Register New User
    if (!userType || !['worker', 'customer'].includes(userType)) {
      throw new AppError('User type (worker or customer) required for new Google registration', 400);
    }
    
    user = await User.create({
      userType, 
      email, 
      name, 
      avatar: picture,
      phone: `+00${googleId.substring(0, 8)}`, // Fallback for schema required phone
      passwordHash: crypto.randomBytes(16).toString('hex'), // Random unguessable password
      city: '',
      status: 'active',
      isVerified: true, // Google emails are pre-verified
      emailVerified: true
    });

    if (userType === 'worker') {
      await Worker.create({ userId: user._id, registrationStep: 1 });
    } else {
      await Customer.create({ userId: user._id });
    }
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Google Login successful',
    data: { user, accessToken, refreshToken },
  });
};

module.exports = {
  register, login, sendOTP, verifyOTP, refreshToken, logout, verifyEmail, uploadAvatar, updateProfile, googleLogin
};
