const mongoose = require('mongoose');

const integrationSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true }, // 'email' | 'whatsapp' | 'sms' | 'payment'
  provider: { type: String, required: true }, // e.g. 'smtp', 'twilio', 'aws_sns', 'razorpay'
  // Encrypted JSON string (see src/utils/encryption.js) — never returned in plaintext via the API
  configEncrypted: { type: String, default: '' },
  enabled: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('IntegrationSetting', integrationSettingSchema);
