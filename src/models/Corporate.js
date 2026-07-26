const mongoose = require('mongoose');

const hrSchema = new mongoose.Schema({
  name: String,
  department: String,
  email: String,
  phone: String,
  emails: [String],
  phones: [String],
  address: String,
  city: String,
  state: String,
  pincode: String,
}, { _id: false });

const agreementSchema = new mongoose.Schema({
  startDate: Date,
  expiryDate: Date,
  notes: String,
  reminder60SentAt: Date,
  reminder30SentAt: Date,
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const corporateSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  spocName: String,
  email: { type: String, required: true },
  phone: { type: String, required: true },
  emails: [String],
  phones: [String],
  address: String,
  city: { type: String, index: true },
  state: String,
  pincode: String,
  gstNumber: String,
  // Allowed email domain(s) for this corporate — company/HR/account-manager emails must match one of these
  domains: [String],
  hr: hrSchema,

  // Login users (role: 'corporate') who can schedule appointments on this account's behalf
  owners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Subset of `owners` additionally flagged as HR — they can view this account's billing
  hrOwners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Labs this corporate is allowed to book appointments with
  assignedLabs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lab' }],
  // HealthOnTime staff (subadmin/superadmin) responsible for this account
  relationshipManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Packages assigned to this corporate, with a possibly negotiated price override
  packages: [{
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'CorporatePackage' },
    price: Number,
    assignedAt: { type: Date, default: Date.now },
  }],

  creditLimit: { type: Number, default: 0 },
  active: { type: Boolean, default: true },

  // Mirrors the most recent entry in `agreements` below — kept in sync so existing
  // reminder-cron / UI code that reads these top-level fields keeps working unchanged.
  agreementStartDate: Date,
  agreementExpiryDate: Date,
  // Set when the expiry reminder for that threshold has already gone out, so it isn't repeated daily
  agreementReminder60SentAt: Date,
  agreementReminder30SentAt: Date,
  // Full agreement history — a corporate can be re-signed multiple times over its lifetime
  agreements: [agreementSchema],

  settings: {
    // Days before agreementExpiryDate to send a reminder (default: 60 and 30 days)
    reminderDaysBefore: { type: [Number], default: [60, 30] },
    // Default channels used when notifying employees of appointment updates
    defaultNotifyChannels: { type: [String], default: ['email'] },
    // Whether employee self-service logins for this corporate may download their own reports
    employeeCanDownloadReport: { type: Boolean, default: true },
  },

  notes: String,
}, { timestamps: true });

corporateSchema.index({ companyName: 'text', city: 'text' });

module.exports = mongoose.model('Corporate', corporateSchema);
