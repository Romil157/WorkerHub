const mongoose = require('mongoose');

const portfolioImageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  skill: String,
  beforeAfter: { type: String, enum: ['before', 'after', 'single'], default: 'single' },
  isAIFlagged: { type: Boolean, default: false },
  aiConfidence: { type: Number, default: 0 }, // 0-1
  flaggedAt: Date,
  adminReview: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt: Date,
});

const workerSkillSchema = new mongoose.Schema({
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  skillName: { type: String, required: true },
  experience: { type: Number, default: 0 }, // years
  certified: { type: Boolean, default: false },
  certification: String, // URL
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  ratePerHour: { type: Number, required: true, default: 200 },
});

const availabilitySlotSchema = new mongoose.Schema({
  date: Date,
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '18:00' },
  isAvailable: { type: Boolean, default: true },
});

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Aadhar Verification
    aadhar: {
      number: String, // stored encrypted in production
      fullName: String,
      frontPhoto: String, // Cloudinary URL
      backPhoto: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verificationProvider: { type: String, enum: ['Digio', 'Signzy', 'Manual'], default: 'Manual' },
      ocrData: { type: mongoose.Schema.Types.Mixed }, // extracted OCR fields
      verificationResult: {
        verdict: { type: String, enum: ['pass', 'flag_for_review', 'reject'] },
        overallConfidence: Number,
        checks: {
          checksumValid: Boolean,
          qrCrossCheck: { type: String, enum: ['match', 'mismatch', 'unreadable'] },
          ocrCrossCheck: { type: String, enum: ['match', 'mismatch', 'unreadable', 'skipped'] },
          aiGeneratedScore: Number,
          aiDetectionProvider: String
        },
        reasons: [String]
      }
    },

    // Life Insurance
    insurance: {
      provider: String,
      policyNumber: String,
      holderName: String,
      coverageAmount: Number,
      policyDocument: String, // PDF URL
      startDate: Date,
      endDate: Date,
      premium: Number,
      premiumFrequency: { type: String, enum: ['monthly', 'yearly'] },
      status: { type: String, enum: ['pending', 'active', 'expired', 'rejected'], default: 'pending' },
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    },

    // Skills
    skills: [workerSkillSchema],
    primarySkill: String,

    // Profile
    bio: { type: String, maxlength: 500 },
    yearsExperience: { type: Number, default: 0 },
    cityOfOperation: String,

    // Work Portfolio
    portfolio: [portfolioImageSchema],

    // Bank Details (encrypted in production)
    bankDetails: {
      bankName: String,
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      upiId: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },

    // Pan Card (optional)
    panNumber: String,

    // Stats
    overallRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 },
    responseTime: { type: Number, default: 0 }, // avg minutes
    totalEarnings: { type: Number, default: 0 },
    todayEarnings: { type: Number, default: 0 },
    monthEarnings: { type: Number, default: 0 },

    // Availability
    availabilityCalendar: [availabilitySlotSchema],
    isAvailableNow: { type: Boolean, default: true },

    // Wallet
    walletBalance: { type: Number, default: 0 },
    lastPayout: Date,

    // Location (GeoJSON for geo-queries)
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // Verification Status
    verificationStatus: {
      type: String,
      enum: ['incomplete', 'pending', 'verified', 'rejected'],
      default: 'incomplete',
    },
    verificationDocuments: {
      aadhar: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      insurance: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      bankDetails: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      portfolio: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    },
    verificationNotes: String,
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    rejectionReason: String,

    // Registration Step Tracking
    registrationStep: { type: Number, default: 1, min: 1, max: 6 },
    registrationComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for geo-queries
workerSchema.index({ location: '2dsphere' });
workerSchema.index({ verificationStatus: 1 });
workerSchema.index({ 'skills.skillName': 1 });
workerSchema.index({ overallRating: -1 });

module.exports = mongoose.model('Worker', workerSchema);
