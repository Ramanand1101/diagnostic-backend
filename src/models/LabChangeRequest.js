const mongoose = require('mongoose');

const labChangeRequestSchema = new mongoose.Schema({
  lab:           { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  requestedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changes:       { type: Object, required: true },       // proposed new field values
  currentValues: { type: Object, required: true },       // snapshot of current values
  status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  adminNote:     { type: String, default: '' },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:    { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('LabChangeRequest', labChangeRequestSchema);
