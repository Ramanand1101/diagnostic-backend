const mongoose = require('mongoose');

const referralDoctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, default: '' },
  hospital: { type: String, default: '' },
  mobile: { type: String, default: '' },
  email: { type: String, default: '' },
  city: { type: String, default: '' },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', default: null },
  commissionPercent: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

referralDoctorSchema.index({ lab: 1 });
referralDoctorSchema.index({ city: 1 });

module.exports = mongoose.model('ReferralDoctor', referralDoctorSchema);
