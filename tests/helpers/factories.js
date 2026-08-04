const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../../src/models/User');
const Lab = require('../../src/models/Lab');
const Product = require('../../src/models/Product');
const Patient = require('../../src/models/Patient');
const Booking = require('../../src/models/Booking');

let counter = 0;
const uniq = (prefix) => `${prefix}${Date.now()}${counter++}`;

async function createUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `${uniq('user')}@example.com`,
    mobile: `9${String(Date.now()).slice(-9)}`,
    password: 'Password123!',
    role: 'customer',
    verified: true,
    ...overrides,
  });
}

async function createLab(overrides = {}) {
  return Lab.create({
    name: 'Test Diagnostics Lab',
    slug: uniq('test-lab-'),
    city: 'Lucknow',
    approved: true,
    ...overrides,
  });
}

async function createProduct(lab, overrides = {}) {
  return Product.create({
    name: 'CBC Test',
    slug: uniq('cbc-test-'),
    lab: lab._id,
    price: 400,
    salePrice: 340,
    labPrice: 200,
    isActive: true,
    ...overrides,
  });
}

async function createPatient(customer, overrides = {}) {
  return Patient.create({
    customer: customer._id,
    name: customer.name,
    age: 30,
    gender: 'male',
    relation: 'self',
    ...overrides,
  });
}

async function createBooking({ user, lab, patient, product }, overrides = {}) {
  return Booking.create({
    bookingNo: uniq('BKG-'),
    user: user._id,
    lab: lab._id,
    items: [{ product: product._id, name: product.name, qty: 1, price: product.salePrice || product.price, labPrice: product.labPrice }],
    patient: patient._id,
    patientSnapshot: { name: patient.name, age: patient.age, gender: patient.gender, relation: patient.relation },
    slotDate: new Date(Date.now() + 24 * 3600 * 1000),
    slotTime: '10:00 AM – 11:00 AM',
    visitType: 'lab',
    status: 'confirmed',
    paymentMethod: 'online',
    paymentStatus: 'unpaid',
    subtotal: product.salePrice || product.price,
    total: product.salePrice || product.price,
    ...overrides,
  });
}

// Mints a valid auth header without going through /auth/login — mirrors the JWT
// crafting technique already used ad-hoc all session for local verification.
function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function authHeader(user) {
  return { Authorization: `Bearer ${signToken(user)}` };
}

// Computes a real, valid Razorpay signature for a given order/payment id pair against
// tests/mocks/external.js's FAKE_KEY_SECRET — lets payment.test.js exercise the actual
// HMAC verification logic in paymentController#verifyPayment without any mocking.
function signRazorpayPayload(orderId, paymentId, secret) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

module.exports = {
  createUser, createLab, createProduct, createPatient, createBooking,
  signToken, authHeader, signRazorpayPayload,
};
