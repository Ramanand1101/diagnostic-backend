const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Coupon  = require('../models/Coupon');
const Product = require('../models/Product');
const User    = require('../models/User');
const Counter = require('../models/Counter');
const { queueEmail } = require('../queues/index');
const { sendSms, sendWhatsapp } = require('../config/sms');
const { WARNING_MESSAGES, computeBookingWarnings } = require('../utils/bookingWarnings');
const { logActivity } = require('../utils/activityLog');
const { findBlockingRule } = require('../utils/labHolidayCheck');
const { isAvailable } = require('../utils/testAvailability');

// Atomic, collision-safe booking number — DDMMYYYY-1550 (resets per day, starts at 1550)
async function nextBookingNo() {
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const dateKey = `booking-${dd}${mm}${yyyy}`;          // e.g. booking-24072026
  const seq = await Counter.nextSeq(dateKey, 1549);      // first call → 1550
  return `${dd}${mm}${yyyy}-${seq}`;                     // e.g. 24072026-1550
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

  // ── Slot is mandatory — don't trust the frontend's HTML5 `required` alone,
  // since a direct API call or a UI bug can still submit without one ───────────
  if (!payload.slotDate) {
    return res.status(400).json({ message: 'Please select a date for your booking.' });
  }
  if (!payload.slotTime) {
    return res.status(400).json({ message: 'Please select a preferred time slot.' });
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

  // ── Lab holiday restriction — server-side, so it can't be bypassed by a client
  // that skips the date-picker's greyed-out dates ────────────────────────────────
  let bookingLab = null;
  if (payload.slotDate && payload.lab) {
    const Lab = require('../models/Lab');
    bookingLab = await Lab.findById(payload.lab).select('city state brand');
    if (bookingLab) {
      const blockingRule = await findBlockingRule(bookingLab, payload.slotDate);
      if (blockingRule) {
        return res.status(400).json({ message: 'This lab is closed on the selected date due to a holiday. Please choose another date.' });
      }
    }
  }

  // ── Test availability restriction — server-side; blocks booking a test/package
  // that's been marked unavailable at this lab/city/state/brand for this date, even
  // if the client bypassed the greyed-out date picker or a stale cached listing ──
  if (payload.slotDate && bookingLab && items.length) {
    for (const item of items) {
      if (!item.product) continue;
      const product = await Product.findById(item.product).select('name testMaster');
      if (!product || !product.testMaster) continue;
      const verdict = await isAvailable({ testMasterId: product.testMaster, lab: bookingLab, date: payload.slotDate });
      if (!verdict.available) {
        return res.status(400).json({
          message: `"${product.name}" is not available at this lab on the selected date${verdict.reason ? ` (${verdict.reason})` : ''}. Please choose another date or lab.`,
          unavailableProduct: product._id,
        });
      }
    }
  }

  // ── Warning flags (late-night + short notice) — server timezone is authoritative ──
  const warnings = computeBookingWarnings({ slotDate: payload.slotDate, slotTime: payload.slotTime });

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

  // Queue confirmation email/SMS/WhatsApp — response is sent before these complete
  ;(async () => {
    const populated = await Booking.findById(booking._id).populate('lab', 'name address city phone');
    const userRecord = await User.findById(user._id).select('name email mobile').lean();
    const lab = populated.lab;

    const toEmail = userRecord?.email || user.email || payload.guest?.email;
    const toMobile = userRecord?.mobile || payload.guest?.mobile;
    const warningTexts = warnings.map((w) => WARNING_MESSAGES[w]).filter(Boolean);

    if (toEmail) {
      try {
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
                  <p style="margin:0;font-size:13px;color:#92400e">🌙 ${WARNING_MESSAGES.lateNight}</p>
                </div>` : ''}
                ${warnings.includes('shortNotice') ? `
                <div style="background:#fef2f2;border:1px solid #f87171;border-radius:8px;padding:12px 16px;margin-top:12px">
                  <p style="margin:0;font-size:13px;color:#991b1b">⏰ ${WARNING_MESSAGES.shortNotice}</p>
                </div>` : ''}
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
                <p style="font-size:12px;color:#94a3b8;margin:0">If you have any questions, reply to this email or call the lab directly.</p>
              </div>
            </div>`,
        });
      } catch (emailErr) {
        console.error('[Booking] email queue failed:', emailErr.message);
      }
    }

    if (toMobile) {
      const dateStr = booking.slotDate ? new Date(booking.slotDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const baseLine = `Booking Confirmed! ID ${booking.bookingNo} at ${lab?.name || 'the lab'}${dateStr ? ` on ${dateStr}` : ''}${booking.slotTime ? ` at ${booking.slotTime}` : ''}. Total: Rs.${booking.total}.`;
      const fullMessage = [baseLine, ...warningTexts].join(' ');

      try {
        await sendSms({ to: toMobile, message: fullMessage });
      } catch (smsErr) {
        console.error('[Booking] SMS failed:', smsErr.message);
      }
      try {
        await sendWhatsapp({ to: toMobile, message: fullMessage });
      } catch (waErr) {
        console.error('[Booking] WhatsApp failed:', waErr.message);
      }
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

  if (req.user.role === 'lab') {
    const Lab = require('../models/Lab');
    const myLab = await Lab.findOne({ owners: req.user._id });
    filter.lab = myLab?._id || null;
  } else if (req.user.role === 'superadmin' || req.user.role === 'subadmin') {
    if (lab) filter.lab = lab;
  } else {
    // customer, hot_employee, corporate, employee, or any other non-admin role —
    // this same endpoint backs the personal "My Bookings" dashboard, so it must
    // never return other people's bookings.
    filter.user = req.user._id;
  }

  const skip = (Number(page) - 1) * safeLimit;
  const items = await Booking.find(filter).populate('user lab items.product').sort('-createdAt').skip(skip).limit(safeLimit);
  const total = await Booking.countDocuments(filter);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('user lab items.product');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (req.user.role === 'lab') {
    const Lab = require('../models/Lab');
    const myLab = await Lab.findOne({ owners: req.user._id }).select('_id');
    if (!myLab || String(booking.lab?._id || booking.lab) !== String(myLab._id)) {
      return res.status(403).json({ message: 'You do not have access to this booking.' });
    }
  } else if (req.user.role !== 'superadmin' && req.user.role !== 'subadmin') {
    const ownerId = booking.user?._id || booking.user;
    if (!ownerId || String(ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You do not have access to this booking.' });
    }
  }

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

  if (slotDate) {
    const Lab = require('../models/Lab');
    const existing = await Booking.findById(req.params.id).select('lab items');
    if (!existing) return res.status(404).json({ message: 'Booking not found' });
    const labDoc = await Lab.findById(lab || existing.lab).select('city state brand');
    if (labDoc) {
      const blockingRule = await findBlockingRule(labDoc, slotDate);
      if (blockingRule) {
        return res.status(400).json({ message: 'This lab is closed on the selected date due to a holiday. Please choose another date.' });
      }

      const itemsToCheck = items !== undefined ? items : existing.items;
      for (const item of itemsToCheck || []) {
        if (!item.product) continue;
        const product = await Product.findById(item.product).select('name testMaster');
        if (!product || !product.testMaster) continue;
        const verdict = await isAvailable({ testMasterId: product.testMaster, lab: labDoc, date: slotDate });
        if (!verdict.available) {
          return res.status(400).json({
            message: `"${product.name}" is not available at this lab on the selected date${verdict.reason ? ` (${verdict.reason})` : ''}. Please choose another date or lab.`,
          });
        }
      }
    }
  }

  const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('user lab items.product');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.json(booking);
});

// PATCH /api/v1/bookings/:id/report/mark-done — admin/lab confirms a previously-partial
// report is now complete (e.g. the missing test result arrived separately).
exports.markReportDone = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.reportStatus !== 'partial') {
    return res.status(400).json({ message: 'This booking does not have a partial report awaiting completion.' });
  }

  booking.reportStatus = 'complete';
  booking.missingTests = [];
  if (!['cancelled', 'refunded'].includes(booking.status)) booking.status = 'completed';
  await booking.save();
  logActivity({ actor: req.user, action: 'report.marked_done', entity: 'Booking', entityId: booking._id, description: `${req.user.name} marked the report for booking ${booking.bookingNo} as complete` });
  res.json(booking);
});

// POST /api/v1/bookings/:id/report/remind — admin/lab manually re-nudges about tests
// still missing from a partial report (the automatic email only fires once, at upload time)
exports.sendReportReminder = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('lab', 'name email');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.reportStatus !== 'partial') {
    return res.status(400).json({ message: 'This booking does not have a partial report awaiting completion.' });
  }
  if (!booking.missingTests?.length) {
    return res.status(400).json({ message: 'No missing tests are recorded for this booking.' });
  }
  if (!booking.lab?.email) {
    return res.status(400).json({ message: 'This lab has no email address on file to send a reminder to.' });
  }

  await queueEmail({
    to: booking.lab.email,
    subject: `Reminder: Report still pending — ${booking.bookingNo}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#b45309">Reminder — Report Still Pending</h2>
        <p>This is a follow-up reminder for booking <strong>${booking.bookingNo}</strong>.</p>
        <p>The following test(s) are still pending — please send the remaining report at the earliest:</p>
        <ul>${booking.missingTests.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>`,
  });

  booking.reportReminderSentAt = new Date();
  await booking.save();
  logActivity({ actor: req.user, action: 'report.reminder_sent', entity: 'Booking', entityId: booking._id, description: `${req.user.name} sent a manual reminder to ${booking.lab.name} about missing tests (${booking.missingTests.join(', ')}) for booking ${booking.bookingNo}` });
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
