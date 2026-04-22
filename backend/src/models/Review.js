const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerType: { type: String, enum: ['customer', 'worker'], required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, maxlength: 1000 },
    photos: [String],

    isAnonymous: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true }, // verified purchase

    // Worker reply
    reply: {
      text: String,
      repliedAt: Date,
    },

    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    helpfulVoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

reviewSchema.index({ reviewedId: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
