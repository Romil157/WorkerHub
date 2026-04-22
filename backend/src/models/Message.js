const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    conversationId: { type: String, required: true }, // sorted userId pair: "uid1_uid2"

    text: { type: String, maxlength: 2000 },
    type: { type: String, enum: ['text', 'image', 'document', 'quick_reply'], default: 'text' },
    attachments: [{ url: String, type: { type: String }, filename: String }],
    quickReply: String,

    isRead: { type: Boolean, default: false },
    readAt: Date,
    deliveredAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);
