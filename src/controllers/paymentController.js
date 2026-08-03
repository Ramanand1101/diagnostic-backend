const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const { getRazorpayClient, getPublicKeyId, loadConfig } = require('../config/razorpay');
const { sendBookingConfirmation } = require('../utils/bookingConfirmation');
const { logActivity, requestMeta } = require('../utils/activityLog');
const { computeBookingWarnings } = require('../utils/bookingWarnings');

// POST /api/v1/payments/razorpay/order — body { bookingIds: [...] }. Creates one
// Razorpay order covering all the given bookings, for the SUM of their server-computed
// `total` fields — never a client-supplied amount. Bookings must belong to the caller,
// be 'online', and still 'unpaid' (re-callable safely if the customer closes the
// Razorpay popup and retries — it just issues a fresh order for the same bookings).
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

  const order = await client.orders.create({
    amount: Math.round(amountRupees * 100), // paise
    currency: 'INR',
    receipt: bookings.map((b) => b.bookingNo).join('-').slice(0, 40),
    notes: { bookingIds: bookings.map((b) => String(b._id)).join(',') },
  });

  await Booking.updateMany(
    { _id: { $in: bookings.map((b) => b._id) } },
    { razorpayOrderId: order.id }
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

  const { keySecret } = await loadConfig();
  if (!keySecret) {
    return res.status(503).json({ message: 'Payment gateway not configured.' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification failed. Please try again or contact support.' });
  }

  const bookings = await Booking.find({ razorpayOrderId: razorpay_order_id, user: req.user._id });
  if (!bookings.length) {
    return res.status(404).json({ message: 'No bookings found for this payment.' });
  }

  await Booking.updateMany(
    { razorpayOrderId: razorpay_order_id, user: req.user._id },
    {
      paymentStatus: 'paid',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    }
  );

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

  const updated = await Booking.find({ _id: { $in: bookings.map((b) => b._id) } })
    .populate('lab', 'name address city phone publicPhone')
    .populate('patient');

  // SuccessScreen reads booking[0].warnings the same way createBooking's response did.
  const withWarnings = updated.map((b) => ({
    ...b.toObject(),
    warnings: computeBookingWarnings({ slotDate: b.slotDate, slotTime: b.slotTime }),
  }));

  res.json({ bookings: withWarnings });
});
