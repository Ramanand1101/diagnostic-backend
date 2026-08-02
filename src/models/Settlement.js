const mongoose = require('mongoose');

// Snapshot of each booking included in this settlement — frozen at generation time
// so the settlement's figures stay correct even if the booking is edited later.
const settlementLineItemSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  bookingNo: String,
  patientName: String,
  date: Date,
  adminPrice: Number,
  labPrice: Number,
  adminProfit: Number,
}, { _id: false });

const settlementSchema = new mongoose.Schema({
  settlementNo: { type: String, unique: true, index: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
  periodFrom: Date,
  periodTo: Date,
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  lineItems: [settlementLineItemSchema],
  totalAdminRevenue: { type: Number, default: 0 },
  totalLabPayable:   { type: Number, default: 0 },
  totalAdminProfit:  { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending', index: true },
  paymentReference: String,
  paymentMethod: String,
  notes: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt: Date,
}, { timestamps: true });

settlementSchema.index({ lab: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
