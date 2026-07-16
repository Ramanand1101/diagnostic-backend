const User = require('../models/User');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');

// GET /api/v1/crm/stats
exports.stats = async (req, res) => {
  try {
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
      User.countDocuments({ role: 'customer' }),
      Lead.countDocuments({ status: 'new' }),
      FollowUp.countDocuments({ status: 'pending' }),
      FollowUp.countDocuments({ status: 'pending', scheduledAt: { $gte: todayStart, $lt: todayEnd } }),
      Lead.countDocuments({ status: 'converted', updatedAt: { $gte: startOfMonth } }),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
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
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/crm/patients
exports.patientList = async (req, res) => {
  try {
    const { page = 1, limit = 20, q } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
    const skip = (Number(page) - 1) * safeLimit;

    const filter = { role: 'customer' };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).select('name email mobile createdAt lastLoginAt'),
      User.countDocuments(filter),
    ]);

    // get booking stats per user
    const userIds = users.map((u) => u._id);
    const bookingStats = await Booking.aggregate([
      { $match: { user: { $in: userIds }, isDeleted: false } },
      {
        $group: {
          _id: '$user',
          totalBookings: { $sum: 1 },
          totalSpend: { $sum: '$total' },
          lastVisit: { $max: '$createdAt' },
        },
      },
    ]);

    const statsMap = {};
    bookingStats.forEach((s) => { statsMap[s._id.toString()] = s; });

    const items = users.map((u) => {
      const stats = statsMap[u._id.toString()] || { totalBookings: 0, totalSpend: 0, lastVisit: null };
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        totalBookings: stats.totalBookings,
        totalSpend: stats.totalSpend,
        lastVisit: stats.lastVisit,
      };
    });

    res.json({ items, total, page: Number(page), limit: safeLimit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/crm/patients/:id
exports.patientDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Patient not found' });

    const [bookings, reports, followUps] = await Promise.all([
      Booking.find({ user: user._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .populate('lab', 'name city')
        .populate('items.product', 'name')
        .limit(50),
      Report.find({ user: user._id }).sort({ createdAt: -1 }).limit(20),
      FollowUp.find({ patient: user._id }).sort({ scheduledAt: -1 }).limit(20),
    ]);

    const totalSpend = bookings.reduce((s, b) => s + (b.total || 0), 0);

    res.json({ user, bookings, reports, followUps, totalSpend });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
