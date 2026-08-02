const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Settlement = require('../models/Settlement');
const Counter = require('../models/Counter');
const { logActivity } = require('../utils/activityLog');

async function nextSettlementNo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = await Counter.nextSeq(`settlement-${yyyy}${mm}`, 0);
  return `SETL-${yyyy}${mm}-${String(seq).padStart(4, '0')}`;
}

// Bookings eligible for a lab settlement: paid by the customer, not already settled,
// and carrying a known lab payout (labPayable is null when the product had no Lab
// Sale Price configured at booking time — those are excluded, not shown as ₹0).
function eligibleFilter({ lab, from, to }) {
  return {
    lab,
    settlementStatus: 'unsettled',
    paymentStatus: 'paid',
    // A cancelled/refunded booking isn't real revenue even if it was paid before being
    // cancelled — never settle a lab for a test that isn't actually going ahead.
    status: { $nin: ['cancelled', 'refunded'] },
    labPayable: { $ne: null },
    isDeleted: false,
    createdAt: { $gte: new Date(from + 'T00:00:00.000Z'), $lte: new Date(to + 'T23:59:59.999Z') },
  };
}

function buildLineItems(bookings) {
  return bookings.map((b) => ({
    booking: b._id,
    bookingNo: b.bookingNo,
    patientName: b.patientSnapshot?.name || '',
    date: b.createdAt,
    adminPrice: b.total || 0,
    labPrice: b.labPayable || 0,
    adminProfit: b.adminProfit || 0,
  }));
}

// GET /settlements/preview?lab=&from=&to= — read-only, shows what a settlement would
// look like before the admin commits to creating it.
exports.previewUnsettled = asyncHandler(async (req, res) => {
  const { lab, from, to } = req.query;
  if (!lab || !from || !to) return res.status(400).json({ message: 'lab, from and to are required.' });

  const bookings = await Booking.find(eligibleFilter({ lab, from, to })).sort('-createdAt');
  const lineItems = buildLineItems(bookings);
  const totalAdminRevenue = lineItems.reduce((s, i) => s + i.adminPrice, 0);
  const totalLabPayable   = lineItems.reduce((s, i) => s + i.labPrice, 0);
  const totalAdminProfit  = lineItems.reduce((s, i) => s + i.adminProfit, 0);

  res.json({ count: bookings.length, lineItems, totalAdminRevenue, totalLabPayable, totalAdminProfit });
});

// POST /settlements — body { lab, from, to, notes? }. Re-runs the eligibility query
// server-side rather than trusting any client-supplied booking list, so a stale UI
// preview can never double-settle a booking.
exports.generateSettlement = asyncHandler(async (req, res) => {
  const { lab, from, to, notes } = req.body;
  if (!lab || !from || !to) return res.status(400).json({ message: 'lab, from and to are required.' });

  const bookings = await Booking.find(eligibleFilter({ lab, from, to }));
  if (!bookings.length) return res.status(400).json({ message: 'No unsettled, paid bookings with lab pricing found in this date range.' });

  const lineItems = buildLineItems(bookings);
  const totalAdminRevenue = lineItems.reduce((s, i) => s + i.adminPrice, 0);
  const totalLabPayable   = lineItems.reduce((s, i) => s + i.labPrice, 0);
  const totalAdminProfit  = lineItems.reduce((s, i) => s + i.adminProfit, 0);

  const settlement = await Settlement.create({
    settlementNo: await nextSettlementNo(),
    lab,
    periodFrom: from,
    periodTo: to,
    bookings: bookings.map((b) => b._id),
    lineItems,
    totalAdminRevenue,
    totalLabPayable,
    totalAdminProfit,
    notes,
    generatedBy: req.user._id,
  });

  await Booking.updateMany(
    { _id: { $in: bookings.map((b) => b._id) } },
    { settlementStatus: 'settled', settlement: settlement._id }
  );

  logActivity({
    actor: req.user,
    action: 'settlement.generated',
    entity: 'Settlement',
    entityId: settlement._id,
    description: `${req.user.name} generated settlement ${settlement.settlementNo} (₹${totalLabPayable} payable, ${bookings.length} booking(s))`,
  });

  res.status(201).json(settlement);
});

exports.listSettlements = asyncHandler(async (req, res) => {
  const { lab, status, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
  const filter = {};
  if (lab) filter.lab = lab;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    Settlement.find(filter).populate('lab', 'name city').sort('-createdAt').skip(skip).limit(safeLimit),
    Settlement.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.getSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id).populate('lab', 'name city phone publicPhone').populate('generatedBy', 'name');
  if (!settlement) return res.status(404).json({ message: 'Settlement not found' });
  res.json(settlement);
});

// PATCH /settlements/:id/status — body { status, amountPaid?, paymentReference?, paymentMethod?, notes? }
exports.updateSettlementStatus = asyncHandler(async (req, res) => {
  const { status, amountPaid, paymentReference, paymentMethod, notes } = req.body;
  if (!['pending', 'partial', 'paid'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ message: 'Settlement not found' });

  if (amountPaid !== undefined) {
    const amt = Number(amountPaid);
    if (Number.isNaN(amt) || amt < 0 || amt > settlement.totalLabPayable) {
      return res.status(400).json({ message: `Amount paid must be between 0 and ₹${settlement.totalLabPayable}.` });
    }
    settlement.amountPaid = amt;
  }

  settlement.status = status;
  if (paymentReference !== undefined) settlement.paymentReference = paymentReference;
  if (paymentMethod !== undefined) settlement.paymentMethod = paymentMethod;
  if (notes !== undefined) settlement.notes = notes;
  if (status === 'paid') {
    settlement.paidAt = new Date();
    if (amountPaid === undefined) settlement.amountPaid = settlement.totalLabPayable;
  }

  await settlement.save();

  logActivity({
    actor: req.user,
    action: 'settlement.status_changed',
    entity: 'Settlement',
    entityId: settlement._id,
    description: `${req.user.name} marked settlement ${settlement.settlementNo} as ${status}`,
  });

  res.json(settlement);
});

// GET /settlements/export-csv?lab=&status=
exports.exportCsv = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.lab) filter.lab = req.query.lab;
  if (req.query.status) filter.status = req.query.status;
  const settlements = await Settlement.find(filter).populate('lab', 'name').sort('-createdAt').limit(10000).lean();

  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headers = ['settlementNo', 'lab', 'periodFrom', 'periodTo', 'bookingCount', 'totalAdminRevenue', 'totalLabPayable', 'totalAdminProfit', 'amountPaid', 'status', 'createdAt'];
  const rows = settlements.map((s) => [
    s.settlementNo, s.lab?.name || '',
    s.periodFrom ? new Date(s.periodFrom).toISOString().slice(0, 10) : '',
    s.periodTo ? new Date(s.periodTo).toISOString().slice(0, 10) : '',
    (s.lineItems || []).length, s.totalAdminRevenue || 0, s.totalLabPayable || 0, s.totalAdminProfit || 0, s.amountPaid || 0, s.status,
    s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : '',
  ].map(escape).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="settlements-export.csv"');
  res.send(csv);
});
