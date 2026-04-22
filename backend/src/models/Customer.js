const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Saved Workers
    favoriteWorkers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }],

    // Stats
    totalBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 },
    cancelledBookings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    // Wallet
    walletBalance: { type: Number, default: 0 },

    // Preferences
    preferredSkills: [String],
    preferredRadius: { type: Number, default: 10 }, // km
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
