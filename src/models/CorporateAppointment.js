const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  employeeId: String,
}, { _id: false });

const rescheduleEntrySchema = new mongoose.Schema({
  fromDate: Date,
  fromTime: String,
  fromLab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  toDate: Date,
  toTime: String,
  toLab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  reason: String,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const corporateAppointmentSchema = new mongoose.Schema({
  appointmentNo: { type: String, unique: true, index: true },
  corporate: { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', required: true, index: true },
  employee: employeeSchema,
  // Auto-linked self-service login (role: 'employee') for this appointment's employee, when their email was provided
  employeeUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'CorporatePackage', default: null },
  items: [{ name: String, price: Number }],
  // Billable amount, snapshotted at creation (package's negotiated price, or sum of item prices)
  amount: { type: Number, default: 0 },
  slotDate: Date,
  slotTime: String,
  city: String,
  state: String,

  status: {
    type: String,
    enum: ['pending', 'sent_to_lab', 'confirmed', 'alternate_requested', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
    index: true,
  },

  alternateRequest: {
    type: { type: String, enum: ['date', 'lab', null], default: null },
    note: String,
    requestedAt: Date,
  },

  rescheduleHistory: [rescheduleEntrySchema],

  confirmationSentAt: Date,
  confirmationChannels: [String], // e.g. ['email', 'whatsapp']

  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
  cancelReason: String,

  source: { type: String, enum: ['manual', 'excel'], default: 'manual' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Test report uploaded against this appointment
  reportKey: String,
  reportFileName: String,
  reportUploadedAt: Date,
  reportUploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // 'partial' = some tests still pending (see missingTests) — not billable yet.
  // 'complete' = every test is in the report — this is what unlocks billing.
  reportStatus: { type: String, enum: ['none', 'partial', 'complete'], default: 'none' },
  missingTests: [String],

  // Set once billed on a CorporateInvoice, so it isn't double-billed
  invoiced: { type: Boolean, default: false, index: true },
}, { timestamps: true });

corporateAppointmentSchema.index({ corporate: 1, createdAt: -1 });
corporateAppointmentSchema.index({ lab: 1, slotDate: 1 });

module.exports = mongoose.model('CorporateAppointment', corporateAppointmentSchema);
