// One-time (but safe to re-run — every step is skip-if-already-done) backfill for the
// Customer ID / Patient ID feature. Run with: node src/seed/backfillPatientIds.js
//
// What it does, in order:
//   1. Every existing `role: 'customer'` User without a customerId gets one, dated
//      from their own createdAt (not "today") so IDs stay historically meaningful.
//   2. Every such customer gets a "self" Patient record if they don't have one yet.
//   3. Every existing Booking without a `patient` ref gets migrated from its legacy
//      embedded `patients[0]` (the only entry that was ever actually sent — the
//      checkout form has only ever collected one patient historically): find-or-create
//      a matching Patient under that booking's customer (deduped by name+age+relation
//      so the same family member across many past bookings maps to one Patient),
//      then set booking.patient + booking.patientSnapshot. A legacy booking with more
//      than one embedded patient is left alone and logged for manual review, rather
//      than auto-split — splitting a real historical booking risks corrupting its
//      payment total / report links.
//   4. Every existing Report without a `patient` gets it copied from its Booking.
require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const { generateDatedId } = require('../utils/idGenerator');

async function backfillCustomerIds() {
  const users = await User.find({ role: 'customer', customerId: { $in: [null, undefined] } });
  console.log(`[1/4] Backfilling customerId for ${users.length} customer(s)...`);
  for (const user of users) {
    user.customerId = await generateDatedId('CUST', user.createdAt || new Date());
    await user.save();
  }
  console.log(`[1/4] Done.`);
}

async function backfillSelfPatients() {
  const customers = await User.find({ role: 'customer' });
  let created = 0;
  console.log(`[2/4] Ensuring a "self" Patient exists for ${customers.length} customer(s)...`);
  for (const user of customers) {
    const hasSelf = await Patient.exists({ customer: user._id, relation: 'self' });
    if (hasSelf) continue;
    await Patient.create({
      customer: user._id,
      name: user.name,
      relation: 'self',
      phone: user.mobile,
      email: user.email,
    });
    created += 1;
  }
  console.log(`[2/4] Created ${created} self-patient record(s).`);
}

// Find (or create) the Patient this legacy embedded entry refers to, deduping on
// name+age+relation within the same customer so repeated historical bookings for the
// same family member collapse onto one Patient instead of creating duplicates.
async function findOrCreatePatientFromLegacy(customerId, legacy) {
  const name = (legacy.name || '').trim();
  if (!name) return null;

  const match = await Patient.findOne({
    customer: customerId,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    age: legacy.age ?? undefined,
    relation: legacy.relation || 'self',
  });
  if (match) return match;

  return Patient.create({
    customer: customerId,
    name,
    age: legacy.age,
    gender: legacy.gender,
    relation: legacy.relation === 'self' ? 'self' : (legacy.relation || 'other'),
  });
}

async function backfillBookingPatients() {
  // .lean() is essential here: `patients` was removed from the Booking schema (replaced
  // by `patient`/`patientSnapshot`), so a normal hydrated Mongoose document would silently
  // drop that now-undeclared field. .lean() returns the raw stored document instead,
  // which still has the old array on any booking created before this migration.
  const bookings = await Booking.find({ patient: { $in: [null, undefined] } }).select('_id user patients').lean();
  console.log(`[3/4] Migrating ${bookings.length} legacy booking(s)...`);
  let migrated = 0;
  let flagged = 0;

  for (const booking of bookings) {
    const legacyPatients = booking.patients || [];
    if (!booking.user) {
      console.warn(`  ! booking ${booking._id} has no user — skipped, needs manual review.`);
      flagged += 1;
      continue;
    }
    if (legacyPatients.length > 1) {
      console.warn(`  ! booking ${booking._id} had ${legacyPatients.length} embedded patients — only the first was migrated automatically. Review manually if the rest matter.`);
      flagged += 1;
    }

    const legacy = legacyPatients[0] || {};
    const patient = await findOrCreatePatientFromLegacy(booking.user, legacy);
    if (!patient) {
      console.warn(`  ! booking ${booking._id} had no usable embedded patient name — left unmigrated.`);
      flagged += 1;
      continue;
    }

    await Booking.updateOne(
      { _id: booking._id },
      {
        $set: {
          patient: patient._id,
          patientSnapshot: { name: patient.name, age: patient.age, gender: patient.gender, relation: patient.relation },
        },
      }
    );
    migrated += 1;
  }
  console.log(`[3/4] Migrated ${migrated} booking(s), flagged ${flagged} for manual review.`);
}

async function backfillReportPatients() {
  const reports = await Report.find({ patient: { $in: [null, undefined] } }).select('_id booking');
  console.log(`[4/4] Backfilling patient on ${reports.length} report(s)...`);
  let migrated = 0;
  for (const report of reports) {
    const booking = await Booking.findById(report.booking).select('patient');
    if (!booking?.patient) continue;
    await Report.updateOne({ _id: report._id }, { $set: { patient: booking.patient } });
    migrated += 1;
  }
  console.log(`[4/4] Backfilled ${migrated} report(s).`);
}

(async () => {
  await connectDB();
  console.log(`Connected to: ${mongoose.connection.name} (make sure this is the database you intend to migrate)`);

  await backfillCustomerIds();
  await backfillSelfPatients();
  await backfillBookingPatients();
  await backfillReportPatients();

  console.log('Backfill complete.');
  process.exit(0);
})().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
