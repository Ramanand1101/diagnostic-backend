const mongoose = require('mongoose');

// A single holiday rule. `scope` decides which labs it applies to:
//   'lab'   → exactly `lab`
//   'city'  → every approved lab whose city matches (case-insensitive)
//   'state' → every approved lab whose state matches (case-insensitive)
//   'all'   → every approved lab in the system
// `recurrence` decides which date(s) it blocks:
//   'once'   → `date` only
//   'range'  → every day from `startDate` to `endDate` inclusive
//   'weekly' → every occurrence of `dayOfWeek` (0=Sunday..6=Saturday), open-ended
const labHolidaySchema = new mongoose.Schema({
  scope: { type: String, enum: ['lab', 'city', 'state', 'all'], required: true },
  lab:   { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', default: null },
  city:  { type: String, default: '' },
  state: { type: String, default: '' },

  recurrence: { type: String, enum: ['once', 'range', 'weekly'], required: true },
  date:      { type: Date, default: null },        // 'once'
  startDate: { type: Date, default: null },         // 'range'
  endDate:   { type: Date, default: null },         // 'range'
  dayOfWeek: { type: Number, min: 0, max: 6, default: null }, // 'weekly'

  reason: { type: String, default: '' },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

labHolidaySchema.index({ scope: 1, active: 1 });
labHolidaySchema.index({ lab: 1, active: 1 });
labHolidaySchema.index({ city: 1, active: 1 });
labHolidaySchema.index({ state: 1, active: 1 });

module.exports = mongoose.model('LabHoliday', labHolidaySchema);
