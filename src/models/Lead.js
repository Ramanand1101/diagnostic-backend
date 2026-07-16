const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, default: '' },
  source: {
    type: String,
    enum: ['walk-in', 'call', 'whatsapp', 'online', 'referral', 'other'],
    default: 'call'
  },
  interestedIn: { type: String, default: '' },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', default: null },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralDoctor', default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'converted', 'lost'],
    default: 'new'
  },
  notes: { type: String, default: '' },
  followUpDate: { type: Date, default: null },
  convertedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
}, { timestamps: true });

leadSchema.index({ status: 1 });
leadSchema.index({ lab: 1 });
leadSchema.index({ followUpDate: 1 });

module.exports = mongoose.model('Lead', leadSchema);
