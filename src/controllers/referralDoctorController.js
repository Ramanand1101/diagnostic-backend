const ReferralDoctor = require('../models/ReferralDoctor');
const Lead = require('../models/Lead');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, lab, city, q } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const skip = (Number(page) - 1) * safeLimit;

    const filter = {};
    if (lab) filter.lab = lab;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { hospital: { $regex: q, $options: 'i' } },
        { specialization: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      ReferralDoctor.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('lab', 'name city'),
      ReferralDoctor.countDocuments(filter),
    ]);

    // attach referral counts
    const doctorIds = items.map((d) => d._id);
    const referralCounts = await Lead.aggregate([
      { $match: { referredBy: { $in: doctorIds } } },
      { $group: { _id: '$referredBy', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    referralCounts.forEach((r) => { countMap[r._id.toString()] = r.count; });

    const enriched = items.map((d) => ({
      ...d.toObject(),
      referralCount: countMap[d._id.toString()] || 0,
    }));

    res.json({ items: enriched, total, page: Number(page), limit: safeLimit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const doc = await ReferralDoctor.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const doc = await ReferralDoctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await ReferralDoctor.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
