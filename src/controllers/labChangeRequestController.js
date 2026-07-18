const asyncHandler = require('express-async-handler');
const Lab = require('../models/Lab');
const LabChangeRequest = require('../models/LabChangeRequest');
const { syncObjects } = require('../services/algoliaSync');

// Fields that go through approval (not internal admin fields)
const TRACKED_FIELDS = [
  'name', 'description', 'address', 'area', 'city', 'state', 'pincode',
  'phone', 'email', 'website', 'homeCollection', 'lat', 'lng',
  'accreditation', 'openingHours', 'sampleCollectionTime', 'reportDeliveryTime',
];

// POST /api/v1/lab-change-requests — lab user submits a change request
exports.submit = asyncHandler(async (req, res) => {
  const lab = await Lab.findOne({ owners: req.user._id });
  if (!lab) return res.status(404).json({ message: 'No lab found for your account' });

  // Only store fields that actually changed
  const normalize = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return JSON.stringify(v);
    return String(v).trim();
  };

  const changes = {};
  const currentValues = {};
  TRACKED_FIELDS.forEach((f) => {
    if (req.body[f] === undefined) return; // not sent in payload
    const oldVal = lab[f] ?? null;
    const newVal = req.body[f];
    if (normalize(oldVal) === normalize(newVal)) return; // no actual change
    changes[f] = newVal;
    currentValues[f] = oldVal;
  });

  if (Object.keys(changes).length === 0)
    return res.status(400).json({ message: 'No changes detected — values are same as current' });

  // Cancel any existing pending request for this lab
  await LabChangeRequest.deleteMany({ lab: lab._id, status: 'pending' });

  const request = await LabChangeRequest.create({
    lab: lab._id,
    requestedBy: req.user._id,
    changes,
    currentValues,
    status: 'pending',
  });

  // Mark lab as having pending changes so it appears in admin "Pending Approval" filter
  await Lab.findByIdAndUpdate(lab._id, { changesPending: true });

  res.status(201).json({ message: 'Change request submitted for admin approval', request });
});

// GET /api/v1/lab-change-requests/mine — lab user: get their pending request
exports.getMine = asyncHandler(async (req, res) => {
  const lab = await Lab.findOne({ owners: req.user._id });
  if (!lab) return res.json(null);
  const request = await LabChangeRequest.findOne({ lab: lab._id, status: 'pending' })
    .populate('requestedBy', 'name email')
    .sort('-createdAt');
  res.json(request || null);
});

// GET /api/v1/lab-change-requests — admin: list all requests
exports.list = asyncHandler(async (req, res) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const filter = status !== 'all' ? { status } : {};
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const skip = (Number(page) - 1) * safeLimit;

  const [items, total] = await Promise.all([
    LabChangeRequest.find(filter)
      .populate('lab', 'name city slug verificationStatus approved')
      .populate('requestedBy', 'name email mobile')
      .populate('reviewedBy', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(safeLimit),
    LabChangeRequest.countDocuments(filter),
  ]);

  res.json({ items, total, page: Number(page), limit: safeLimit });
});

// PATCH /api/v1/lab-change-requests/:id/approve — admin
exports.approve = asyncHandler(async (req, res) => {
  const changeReq = await LabChangeRequest.findById(req.params.id).populate('lab');
  if (!changeReq) return res.status(404).json({ message: 'Change request not found' });
  if (changeReq.status !== 'pending') return res.status(400).json({ message: 'Already reviewed' });

  // Apply changes to Lab and clear pending flag
  const lab = await Lab.findByIdAndUpdate(
    changeReq.lab._id,
    { $set: { ...changeReq.changes, changesPending: false } },
    { new: true, runValidators: true }
  );

  if (!lab) return res.status(404).json({ message: 'Lab not found' });

  // Sync to Algolia
  try { await syncObjects('labs', [{ objectID: String(lab._id), name: lab.name, city: lab.city }]); } catch {}

  changeReq.status = 'approved';
  changeReq.reviewedBy = req.user._id;
  changeReq.reviewedAt = new Date();
  await changeReq.save();

  res.json({ message: 'Changes approved and applied to lab', changeReq });
});

// PATCH /api/v1/lab-change-requests/:id/reject — admin
exports.reject = asyncHandler(async (req, res) => {
  const changeReq = await LabChangeRequest.findById(req.params.id);
  if (!changeReq) return res.status(404).json({ message: 'Change request not found' });
  if (changeReq.status !== 'pending') return res.status(400).json({ message: 'Already reviewed' });

  changeReq.status = 'rejected';
  changeReq.reviewedBy = req.user._id;
  changeReq.reviewedAt = new Date();
  changeReq.adminNote = req.body.adminNote || '';
  await changeReq.save();

  // Clear pending flag on the lab
  await Lab.findByIdAndUpdate(changeReq.lab, { changesPending: false });

  res.json({ message: 'Change request rejected', changeReq });
});
