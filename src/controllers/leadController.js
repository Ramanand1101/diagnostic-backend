const Lead = require('../models/Lead');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, lab, q } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
    const skip = (Number(page) - 1) * safeLimit;

    const filter = {};
    if (status) filter.status = status;
    if (lab) filter.lab = lab;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { interestedIn: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('lab', 'name city')
        .populate('referredBy', 'name specialization')
        .populate('assignedTo', 'name'),
      Lead.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), limit: safeLimit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('lab', 'name city')
      .populate('referredBy', 'name specialization');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.convert = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status: 'converted', convertedBooking: bookingId || null },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
