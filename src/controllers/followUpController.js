const FollowUp = require('../models/FollowUp');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, patient, lead, today } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
    const skip = (Number(page) - 1) * safeLimit;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (patient) filter.patient = patient;
    if (lead) filter.lead = lead;

    if (today === 'true') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 86400000);
      filter.scheduledAt = { $gte: start, $lt: end };
    }

    const [items, total] = await Promise.all([
      FollowUp.find(filter)
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('patient', 'name mobile email')
        .populate('lead', 'name mobile status')
        .populate('lab', 'name city')
        .populate('assignedTo', 'name'),
      FollowUp.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), limit: safeLimit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const followUp = await FollowUp.create(req.body);
    const populated = await followUp.populate([
      { path: 'patient', select: 'name mobile email' },
      { path: 'lead', select: 'name mobile status' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    if (req.body.status === 'done' && !req.body.completedAt) {
      req.body.completedAt = new Date();
    }
    const followUp = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('patient', 'name mobile email')
      .populate('lead', 'name mobile status');
    if (!followUp) return res.status(404).json({ message: 'Follow-up not found' });
    res.json(followUp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const followUp = await FollowUp.findByIdAndDelete(req.params.id);
    if (!followUp) return res.status(404).json({ message: 'Follow-up not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
