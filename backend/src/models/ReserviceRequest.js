const mongoose = require('mongoose');

const reserviceRequestSchema = new mongoose.Schema(
  {
    originalBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ['requested', 'scheduled', 'completed'],
      default: 'requested',
    },

    scheduledFor: Date,
    completedAt: Date,

    // Grace deadline: originalBooking.completedAt + 48h
    graceDeadline: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

reserviceRequestSchema.index({ originalBookingId: 1 });
reserviceRequestSchema.index({ customerId: 1 });
reserviceRequestSchema.index({ workerId: 1 });
reserviceRequestSchema.index({ status: 1 });

module.exports = mongoose.model('ReserviceRequest', reserviceRequestSchema);
