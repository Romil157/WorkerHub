const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'job_request', 'job_accepted', 'job_rejected', 'job_completed', 'job_cancelled',
        'message', 'review_received', 'review_reply', 'complaint_filed', 'complaint_resolved',
        'payment_received', 'payment_failed', 'payout_processed', 'verification_approved',
        'verification_rejected', 'insurance_expiring', 'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedId: mongoose.Schema.Types.ObjectId,
    relatedType: { type: String, enum: ['booking', 'review', 'message', 'complaint', 'payment'] },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    deliveryChannels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
