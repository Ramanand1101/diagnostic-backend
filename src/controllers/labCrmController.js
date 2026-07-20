const Lab = require('../models/Lab');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');

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

    const listFilter = { ...baseFilter };
    if (paymentStatus) listFilter.paymentStatus = paymentStatus;

    const [totalAgg, paidAgg, bookings, count] = await Promise.all([
      Booking.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { ...baseFilter, paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
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
      bookings, total: count,
      page: Number(page), limit: safeLimit,
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
