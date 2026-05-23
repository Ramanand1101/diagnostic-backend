const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  type: { type: String, enum: ['percent', 'flat'], default: 'percent' },
  value: Number,
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: Number,
  validFrom: Date,
  validTo: Date,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
