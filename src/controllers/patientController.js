const asyncHandler = require('express-async-handler');
const Patient = require('../models/Patient');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const { logActivity } = require('../utils/activityLog');

// GET /api/v1/patients/me — every patient (self + family members) linked to the
// logged-in customer. Lazily creates the "self" record on first call, so a customer
// who registered before this feature (or via the backfill script not having run yet)
// still gets one without any extra step.
exports.listMine = asyncHandler(async (req, res) => {
  let patients = await Patient.find({ customer: req.user._id }).sort({ relation: 1, createdAt: 1 });
  if (!patients.some((p) => p.relation === 'self')) {
    const self = await Patient.create({
      customer: req.user._id,
      name: req.user.name,
      gender: undefined,
      relation: 'self',
      phone: req.user.mobile,
      email: req.user.email,
    });
    patients = [self, ...patients];
    logActivity({ actor: req.user, action: 'patient.created', entity: 'Patient', entityId: self._id, description: `${req.user.name}'s own patient profile (${self.patientId}) was auto-created` });
  }
  res.json({ items: patients });
});

// POST /api/v1/patients — add a family member/relative under the logged-in customer.
exports.create = asyncHandler(async (req, res) => {
  const { name, age, gender, relation, phone, email } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required.' });

  const patient = await Patient.create({
    customer: req.user._id,
    name,
    age: age ? Number(age) : undefined,
    gender,
    relation: relation && relation !== 'self' ? relation : 'other',
    phone,
    email,
  });

  logActivity({ actor: req.user, action: 'patient.created', entity: 'Patient', entityId: patient._id, description: `${req.user.name} added family member "${name}" (${patient.patientId})` });
  res.status(201).json(patient);
});

// PATCH /api/v1/patients/:id — edit a family member's (or, at checkout time, the
// customer's own "self" patient's) details. `relation` can't be changed away from
// 'self' on the self record — that identity is fixed.
exports.update = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, customer: req.user._id });
  if (!patient) return res.status(404).json({ message: 'Patient not found.' });

  const fields = patient.relation === 'self'
    ? ['name', 'age', 'gender', 'phone', 'email']
    : ['name', 'age', 'gender', 'relation', 'phone', 'email'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) patient[field] = req.body[field];
  });
  await patient.save();
  res.json(patient);
});

// DELETE /api/v1/patients/:id — blocked if any booking already references this
// patient, so booking/report history never loses its link to a real person.
exports.remove = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, customer: req.user._id });
  if (!patient) return res.status(404).json({ message: 'Patient not found.' });
  if (patient.relation === 'self') return res.status(400).json({ message: 'The self profile cannot be removed.' });

  const bookingCount = await Booking.countDocuments({ patient: patient._id });
  if (bookingCount > 0) {
    return res.status(409).json({ message: `Cannot remove — ${patient.name} has ${bookingCount} booking(s) on record. Their history must stay linked.` });
  }

  await patient.deleteOne();
  logActivity({ actor: req.user, action: 'patient.deleted', entity: 'Patient', entityId: patient._id, description: `${req.user.name} removed family member "${patient.name}" (${patient.patientId})` });
  res.json({ message: 'Patient removed.' });
});

async function assertOwned(req, res) {
  const patient = await Patient.findOne({ _id: req.params.id, customer: req.user._id });
  if (!patient) { res.status(404).json({ message: 'Patient not found.' }); return null; }
  return patient;
}

// GET /api/v1/patients/:id/bookings
exports.bookings = asyncHandler(async (req, res) => {
  const patient = await assertOwned(req, res);
  if (!patient) return;
  const items = await Booking.find({ patient: patient._id, isDeleted: false }).populate('lab', 'name city').sort({ createdAt: -1 });
  res.json({ items });
});

// GET /api/v1/patients/:id/reports
exports.reports = asyncHandler(async (req, res) => {
  const patient = await assertOwned(req, res);
  if (!patient) return;
  const items = await Report.find({ patient: patient._id }).populate('booking', 'bookingNo slotDate').sort({ createdAt: -1 });
  res.json({ items });
});
