const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true },
  otpHash: { type: String, required: true },
  purpose: {
    type: String,
    enum: ['login', 'register', 'verify_email', 'reset_password'],
    default: 'login'
  },
  expiresAt: { type: Date, required: true, index: true },
  attempts: { type: Number, default: 0 },
  verifiedAt: Date,
  isUsed: { type: Boolean, default: false }
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
