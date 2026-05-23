const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileUrl: { type: String, required: true },
  storageKey: { type: String },
  fileName: String,
  status: { type: String, enum: ['pending', 'available', 'updated'], default: 'available' },
  sharedToken: { type: String, unique: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
