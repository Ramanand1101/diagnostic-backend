const Lab = require('../models/Lab');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Settlement = require('../models/Settlement');

// Helper: get lab by owner
const getLabByOwner = async (userId) => Lab.findOne({ owners: userId });

// GET /api/v1/lab-crm/stats
exports.stats = async (req, res) => {
  try {
    const lab = await getLabByOwner(req.user._id);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [
      totalPatients,
      newLeads,
      pendingFollowUps,
      todayFollowUps,
      convertedThisMonth,
      revenueThisMonth,
    ] = await Promise.all([
      // distinct users who booked at this lab
      Booking.distinct('user', { lab: lab._id, isDeleted: false, user: { $ne: null } }).then((ids) => ids.length),
      Lead.countDocuments({ lab: lab._id, status: 'new' }),
      FollowUp.countDocuments({ lab: lab._id, status: 'pending' }),
      FollowUp.countDocuments({ lab: lab._id, status: 'pending', scheduledAt: { $gte: todayStart, $lt: todayEnd } }),
      Lead.countDocuments({ lab: lab._id, status: 'converted', updatedAt: { $gte: startOfMonth } }),
      Booking.aggregate([
        { $match: { lab: lab._id, paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json({
      totalPatients,
      newLeads,
      pendingFollowUps,
      todayFollowUps,
      convertedThisMonth,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
      labId: lab._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/lab-crm/patients
exports.patientList = async (req, res) => {
  try {
    const lab = await getLabByOwner(req.user._id);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const { page = 1, limit = 20, q } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const skip = (Number(page) - 1) * safeLimit;

    // Get unique user IDs who booked at this lab
    const bookingAgg = await Booking.aggregate([
      { $match: { lab: lab._id, isDeleted: false, user: { $ne: null } } },
      {
        $group: {
          _id: '$user',
          totalBookings: { $sum: 1 },
          totalSpend: { $sum: '$total' },
          lastVisit: { $max: '$createdAt' },
        },
      },
      { $sort: { lastVisit: -1 } },
    ]);

    const userIds = bookingAgg.map((b) => b._id);
    const statsMap = {};
    bookingAgg.forEach((b) => { statsMap[b._id.toString()] = b; });

    // Filter by search
    const userFilter = { _id: { $in: userIds } };
    if (q) {
      userFilter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(userFilter).select('name email mobile createdAt').skip(skip).limit(safeLimit),
      User.countDocuments(userFilter),
    ]);

    const items = users.map((u) => {
      const s = statsMap[u._id.toString()] || {};
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        createdAt: u.createdAt,
        totalBookings: s.totalBookings || 0,
        totalSpend: s.totalSpend || 0,
        lastVisit: s.lastVisit || null,
      };
    });

    res.json({ items, total, page: Number(page), limit: safeLimit, labId: lab._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/lab-crm/billing
exports.billing = async (req, res) => {
  try {
    const lab = await getLabByOwner(req.user._id);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const { from, to, page = 1, limit = 20, paymentStatus } = req.query;
    const safeLimit = Math.min(Number(limit) || 20, 200);
    const skip = (Number(page) - 1) * safeLimit;

    const baseFilter = { lab: lab._id, isDeleted: false };
    if (from || to) {
      baseFilter.createdAt = {};
      if (from) baseFilter.createdAt.$gte = new Date(from + 'T00:00:00.000Z');
      if (to)   baseFilter.createdAt.$lte = new Date(to   + 'T23:59:59.999Z');
    }

    // The table below shows every booking (cancelled ones too, for a full audit trail),
    // but a cancelled/refunded booking isn't real revenue — the stat cards above it
    // should behave according to the booking's actual status, not just paymentStatus.
    const statsFilter = { ...baseFilter, status: { $nin: ['cancelled', 'refunded'] } };

    const listFilter = { ...baseFilter };
    if (paymentStatus) listFilter.paymentStatus = paymentStatus;

    const [totalAgg, paidAgg, payoutAgg, bookings, count] = await Promise.all([
      Booking.aggregate([
        { $match: statsFilter },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { ...statsFilter, paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      // "Your Payout" — the lab's own cut, not the full customer-paid amount above.
      // Only counts bookings with a known lab price (see Booking.labPayable).
      Booking.aggregate([
        { $match: { ...statsFilter, paymentStatus: 'paid', labPayable: { $ne: null } } },
        { $group: { _id: null, payout: { $sum: '$labPayable' }, count: { $sum: 1 } } },
      ]),
      Booking.find(listFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('user', 'name mobile email')
        .lean(),
      Booking.countDocuments(listFilter),
    ]);

    const totalRevenue = totalAgg[0]?.revenue || 0;
    const bookingCount = totalAgg[0]?.count  || 0;
    const paidRevenue  = paidAgg[0]?.revenue || 0;
    const paidCount    = paidAgg[0]?.count   || 0;

    res.json({
      totalRevenue, bookingCount,
      paidRevenue,  paidCount,
      unpaidRevenue: totalRevenue - paidRevenue,
      unpaidCount:   bookingCount - paidCount,
      labPayoutRevenue: payoutAgg[0]?.payout || 0,
      labPayoutCount: payoutAgg[0]?.count || 0,
      bookings, total: count,
      page: Number(page), limit: safeLimit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/lab-crm/billing/export-csv — same filters as `billing` above, but every
// matching row (up to 10k) instead of one page, for the lab to download their own records.
exports.billingExportCsv = async (req, res) => {
  try {
    const lab = await getLabByOwner(req.user._id);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const { from, to, paymentStatus } = req.query;
    const filter = { lab: lab._id, isDeleted: false };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from + 'T00:00:00.000Z');
      if (to)   filter.createdAt.$lte = new Date(to   + 'T23:59:59.999Z');
    }
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000)
      .populate('user', 'name mobile')
      .lean();

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ['bookingNo', 'patient', 'customer', 'mobile', 'date', 'tests', 'amount', 'yourPayout', 'paymentStatus', 'status'];
    const rows = bookings.map((b) => [
      b.bookingNo,
      b.patientSnapshot?.name || '',
      b.user?.name || b.guest?.name || '',
      b.user?.mobile || b.guest?.mobile || '',
      b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : '',
      (b.items || []).map((i) => i.name).join('; '),
      b.total || 0,
      b.labPayable != null ? b.labPayable : '',
      b.paymentStatus,
      b.status,
    ].map(escape).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="billing-export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/lab-crm/settlements — read-only history of settlements admin has
// generated for this lab, plus a running earnings/settled/pending summary.
exports.settlements = async (req, res) => {
  try {
    const lab = await getLabByOwner(req.user._id);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const { page = 1, limit = 20, status } = req.query;
    const safeLimit = Math.min(Number(limit) || 20, 200);
    const skip = (Number(page) - 1) * safeLimit;

    const filter = { lab: lab._id };
    if (status) filter.status = status;

    const [items, total, earningsAgg, settledAgg] = await Promise.all([
      Settlement.find(filter).sort('-createdAt').skip(skip).limit(safeLimit),
      Settlement.countDocuments(filter),
      // Total ever earned, regardless of whether it's been batched into a settlement yet.
      // Excludes cancelled/refunded — that was never real revenue even if it was paid
      // before being cancelled.
      Booking.aggregate([
        { $match: { lab: lab._id, isDeleted: false, paymentStatus: 'paid', labPayable: { $ne: null }, status: { $nin: ['cancelled', 'refunded'] } } },
        { $group: { _id: null, total: { $sum: '$labPayable' } } },
      ]),
      Settlement.aggregate([
        { $match: { lab: lab._id } },
        { $group: { _id: null, paid: { $sum: '$amountPaid' } } },
      ]),
    ]);

    const totalEarnings = earningsAgg[0]?.total || 0;
    const settledAmount = settledAgg[0]?.paid || 0;

    res.json({
      items, total, page: Number(page), limit: safeLimit,
      totalEarnings, settledAmount,
      pendingAmount: totalEarnings - settledAmount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/lab-crm/patients/:id
exports.patientDetail = async (req, res) => {
  try {
    const lab = await getLabByOwner(req.user._id);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Patient not found' });

    const [bookings, followUps] = await Promise.all([
      Booking.find({ user: user._id, lab: lab._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .populate('items.product', 'name')
        .limit(50),
      FollowUp.find({ patient: user._id, lab: lab._id }).sort({ scheduledAt: -1 }).limit(20),
    ]);

    const totalSpend = bookings.reduce((s, b) => s + (b.total || 0), 0);
    res.json({ user, bookings, followUps, totalSpend, labId: lab._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
