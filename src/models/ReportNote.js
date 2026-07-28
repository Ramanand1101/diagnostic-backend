const mongoose = require('mongoose');

// A customer's private, personal reminder attached to one of their own reports —
// e.g. "Show this to Dr. Sharma", "Repeat CBC after 3 months". Entirely separate from
// the uploaded report file/Report doc itself; never modifies or is shown alongside it
// to the lab, corporate users, or other customers.
const reportNoteSchema = new mongoose.Schema({
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  note: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ReportNote', reportNoteSchema);
