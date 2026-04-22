const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    skillRequired: { type: String, required: true },

    // Job Details
    description: { type: String, required: true, maxlength: 1000 },
    specialInstructions: String,
    location: {
      address: { type: String, required: true },
      locality: String,
      city: String,
      pincode: String,
      coordinates: { lat: Number, lng: Number },
    },

    // Schedule
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true }, // "14:00"
    estimatedDuration: { type: Number, default: 60 }, // minutes

    // Pricing
    workerRate: { type: Number, required: true },
    durationHours: { type: Number, default: 1 },
    subtotal: { type: Number, required: true },
    platformFeePercent: { type: Number, default: 15 },
    platformFee: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'completed', 'refunded', 'partially_refunded', 'failed'],
      default: 'unpaid',
    },
    paymentMethod: { type: String, enum: ['upi', 'card', 'wallet', 'cash', 'netbanking'] },
    paymentGateway: { type: String, enum: ['razorpay', 'cash'], default: 'razorpay' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: String,
    paidAt: Date,
    refundId: String,
    refundAmount: Number,
    refundStatus: { type: String, enum: ['none', 'pending', 'completed', 'failed'], default: 'none' },
    refundedAt: Date,

    // Status
    status: {
      type: String,
      enum: ['pending', 'accepted', 'arrived', 'rejected', 'in_progress', 'payment_pending', 'completed', 'cancelled'],
      default: 'pending',
    },

    // Timestamps
    requestedAt: { type: Date, default: Date.now },
    acceptedAt: Date,
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    workerAcknowledgedPayment: { type: Boolean, default: false },

    // Cancellation
    cancelledBy: { type: String, enum: ['customer', 'worker', 'admin'] },
    cancellationReason: String,
    cancellationFee: { type: Number, default: 0 },

    // Media
    initialConditionPhoto: String,
    beforePhotos: [String],
    afterPhotos: [String],
    problemPhotos: [String],

    // Complaint
    hasComplaint: { type: Boolean, default: false },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },

    // Worker review by customer
    customerReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },

    // Coupon code
    couponCode: String,
  },
  { timestamps: true }
);

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ workerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
