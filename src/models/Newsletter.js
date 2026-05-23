const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  source: String,
  subscribed: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', newsletterSchema);
