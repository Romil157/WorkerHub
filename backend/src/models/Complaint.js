const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema({
  action: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByRole: { type: String, enum: ['customer', 'worker', 'admin', 'system'] },
  timestamp: { type: Date, default: Date.now },
  notes: String,
});

const complaintSchema = new mongoose.Schema(
  {
    complainantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    complainantType: { type: String, enum: ['customer', 'worker'], required: true },
    respondentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },

    reason: { type: String, required: true },
    description: { type: String, required: true, maxlength: 2000 },
    attachments: [String],

    status: {
      type: String,
      enum: ['open', 'in_progress', 'under_review', 'escalated', 'resolved', 'closed'],
      default: 'open',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

    // Admin
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    assignedAt: Date,

    // Resolution
    resolution: {
      type: String,
      enum: ['full_refund', 'partial_refund', 'rework', 'no_action', 'warning_issued', 'worker_warning', 'worker_ban', 'dismissed'],
    },
    resolutionAmount: Number,
    resolutionNotes: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // Timeline
    timeline: [timelineEntrySchema],
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, priority: -1 });
complaintSchema.index({ complainantId: 1 });
complaintSchema.index({ bookingId: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
