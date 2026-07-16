const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  relation: String
}, { _id: false });

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
    price: Number
  }],
  patients: [passengerSchema],
  slotDate: Date,
  slotTime: String,
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
    default: 'pending'
  },
  paymentMethod: { type: String, enum: ['online', 'cash', 'guest'], default: 'online' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed', 'refunded'], default: 'unpaid' },
  subtotal: Number,
  discount: Number,
  tax: Number,
  total: Number,
  coupon: String,
  notes: String,
  prescriptionUrl: String,
  reminderSent: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
