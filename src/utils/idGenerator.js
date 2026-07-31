const Counter = require('../models/Counter');

// Same date-prefixed, atomic-sequence pattern as bookingController's nextBookingNo,
// generalized for any prefix — e.g. generateDatedId('CUST', user.createdAt) → "CUST-24072026-0001".
// The counter key is scoped per prefix+day, so different ID kinds (customer/patient) and
// different days never collide or share a sequence.
async function generateDatedId(prefix, date = new Date()) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const dateKey = `${prefix.toLowerCase()}-${dd}${mm}${yyyy}`;
  const seq = await Counter.nextSeq(dateKey, 0);
  return `${prefix}-${dd}${mm}${yyyy}-${String(seq).padStart(4, '0')}`;
}

module.exports = { generateDatedId };
