const mongoose = require('mongoose');

const querySchema = new mongoose.Schema(
  {
    askerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    askerType: {
      type: String,
      enum: ['customer', 'worker'],
      required: true,
    },
    question: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['open', 'answered', 'closed'],
      default: 'open',
    },
    adminReply: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    repliedAt: Date,
  },
  { timestamps: true }
);

querySchema.index({ askerId: 1, createdAt: -1 });
querySchema.index({ status: 1 });

module.exports = mongoose.model('Query', querySchema);
