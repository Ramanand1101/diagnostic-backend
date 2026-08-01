const asyncHandler = require('express-async-handler');
const createCrudController = require('./crudFactory');
const Coupon = require('../models/Coupon');

const controller = createCrudController(Coupon, { searchable: ['code'] });

// POST /api/v1/coupons/validate — any logged-in customer can check a code before
// checkout, without needing the admin `coupons` module permission. Returns the
// discount amount for the given subtotal, or a specific reason it can't be applied
// (booking creation applies this exact same logic again server-side — this endpoint
// only exists to give the cart page a preview and clear error messaging).
controller.validate = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ message: 'Enter a coupon code.' });

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  if (!coupon || !coupon.active) {
    return res.status(404).json({ message: 'Invalid coupon code.' });
  }

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    return res.status(400).json({ message: 'This coupon is not active yet.' });
  }
  if (coupon.validTo && coupon.validTo < now) {
    return res.status(400).json({ message: 'This coupon has expired.' });
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
  }

  const amount = Number(subtotal) || 0;
  if (amount < (coupon.minOrderAmount || 0)) {
    return res.status(400).json({ message: `Add ₹${(coupon.minOrderAmount - amount).toLocaleString('en-IN')} more to use this coupon (minimum order ₹${coupon.minOrderAmount.toLocaleString('en-IN')}).` });
  }

  const discount = coupon.type === 'percent'
    ? Math.min((amount * coupon.value) / 100, coupon.maxDiscount || amount)
    : Math.min(coupon.value, amount);

  res.json({
    valid: true,
    discount,
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
    message: `Coupon applied! You saved ₹${discount.toLocaleString('en-IN')}.`,
  });
});

// GET /api/v1/coupons/active — public, no auth. Powers the homepage coupon strip,
// so it only exposes what a customer needs to use the code (not usedCount, owner info, etc).
controller.listActive = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    active: true,
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: null }, { validTo: { $exists: false } }, { validTo: { $gte: now } }] },
    ],
    $expr: { $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }] },
  })
    .select('code type value minOrderAmount maxDiscount')
    .sort('-createdAt')
    .limit(12);

  res.json({ items: coupons });
});

module.exports = controller;
