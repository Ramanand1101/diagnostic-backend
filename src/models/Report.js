const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
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
