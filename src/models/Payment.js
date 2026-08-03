const mongoose = require('mongoose');

// One Payment doc = one Razorpay order attempt, covering one or more Bookings (a
// multi-lab-group cart checks out as several Bookings paid together in one order).
// Source of truth for gateway details/history; Booking.paymentStatus stays a fast-read
// denormalized flag so listing/filtering/aggregating bookings doesn't need a join.
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true }],

    amount: { type: Number, required: true }, // rupees — sum of the linked bookings' totals
    currency: { type: String, default: 'INR' },

    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },

    provider: { type: String, default: 'razorpay' },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: String,
    razorpaySignature: String,

    receipt: String,
    failureReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
