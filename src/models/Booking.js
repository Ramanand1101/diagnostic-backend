const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNo: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guest: {
    name: String,
    mobile: String,
    email: String
  },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    qty: { type: Number, default: 1 },
    price: Number,
    // Lab payout snapshot, taken from Product.labPrice at booking time — null if
    // that product had no lab price configured yet (see labPayable/adminProfit below).
    labPrice: { type: Number, default: null },
  }],
  // Who the tests in this booking are for — always exactly one person (the customer
  // themselves or a family member); mixed-patient carts create one Booking per patient.
  // `patientSnapshot` freezes the name/age/gender/relation as of booking time, so this
  // booking still displays correctly even if the Patient profile is edited/removed later.
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  patientSnapshot: {
    name: String,
    age: Number,
    gender: String,
    relation: String,
  },
  slotDate: { type: Date, required: true },
  slotTime: { type: String, required: true },
  visitType: { type: String, enum: ['home', 'lab'], default: 'lab' },
  address: {
    line1: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'collected', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'confirmed'
  },
  paymentMethod: { type: String, enum: ['online', 'cash', 'guest'], default: 'online' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed', 'refunded'], default: 'unpaid' },
  subtotal: Number,
  discount: Number,
  tax: Number,
  total: Number,
  // Lab settlement fields — null (not 0) when unknown, so reporting can exclude
  // rather than misreport bookings placed before/against unpriced products.
  labPayable:  { type: Number, default: null },  // Σ(item.labPrice * item.qty) across priced items
  adminProfit: { type: Number, default: null },  // total - labPayable, only set when labPayable is known
  settlementStatus: { type: String, enum: ['unsettled', 'settled'], default: 'unsettled', index: true },
  settlement: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement', default: null, index: true },
  coupon: String,
  notes: String,
  prescriptionUrl: String,
  cancelledByName: String,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reminderSent: { type: Boolean, default: false },
  // 'partial' = some tests still pending (see missingTests). 'complete' = every test is in.
  // Mirrors the same reportStatus/missingTests pattern used on CorporateAppointment.
  reportStatus: { type: String, enum: ['none', 'partial', 'complete'], default: 'none' },
  missingTests: [String],
  reportReminderSentAt: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
}, { timestamps: true });

// Compound indexes for all common query patterns
bookingSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });
bookingSchema.index({ lab:  1, isDeleted: 1, createdAt: -1 });
bookingSchema.index({ lab:  1, slotDate:  1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ paymentStatus: 1, createdAt: -1 });
bookingSchema.index({ lab: 1, settlementStatus: 1, paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
