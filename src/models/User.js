const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateDatedId } = require('../utils/idGenerator');

const addressSchema = new mongoose.Schema({
  label: String,
  line1: String,
  area: String,
  city: String,
  state: String,
  pincode: String,
  lat: Number,
  lng: Number
}, { _id: false });

// Granular module permission — a subadmin can be granted specific actions per module,
// e.g. { module: 'labs', actions: ['view', 'edit'] } without 'create'/'delete'.
const permissionEntrySchema = new mongoose.Schema({
  module: { type: String, required: true },
  actions: { type: [String], default: [] }, // subset of ['view', 'create', 'edit', 'delete']
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, unique: true, sparse: true },
  alternateMobile: { type: String, default: '' },
  alternateEmail: { type: String, default: '' },
  // Staged email/mobile awaiting OTP confirmation — never applied to the real
  // email/mobile fields until verifyOtpRecord succeeds for it.
  pendingEmail: { type: String, default: null },
  pendingMobile: { type: String, default: null },
  password: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true },
  role: {
    type: String,
    enum: ['superadmin', 'subadmin', 'hot_employee', 'lab', 'corporate', 'employee', 'customer'],
    default: 'customer'
  },
  // Human-readable, permanent account identifier — only meaningful for role: 'customer'
  // (per the Customer/Patient ID feature). Other roles never get one.
  customerId: { type: String, unique: true, sparse: true, index: true },
  isActive: { type: Boolean, default: true },
  verified: { type: Boolean, default: true },
  avatar: String,
  addresses: [addressSchema],
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  lastLoginAt: Date,
  // Granular per-module permissions — only meaningful for role: 'subadmin'. Empty by
  // default, so a freshly created/promoted subadmin has ZERO access until explicitly granted.
  permissions: { type: [permissionEntrySchema], default: [] },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.pre('save', async function(next) {
  if (this.role === 'customer' && !this.customerId) {
    this.customerId = await generateDatedId('CUST', new Date());
  }
  next();
});

userSchema.methods.matchPassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
