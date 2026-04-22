const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true },
    description: String,
    icon: { type: String, default: '🔧' },
    color: { type: String, default: '#D4501D' },
    isActive: { type: Boolean, default: true },
    averageRate: { type: Number, default: 300 },
    totalWorkers: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Skill', skillSchema);
