const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'CorporateAppointment' },
  appointmentNo: String,
  employeeName: String,
  date: Date,
  description: String,
  amount: Number,
}, { _id: false });

const corporateInvoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, unique: true, index: true },
  corporate: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', required: true, index: true },
  periodFrom: Date,
  periodTo: Date,
  appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CorporateAppointment' }],
  lineItems: [lineItemSchema],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent', 'paid'], default: 'draft' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('CorporateInvoice', corporateInvoiceSchema);
