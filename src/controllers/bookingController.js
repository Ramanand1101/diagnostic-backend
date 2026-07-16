const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');

function bookingNo() {
  return `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

exports.createBooking = asyncHandler(async (req, res) => {
  const payload = req.body;
  const user = req.user;

  const items = payload.items || [];
  let subtotal = 0;

  for (const item of items) {
    const product = item.product ? await Product.findById(item.product) : null;
    const price = item.price || (product ? (product.salePrice || product.price) : 0);
    subtotal += Number(price) * Number(item.qty || 1);
  }

  let discount = 0;
  if (payload.coupon) {
    const coupon = await Coupon.findOne({ code: payload.coupon.toUpperCase(), active: true });
    if (coupon) {
      const now = new Date();
      const validFrom = !coupon.validFrom || coupon.validFrom <= now;
      const validTo = !coupon.validTo || coupon.validTo >= now;
      if (validFrom && validTo && subtotal >= coupon.minOrderAmount) {
        if (coupon.type === 'percent') {
          discount = Math.min((subtotal * coupon.value) / 100, coupon.maxDiscount || subtotal);
        } else {
          discount = coupon.value;
        }
        coupon.usedCount += 1;
        await coupon.save();
      }
    }
  }

  const tax = Number(payload.tax || 0);
  const total = subtotal - discount + tax;

  const booking = await Booking.create({
    bookingNo: bookingNo(),
    user: user._id,
    guest: payload.guest,
    lab: payload.lab,
    items: items.map((i) => ({
      product: i.product,
      name: i.name,
      qty: i.qty || 1,
      price: i.price || 0
    })),
    patients: payload.patients || [],
    slotDate: payload.slotDate,
    slotTime: payload.slotTime,
    visitType: payload.visitType || 'lab',
    address: payload.address,
    paymentMethod: payload.paymentMethod || 'online',
    paymentStatus: payload.paymentStatus || 'unpaid',
    subtotal,
    discount,
    tax,
    total,
    coupon: payload.coupon,
    notes: payload.notes,
    prescriptionUrl: payload.prescriptionUrl
  });

  res.status(201).json(booking);
});

exports.listBookings = asyncHandler(async (req, res) => {
  const { status, lab, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.bookingNo = new RegExp(q, 'i');

  if (req.user.role === 'customer') {
    filter.user = req.user._id;
  } else if (req.user.role === 'lab') {
    const Lab = require('../models/Lab');
    const myLab = await Lab.findOne({ owner: req.user._id });
    filter.lab = myLab?._id || null;
  } else {
    if (lab) filter.lab = lab;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const items = await Booking.find(filter).populate('user lab items.product').sort('-createdAt').skip(skip).limit(Number(limit));
  const total = await Booking.countDocuments(filter);
  res.json({ items, page: Number(page), limit: Number(limit), total });
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('user lab items.product');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
});

exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
});

exports.markPaid = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, {
    paymentStatus: 'paid',
    paymentMethod: req.body.paymentMethod || 'online'
  }, { new: true });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
});
