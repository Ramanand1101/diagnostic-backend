const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Coupon  = require('../models/Coupon');
const Product = require('../models/Product');
const User    = require('../models/User');
const Counter = require('../models/Counter');
const { queueEmail } = require('../queues/index');

// Atomic, collision-safe booking number — HOT-000123
async function nextBookingNo() {
  const seq = await Counter.nextSeq('booking');
  return `HOT-${String(seq).padStart(6, '0')}`;
}

exports.createBooking = asyncHandler(async (req, res) => {
  const payload = req.body;
  const user = req.user;

  if (user && (user.role === 'superadmin' || user.role === 'subadmin' || user.role === 'lab')) {
    return res.status(403).json({ message: 'Admin and lab accounts cannot place bookings.' });
  }

  const items = payload.items || [];

  // All items must belong to the same lab
  const labIds = [...new Set(items.map((i) => String(i.lab || '')).filter(Boolean))];
  if (labIds.length > 1) {
    return res.status(400).json({ message: 'All items in a booking must be from the same lab.' });
  }

  // ── 30-day date restriction ──────────────────────────────────────────────────
  if (payload.slotDate) {
    const slotDay = new Date(payload.slotDate); slotDay.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDay = new Date(today); maxDay.setDate(maxDay.getDate() + 30);
    if (slotDay < today) {
      return res.status(400).json({ message: 'Booking date cannot be in the past.' });
    }
    if (slotDay > maxDay) {
      return res.status(400).json({ message: 'Bookings can only be scheduled up to 30 days in advance.' });
    }
  }

  // ── Warning flags (late-night + short notice) ────────────────────────────────
  const warnings = [];
  if (payload.slotDate) {
    const now = new Date();
    const slotDay = new Date(payload.slotDate); slotDay.setHours(0, 0, 0, 0);
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    if (now.getHours() >= 21 && slotDay.getTime() === tomorrow.getTime()) {
      warnings.push('lateNight');
    }
    if (payload.slotTime) {
      const [h = 0, m = 0] = payload.slotTime.split(':').map(Number);
      const apptDateTime = new Date(payload.slotDate); apptDateTime.setHours(h, m, 0, 0);
      const hoursUntil = (apptDateTime - now) / 3600000;
      if (hoursUntil > 0 && hoursUntil <= 10) warnings.push('shortNotice');
    }
  }

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
    bookingNo: await nextBookingNo(),
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
    status: payload.status || 'confirmed',
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

  // Queue confirmation email — response is sent before email completes
  ;(async () => {
    try {
      const populated = await Booking.findById(booking._id).populate('lab', 'name address city phone');
      const userRecord = await User.findById(user._id).select('name email mobile').lean();
      const toEmail = userRecord?.email || user.email || payload.guest?.email;
      if (!toEmail) return;
      const lab = populated.lab;
      const itemsHtml = booking.items.map((i) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${i.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right">₹${i.price}</td></tr>`
      ).join('');
      const labAddress = lab ? [lab.address, lab.city].filter(Boolean).join(', ') : '';
      await queueEmail({
        to: toEmail,
        subject: `Booking Confirmed – ${booking.bookingNo}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
            <div style="background:#0ea5e9;padding:24px 32px;border-radius:12px 12px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Booking Confirmed ✓</h1>
              <p style="color:#bae6fd;margin:4px 0 0;font-size:14px">Booking ID: <strong>${booking.bookingNo}</strong></p>
            </div>
            <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
              <p style="margin:0 0 16px">Hi <strong>${userRecord?.name || user.name || 'there'}</strong>,<br>Your lab test booking has been confirmed.</p>
              ${lab ? `<div style="background:#f8fafc;border-radius:8px;padding:14px 16px;margin-bottom:16px">
                <p style="margin:0;font-weight:600;font-size:15px">${lab.name}</p>
                ${labAddress ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px">📍 ${labAddress}</p>` : ''}
                ${lab.phone ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px">📞 ${lab.phone}</p>` : ''}
              </div>` : ''}
              <p style="margin:0 0 6px;font-weight:600">Appointment</p>
              <p style="margin:0 0 16px;color:#475569;font-size:14px">
                📅 ${booking.slotDate ? new Date(booking.slotDate).toDateString() : 'To be confirmed'}
                ${booking.slotTime ? ` at ${booking.slotTime}` : ''}<br>
                🏠 Visit type: ${booking.visitType === 'home' ? 'Home Collection' : 'Visit Lab'}
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead><tr style="background:#f8fafc">
                  <th style="padding:8px 12px;text-align:left;font-weight:600">Test</th>
                  <th style="padding:8px 12px;text-align:right;font-weight:600">Price</th>
                </tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              ${booking.discount > 0 ? `<p style="text-align:right;margin:8px 0 4px;font-size:13px;color:#16a34a">Discount: –₹${booking.discount}</p>` : ''}
              <p style="text-align:right;margin:8px 0 0;font-weight:700;font-size:16px;color:#0ea5e9">Total: ₹${booking.total}</p>
              ${warnings.includes('lateNight') ? `
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-top:16px">
                <p style="margin:0;font-size:13px;color:#92400e">🌙 <strong>Late-night booking notice:</strong> You booked after 9 PM. Your sample collection is scheduled for tomorrow. Our team will reach out to confirm the timing.</p>
              </div>` : ''}
              ${warnings.includes('shortNotice') ? `
              <div style="background:#fef2f2;border:1px solid #f87171;border-radius:8px;padding:12px 16px;margin-top:12px">
                <p style="margin:0;font-size:13px;color:#991b1b">⏰ <strong>Short notice booking:</strong> Your appointment is within the next 10 hours. Please be ready and keep your phone accessible. Fasting requirements (if any) apply from now.</p>
              </div>` : ''}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
              <p style="font-size:12px;color:#94a3b8;margin:0">If you have any questions, reply to this email or call the lab directly.</p>
            </div>
          </div>`,
      });
    } catch (emailErr) {
      console.error('[Booking] email queue failed:', emailErr.message);
    }
  })();

  res.status(201).json({ ...booking.toObject(), warnings });
});

// GET /api/v1/bookings/stats — superadmin/subadmin only
exports.getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allAgg, paidAgg, unpaidAgg, monthAgg, payMethodAgg, statusAgg] = await Promise.all([
    Booking.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { isDeleted: false, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { isDeleted: false, paymentStatus: 'unpaid' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { isDeleted: false, createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Booking.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  res.json({
    totalRevenue:   allAgg[0]?.total   || 0,
    totalCount:     allAgg[0]?.count   || 0,
    paidRevenue:    paidAgg[0]?.total  || 0,
    paidCount:      paidAgg[0]?.count  || 0,
    unpaidRevenue:  unpaidAgg[0]?.total|| 0,
    unpaidCount:    unpaidAgg[0]?.count|| 0,
    thisMonthRevenue: monthAgg[0]?.total|| 0,
    thisMonthCount:   monthAgg[0]?.count|| 0,
    byPaymentMethod: payMethodAgg,
    byStatus: statusAgg,
  });
});

exports.listBookings = asyncHandler(async (req, res) => {
  const { status, lab, q, deleted, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = { isDeleted: deleted === 'true' };
  if (status) filter.status = status;
  if (q) filter.bookingNo = new RegExp(q, 'i');

  if (req.user.role === 'customer') {
    filter.user = req.user._id;
  } else if (req.user.role === 'lab') {
    const Lab = require('../models/Lab');
    const myLab = await Lab.findOne({ owners: req.user._id });
    filter.lab = myLab?._id || null;
  } else {
    if (lab) filter.lab = lab;
  }

  const skip = (Number(page) - 1) * safeLimit;
  const items = await Booking.find(filter).populate('user lab items.product').sort('-createdAt').skip(skip).limit(safeLimit);
  const total = await Booking.countDocuments(filter);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('user lab items.product');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
});

exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const update = { status: req.body.status };
  if (req.body.status === 'cancelled') {
    update.cancelledBy = req.user._id;
    update.cancelledByName = req.user.name || req.user.email || 'Unknown';
  }
  const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });
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

// PATCH /api/v1/bookings/:id/edit — admin: change date, time, lab, items
exports.updateBooking = asyncHandler(async (req, res) => {
  const { slotDate, slotTime, lab, items, notes } = req.body;
  const update = {};
  if (slotDate !== undefined) update.slotDate = slotDate;
  if (slotTime !== undefined) update.slotTime = slotTime;
  if (lab !== undefined) update.lab = lab;
  if (items !== undefined) update.items = items;
  if (notes !== undefined) update.notes = notes;

  const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('user lab items.product');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
});

// DELETE /api/v1/bookings/:id — soft delete
exports.deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json({ message: 'Booking deleted', booking });
});

// PATCH /api/v1/bookings/:id/restore — restore soft-deleted booking
exports.restoreBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
});
