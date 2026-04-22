const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    avatar: String,
    role: {
      type: String,
      enum: ['super_admin', 'verification_admin', 'complaint_admin', 'analytics_admin'],
      default: 'verification_admin',
    },
    permissions: [String],
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

adminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
