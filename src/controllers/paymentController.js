const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { getRazorpayClient, getPublicKeyId, loadConfig } = require('../config/razorpay');
const { sendBookingConfirmation } = require('../utils/bookingConfirmation');
const { logActivity, requestMeta } = require('../utils/activityLog');
const { computeBookingWarnings } = require('../utils/bookingWarnings');

// POST /api/v1/payments/razorpay/order — body { bookingIds: [...] }. Creates one
// Razorpay order (and one Payment record) covering all the given bookings, for the SUM
// of their server-computed `total` fields — never a client-supplied amount. Bookings
// must belong to the caller, be 'online', and still 'unpaid' (re-callable safely if the
// customer closes the Razorpay popup and retries — it just issues a fresh order + a
// fresh Payment record for the same still-unpaid bookings).
exports.createOrder = asyncHandler(async (req, res) => {
  const { bookingIds } = req.body;
  if (!Array.isArray(bookingIds) || !bookingIds.length) {
    return res.status(400).json({ message: 'bookingIds is required.' });
  }

  const bookings = await Booking.find({
    _id: { $in: bookingIds },
    user: req.user._id,
    paymentMethod: 'online',
    paymentStatus: 'unpaid',
    isDeleted: false,
  });

  if (bookings.length !== bookingIds.length) {
    return res.status(400).json({ message: 'One or more bookings are not eligible for payment.' });
  }

  const amountRupees = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
  if (amountRupees <= 0) {
    return res.status(400).json({ message: 'Nothing to charge for these bookings.' });
  }

  let client;
  try {
    client = await getRazorpayClient();
  } catch (err) {
    return res.status(503).json({ message: err.message });
  }

  const receipt = bookings.map((b) => b.bookingNo).join('-').slice(0, 40);
  const order = await client.orders.create({
    amount: Math.round(amountRupees * 100), // paise
    currency: 'INR',
    receipt,
    notes: { bookingIds: bookings.map((b) => String(b._id)).join(',') },
  });

  const payment = await Payment.create({
    user: req.user._id,
    bookings: bookings.map((b) => b._id),
    amount: amountRupees,
    currency: order.currency,
    razorpayOrderId: order.id,
    receipt,
  });

  await Booking.updateMany(
    { _id: { $in: bookings.map((b) => b._id) } },
    { payment: payment._id }
  );

  res.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: await getPublicKeyId(),
  });
});

// POST /api/v1/payments/razorpay/verify — body { razorpay_order_id, razorpay_payment_id,
// razorpay_signature }. This signature check is the ONLY thing in the whole flow allowed
// to flip a booking to 'paid' — nothing here trusts anything else the client claims.
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing payment verification fields.' });
  }

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
  if (!payment) {
    return res.status(404).json({ message: 'No payment found for this order.' });
  }

  const { keySecret } = await loadConfig();
  if (!keySecret) {
    return res.status(503).json({ message: 'Payment gateway not configured.' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    payment.status = 'failed';
    payment.failureReason = 'Signature mismatch';
    await payment.save();
    return res.status(400).json({ message: 'Payment verification failed. Please try again or contact support.' });
  }

  payment.status = 'paid';
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  await payment.save();

  await Booking.updateMany(
    { _id: { $in: payment.bookings } },
    { paymentStatus: 'paid' }
  );

  const bookings = await Booking.find({ _id: { $in: payment.bookings } });
  for (const booking of bookings) {
    sendBookingConfirmation(booking._id);
    logActivity({
      actor: req.user,
      action: 'booking.paid',
      entity: 'Booking',
      entityId: booking._id,
      description: `${req.user.name} completed payment for booking ${booking.bookingNo} via Razorpay (₹${booking.total})`,
      ...requestMeta(req),
    });
  }

  const updated = await Booking.find({ _id: { $in: payment.bookings } })
    .populate('lab', 'name address city phone publicPhone')
    .populate('patient');

  // SuccessScreen reads booking[0].warnings the same way createBooking's response did.
  const withWarnings = updated.map((b) => ({
    ...b.toObject(),
    warnings: computeBookingWarnings({ slotDate: b.slotDate, slotTime: b.slotTime }),
  }));

  res.json({ bookings: withWarnings });
});
