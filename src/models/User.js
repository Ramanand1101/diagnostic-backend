const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: String,
  line1: String,
  city: String,
  state: String,
  pincode: String,
  lat: Number,
  lng: Number
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, unique: true, sparse: true },
  alternateMobile: { type: String, default: '' },
  alternateEmail: { type: String, default: '' },
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['superadmin', 'subadmin', 'lab', 'customer'],
    default: 'customer'
  },
  isActive: { type: Boolean, default: true },
  verified: { type: Boolean, default: true },
  avatar: String,
  addresses: [addressSchema],
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
