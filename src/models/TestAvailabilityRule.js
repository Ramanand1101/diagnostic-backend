const mongoose = require('mongoose');

// Hierarchical test/package availability. `scope` decides which labs a rule applies to
// (mirrors LabHoliday's scope pattern) — priority when multiple rules match is always
// resolved highest-specificity-wins: lab > city > state > brand, and within any scope,
// a date-specific override (specificDates/dateRange/temporaryDisable/permanentDisable)
// always beats a recurring pattern (everyday/selectedDays/alternateDays/customRecurring).
// See src/utils/testAvailability.js for the actual resolution algorithm.
const testAvailabilityRuleSchema = new mongoose.Schema({
  // Which test/package this rule governs. Null = a blanket default for every test at
  // this scope (lets an admin set a brand-wide rule once instead of per-test).
  testMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'TestMaster', default: null, index: true },

  scope: { type: String, enum: ['brand', 'state', 'city', 'lab'], required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null },
  state: { type: String, default: '' },
  city: { type: String, default: '' },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', default: null },

  scheduleType: {
    type: String,
    enum: [
      'everyday', 'selectedDays', 'alternateDays', 'specificDates',
      'dateRange', 'customRecurring', 'temporaryDisable', 'permanentDisable',
    ],
    required: true,
  },
  daysOfWeek: { type: [Number], default: [] },       // selectedDays — 0=Sunday..6=Saturday
  alternateAnchorDate: { type: Date, default: null }, // alternateDays — availability falls every 2nd day counting from here
  specificDates: { type: [Date], default: [] },       // specificDates — the exact dates this IS available
  customIntervalDays: { type: Number, default: null }, // customRecurring — available every N days from alternateAnchorDate

  // dateRange = available only between these dates. temporaryDisable/permanentDisable =
  // UNAVAILABLE between these dates (permanentDisable typically leaves effectiveTo unset).
  effectiveFrom: { type: Date, default: null },
  effectiveTo: { type: Date, default: null },

  // Optional overrides layered on top of the base availability verdict
  homeCollectionAvailable: { type: Boolean, default: null }, // null = inherit Product/TestMaster default
  timeSlots: { type: [String], default: [] },                // empty = all slots allowed

  reason: { type: String, default: '' }, // e.g. "Machine Maintenance", "Technician Not Available"
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

testAvailabilityRuleSchema.index({ testMaster: 1, scope: 1, active: 1 });
testAvailabilityRuleSchema.index({ lab: 1, active: 1 });
testAvailabilityRuleSchema.index({ city: 1, active: 1 });
testAvailabilityRuleSchema.index({ state: 1, active: 1 });
testAvailabilityRuleSchema.index({ brand: 1, active: 1 });

module.exports = mongoose.model('TestAvailabilityRule', testAvailabilityRuleSchema);
