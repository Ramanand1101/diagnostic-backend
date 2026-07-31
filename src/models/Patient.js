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

patientSchema.pre('save', async function (next) {
  if (!this.patientId) {
    this.patientId = await generateDatedId('PAT', new Date());
  }
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
