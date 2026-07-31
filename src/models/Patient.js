const mongoose = require('mongoose');
const { generateDatedId } = require('../utils/idGenerator');

// One document per individual a customer books tests for — themselves ("self") or a
// family member/relative. Every Booking/Report links to one of these via `patient`,
// so history stays attached to the right person even across many separate bookings.
const patientSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patientId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  relation: { type: String, enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'other'], default: 'self' },
  phone: String,
  email: String,
}, { timestamps: true });

// pre('validate') — not pre('save') — because Mongoose runs schema validation
// (including this field's `required: true`) BEFORE pre('save') hooks fire. Generating
// the ID here means it exists by the time the required-field check runs.
patientSchema.pre('validate', async function (next) {
  if (!this.patientId) {
    this.patientId = await generateDatedId('PAT', new Date());
  }
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
