const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  // Denormalized from booking.patient at creation time, so "all reports for this
  // patient" can be queried directly without joining through Booking every time.
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storageKey: { type: String },
  fileName: String,
  originalSize: Number,
  fileSize: Number,
  notes: String,
  status: { type: String, enum: ['pending', 'available', 'updated'], default: 'available' },
  sharedToken: { type: String, unique: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
