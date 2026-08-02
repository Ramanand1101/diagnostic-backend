const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Coupon  = require('../models/Coupon');
const Product = require('../models/Product');
const User    = require('../models/User');
const Patient = require('../models/Patient');
const Counter = require('../models/Counter');
const { queueEmail } = require('../queues/index');
const { sendSms, sendWhatsapp } = require('../config/sms');
const { WARNING_MESSAGES, computeBookingWarnings } = require('../utils/bookingWarnings');
const { logActivity, requestMeta } = require('../utils/activityLog');
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

  // ── Patient is mandatory — every booking is for exactly one person (self or a
  // family member); the client sends a Patient ID which must belong to this customer ──
  if (!payload.patient) {
    return res.status(400).json({ message: 'Please select who this booking is for.' });
  }
  const patient = await Patient.findOne({ _id: payload.patient, customer: user._id });
  if (!patient) {
    return res.status(400).json({ message: 'Selected patient was not found on your account.' });
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
  // Keyed by item index so the items.map(...) below (which builds the actual
  // stored items array) doesn't have to re-fetch each Product a second time.
  const productLabPrices = [];

  for (const item of items) {
    const product = item.product ? await Product.findById(item.product) : null;
    const price = item.price || (product ? (product.salePrice || product.price) : 0);
    subtotal += Number(price) * Number(item.qty || 1);
    // Never trust a client-sent labPrice — it determines what the lab is owed,
    // so it's always read from the Product doc, same trust boundary as the
    // slot/patient validation above.
    productLabPrices.push(product && product.labPrice != null ? Number(product.labPrice) : null);
  }

  let discount = 0;
  if (payload.coupon) {
    const coupon = await Coupon.findOne({ code: payload.coupon.toUpperCase(), active: true });
    if (coupon) {
      const now = new Date();
      const validFrom = !coupon.validFrom || coupon.validFrom <= now;
      const validTo = !coupon.validTo || coupon.validTo >= now;
      const underLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
      if (validFrom && validTo && underLimit && subtotal >= coupon.minOrderAmount) {
        if (coupon.type === 'percent') {
          discount = Math.min((subtotal * coupon.value) / 100, coupon.maxDiscount || subtotal);
        } else {
          discount = Math.min(coupon.value, subtotal);
        }
        coupon.usedCount += 1;
        await coupon.save();
      }
    }
  }

  const tax = Number(payload.tax || 0);
  const total = subtotal - discount + tax;

  const bookingItems = items.map((i, idx) => ({
    product: i.product,
    name: i.name,
    qty: i.qty || 1,
    price: i.price || 0,
    labPrice: productLabPrices[idx],
  }));
  const knownLabItems = bookingItems.filter((i) => i.labPrice != null);
  const labPayable = knownLabItems.length
    ? knownLabItems.reduce((sum, i) => sum + i.labPrice * i.qty, 0)
    : null;
  const adminProfit = labPayable != null ? total - labPayable : null;

  const booking = await Booking.create({
    bookingNo: await nextBookingNo(),
    user: user._id,
    guest: payload.guest,
    lab: payload.lab,
    items: bookingItems,
    labPayable,
    adminProfit,
    patient: patient._id,
    patientSnapshot: { name: patient.name, age: patient.age, gender: patient.gender, relation: patient.relation },
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

  // Populated so the confirmation screen (and this response in general) can show the
  // lab's address/phone, not just its name — previously only the raw lab ObjectId
  // went back to the client, so those fields were unavailable there.
  await booking.populate('lab', 'name address city phone publicPhone');

  logActivity({
    actor: req.user,
    action: 'booking.created',
    entity: 'Booking',
    entityId: booking._id,
    description: `${req.user.name} booked ${items.length} test(s) at ${booking.lab?.name || 'a lab'} for ${patient.name} (${payload.slotDate || 'date TBC'})`,
    ...requestMeta(req),
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
                  ${(lab.publicPhone || lab.phone) ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px">📞 ${lab.publicPhone || lab.phone}</p>` : ''}
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
  const { lab, dateFrom, dateTo, customer, mobile } = req.query;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Same filters as listBookings — so the stat cards on the admin Billing page
  // reflect exactly the same filtered set as the table underneath them, not the
  // site-wide totals, whenever a lab/date/customer/mobile filter is applied.
  const baseFilter = { isDeleted: false };
  // Booking.aggregate()'s $match, unlike .find(), does NOT auto-cast query strings to
  // ObjectId against the schema — an uncast string here would silently match nothing,
  // which is exactly why every stat card went to ₹0 the moment a lab filter was applied.
  if (lab && mongoose.isValidObjectId(lab)) baseFilter.lab = new mongoose.Types.ObjectId(lab);
  await applyDateAndCustomerFilters(baseFilter, { dateFrom, dateTo, customer, mobile });

  // Every money figure below should behave according to the booking's actual status —
  // a cancelled/refunded booking isn't real revenue, even if it was paid before being
  // cancelled. `byStatus` is the one exception: its whole job is counting per status,
  // cancelled/refunded included, so it stays on the unrestricted baseFilter.
  const revenueFilter = { ...baseFilter, status: { $nin: ['cancelled', 'refunded'] } };

  // "This month" intersects the calendar month with whatever date filter is already
  // active, rather than ignoring it — e.g. lab=X + this-month-card both apply together.
  const monthFilter = { ...revenueFilter, createdAt: { ...(revenueFilter.createdAt || {}) } };
  if (!monthFilter.createdAt.$gte || monthFilter.createdAt.$gte < monthStart) {
    monthFilter.createdAt.$gte = monthStart;
  }

  const [allAgg, paidAgg, unpaidAgg, monthAgg, payMethodAgg, statusAgg, profitAgg] = await Promise.all([
    Booking.aggregate([{ $match: revenueFilter }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { ...revenueFilter, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { ...revenueFilter, paymentStatus: 'unpaid' } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: monthFilter }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: revenueFilter }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Booking.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    // Only bookings with a known lab price (see Booking.labPayable) — excluded rather
    // than counted as ₹0, so this stays accurate while labPrice is being rolled out.
    // Sums both adminProfit and labPayable in one pass — same underlying set of
    // priced bookings, so the two figures always add up to totalRevenue together.
    Booking.aggregate([{ $match: { ...revenueFilter, adminProfit: { $ne: null } } }, { $group: { _id: null, total: { $sum: '$adminProfit' }, labPayable: { $sum: '$labPayable' }, count: { $sum: 1 } } }]),
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
    totalAdminProfit: profitAgg[0]?.total || 0,
    totalLabPayable: profitAgg[0]?.labPayable || 0,
    profitBookingCount: profitAgg[0]?.count || 0,
    byPaymentMethod: payMethodAgg,
    byStatus: statusAgg,
  });
});

const BOOKING_SORT_FIELDS = ['createdAt', 'total', 'bookingNo', 'status', 'paymentStatus'];

// Shared by listBookings and getStats — both admin Bookings and Billing pages send the
// same lab/date/customer/mobile filters, and the Billing page's stat cards need to
// reflect the exact same filtered set as the table below them, not the site-wide total.
async function applyDateAndCustomerFilters(filter, { dateFrom, dateTo, customer, mobile }) {
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
    if (dateTo)   filter.createdAt.$lte = new Date(dateTo   + 'T23:59:59.999Z');
  }

  // Customer name / mobile search — Mongoose can't regex-match a populated field in
  // one query, so registered users are matched via a two-step lookup (same pattern as
  // labCrmController.js#patientList), then OR'd with a direct match on guest checkouts
  // (booking.guest.{name,mobile}) since those never have a User document at all.
  if (customer || mobile) {
    const User = require('../models/User');
    const userFilter = {};
    if (customer) userFilter.name = new RegExp(customer, 'i');
    if (mobile)   userFilter.mobile = new RegExp(mobile, 'i');
    const matchingUsers = await User.find(userFilter).select('_id').lean();
    const userIds = matchingUsers.map((u) => u._id);

    const guestOr = [];
    if (customer) guestOr.push({ 'guest.name': new RegExp(customer, 'i') });
    if (mobile)   guestOr.push({ 'guest.mobile': new RegExp(mobile, 'i') });

    filter.$or = [{ user: { $in: userIds } }, ...guestOr];
  }
}

exports.listBookings = asyncHandler(async (req, res) => {
  const { status, paymentStatus, lab, q, deleted, page = 1, limit = 20, dateFrom, dateTo, customer, mobile, sortBy, sortOrder } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = { isDeleted: deleted === 'true' };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
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

  await applyDateAndCustomerFilters(filter, { dateFrom, dateTo, customer, mobile });

  const sortField = BOOKING_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  const skip = (Number(page) - 1) * safeLimit;
  const items = await Booking.find(filter).populate('user lab items.product patient').sort({ [sortField]: sortDir }).skip(skip).limit(safeLimit);
  const total = await Booking.countDocuments(filter);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

// GET /api/v1/bookings/export-csv — same filters as listBookings (admin/subadmin only,
// via allowModule('bookings','view') on the route), but every matching row (up to 10k)
// instead of one page.
exports.exportCsv = asyncHandler(async (req, res) => {
  const { status, paymentStatus, lab, q, deleted, dateFrom, dateTo, customer, mobile, sortBy, sortOrder } = req.query;
  const filter = { isDeleted: deleted === 'true' };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (q) filter.bookingNo = new RegExp(q, 'i');
  if (lab) filter.lab = lab;
  await applyDateAndCustomerFilters(filter, { dateFrom, dateTo, customer, mobile });

  const sortField = BOOKING_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  const bookings = await Booking.find(filter)
    .populate('user', 'name mobile')
    .populate('lab', 'name')
    .sort({ [sortField]: sortDir })
    .limit(10000)
    .lean();

  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headers = ['bookingNo', 'customer', 'mobile', 'lab', 'date', 'status', 'paymentStatus', 'amount', 'labPrice', 'profit'];
  const rows = bookings.map((b) => [
    b.bookingNo,
    b.user?.name || b.guest?.name || '',
    b.user?.mobile || b.guest?.mobile || '',
    b.lab?.name || '',
    b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : '',
    b.status,
    b.paymentStatus,
    b.total || 0,
    b.labPayable != null ? b.labPayable : '',
    b.adminProfit != null ? b.adminProfit : '',
  ].map(escape).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="bookings-billing-export.csv"');
  res.send(csv);
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('user lab items.product patient');
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

// These three are never manually settable via this generic endpoint — each has its own
// flow that carries the data actually backing the status change, so a bare status flip
// here can't silently fake it:
//  - 'rescheduled' only comes from updateBooking (Edit/Reschedule), which requires an
//    actual new slotDate/slotTime — setting it here would show "rescheduled" with no
//    slot change at all.
//  - 'completed'/'report_partial' only come from reportController#uploadReport or
//    bookingController#markReportDone, based on the actual reportStatus.
const SYSTEM_DRIVEN_STATUSES = ['rescheduled', 'completed', 'report_partial'];
const SYSTEM_DRIVEN_MESSAGE = {
  rescheduled: 'This status is set automatically when the date/time is actually changed — use "Reschedule" and pick a new slot instead.',
  completed: 'This status is set automatically when a report is uploaded — it can\'t be set manually. Upload the report instead.',
  report_partial: 'This status is set automatically when a report is uploaded — it can\'t be set manually. Upload the report instead.',
};

exports.updateBookingStatus = asyncHandler(async (req, res) => {
  if (SYSTEM_DRIVEN_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ message: SYSTEM_DRIVEN_MESSAGE[req.body.status] });
  }
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
  if (notes !== undefined) update.notes = notes;

  // Items replaced → re-snapshot labPrice from each Product (never trust the client
  // for this, same as createBooking) and recompute the settlement figures so they
  // don't go stale against the new item list.
  if (items !== undefined) {
    const existingForTotal = await Booking.findById(req.params.id).select('total');
    if (!existingForTotal) return res.status(404).json({ message: 'Booking not found' });
    const withLabPrice = await Promise.all(items.map(async (i) => {
      const product = i.product ? await Product.findById(i.product).select('labPrice') : null;
      return { ...i, labPrice: product && product.labPrice != null ? Number(product.labPrice) : null };
    }));
    const knownLabItems = withLabPrice.filter((i) => i.labPrice != null);
    const labPayable = knownLabItems.length
      ? knownLabItems.reduce((sum, i) => sum + i.labPrice * (i.qty || 1), 0)
      : null;
    update.items = withLabPrice;
    update.labPayable = labPayable;
    update.adminProfit = labPayable != null ? existingForTotal.total - labPayable : null;
  }

  if (slotDate) {
    const Lab = require('../models/Lab');
    const existing = await Booking.findById(req.params.id).select('lab items slotDate slotTime status');
    if (!existing) return res.status(404).json({ message: 'Booking not found' });

    // A real reschedule — the date or time actually changing — flips the status so
    // it's visible in the Bookings list, distinct from a same-slot edit (e.g. notes
    // only). Only cancelled/refunded are truly terminal — even a completed booking can
    // be rescheduled (e.g. a redo is needed after the fact).
    const oldDateKey = existing.slotDate ? new Date(existing.slotDate).toISOString().slice(0, 10) : null;
    const newDateKey = new Date(slotDate).toISOString().slice(0, 10);
    const dateOrTimeChanged = oldDateKey !== newDateKey || (slotTime !== undefined && slotTime !== existing.slotTime);
    if (dateOrTimeChanged && !['cancelled', 'refunded'].includes(existing.status)) {
      update.status = 'rescheduled';
    }

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
    .populate('user lab items.product patient');
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
