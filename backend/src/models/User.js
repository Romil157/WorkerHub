const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  address: { type: String, required: true },
  locality: String,
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  coordinates: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  label: { type: String, enum: ['Home', 'Office', 'Other'], default: 'Home' },
});

const userSchema = new mongoose.Schema(
  {
    userType: { type: String, enum: ['worker', 'customer'], required: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['M', 'F', 'Other'] },
    avatar: { type: String, default: '' },
    city: { type: String, trim: true },
    primaryAddress: addressSchema,
    addresses: [addressSchema],

    // Verification flags
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // Auth
    passwordHash: { type: String },
    refreshToken: { type: String },
    lastLogin: Date,

    // OTP (temp, TTL-based)
    otp: String,
    otpExpiresAt: Date,

    // Status
    status: { type: String, enum: ['active', 'banned', 'suspended', 'pending'], default: 'active' },
    isBanned: { type: Boolean, default: false },
    banReason: String,
    bannedAt: Date,
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate and store OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

userSchema.methods.verifyOTP = function (candidateOTP) {
  return this.otp === candidateOTP && this.otpExpiresAt > new Date();
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshToken;
  delete obj.otp;
  delete obj.otpExpiresAt;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
