const asyncHandler = require('express-async-handler');
const Corporate = require('../models/Corporate');
const User = require('../models/User');
const { sendMail } = require('../config/email');
const { isValidEmail, isValidPhone, isValidPincode } = require('../utils/validators');

// Validates company + HR contact fields (required ones + any optional ones that were provided).
// Returns an error message string, or null if everything looks valid.
function validateCorporatePayload(payload) {
  if (payload.email !== undefined && !isValidEmail(payload.email)) return 'Enter a valid company email address.';
  if (payload.phone !== undefined && !isValidPhone(payload.phone)) return 'Enter a valid company phone number.';
  if (payload.pincode && !isValidPincode(payload.pincode)) return 'Company pincode must be exactly 6 digits.';

  for (const e of payload.emails || []) {
    if (e && !isValidEmail(e)) return `Extra company email "${e}" is not valid.`;
  }
  for (const p of payload.phones || []) {
    if (p && !isValidPhone(p)) return `Extra company phone "${p}" is not valid.`;
  }

  const hr = payload.hr;
  if (hr) {
    if (hr.email && !isValidEmail(hr.email)) return 'Enter a valid HR email address.';
    if (hr.phone && !isValidPhone(hr.phone)) return 'Enter a valid HR phone number.';
    if (hr.pincode && !isValidPincode(hr.pincode)) return 'HR pincode must be exactly 6 digits.';
    for (const e of hr.emails || []) {
      if (e && !isValidEmail(e)) return `Extra HR email "${e}" is not valid.`;
    }
    for (const p of hr.phones || []) {
      if (p && !isValidPhone(p)) return `Extra HR phone "${p}" is not valid.`;
    }
  }

  return null;
}

exports.listCorporates = asyncHandler(async (req, res) => {
  const { q, city, active, mine, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = {};
  if (q) filter.$or = [{ companyName: new RegExp(q, 'i') }, { city: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  if (city) filter.city = new RegExp(city, 'i');
  if (active !== undefined) filter.active = active === 'true';
  // Relationship managers can filter to just the accounts assigned to them
  if (mine === 'true') filter.relationshipManager = req.user._id;

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    Corporate.find(filter)
      .populate('owners', 'name email mobile isActive')
      .populate('assignedLabs', 'name city')
      .populate('relationshipManager', 'name email role')
      .populate('packages.package', 'name basePrice')
      .sort('-createdAt').skip(skip).limit(safeLimit),
    Corporate.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.getCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id)
    .populate('owners', 'name email mobile isActive')
    .populate('assignedLabs', 'name city address')
    .populate('relationshipManager', 'name email role')
    .populate('packages.package', 'name basePrice items');
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// Corporate-role user viewing their own company (used to scope appointment scheduling)
exports.getMyCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findOne({ owners: req.user._id })
    .populate('assignedLabs', 'name city address phone')
    .populate('packages.package', 'name basePrice items');
  res.json(corporate || null);
});

exports.createCorporate = asyncHandler(async (req, res) => {
  const { companyName, email, phone } = req.body;
  if (!companyName || !email || !phone) {
    return res.status(400).json({ message: 'Company name, email and phone are required.' });
  }
  const validationError = validateCorporatePayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const corporate = await Corporate.create(req.body);
  res.status(201).json(corporate);
});

exports.updateCorporate = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  delete payload.owners;            // managed via dedicated account-manager endpoints
  delete payload.assignedLabs;      // managed via /labs endpoint
  delete payload.relationshipManager; // managed via /relationship-manager endpoint
  delete payload.packages;          // managed via /packages endpoint
  delete payload.settings;          // managed via /settings endpoint

  const validationError = validateCorporatePayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });

  const corporate = await Corporate.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

exports.deleteCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findByIdAndDelete(req.params.id);
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json({ message: 'Corporate deleted' });
});

// PATCH /:id/status — activate/suspend
exports.setStatus = asyncHandler(async (req, res) => {
  const { active } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ message: 'active (boolean) is required.' });
  const corporate = await Corporate.findByIdAndUpdate(req.params.id, { active }, { new: true });
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// PATCH /:id/labs — replace the assigned labs list
exports.assignLabs = asyncHandler(async (req, res) => {
  const { labIds } = req.body;
  if (!Array.isArray(labIds)) return res.status(400).json({ message: 'labIds array is required.' });
  const corporate = await Corporate.findByIdAndUpdate(req.params.id, { assignedLabs: labIds }, { new: true })
    .populate('assignedLabs', 'name city');
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// PATCH /:id/packages — replace the assigned packages list (with corporate-specific pricing)
exports.assignPackages = asyncHandler(async (req, res) => {
  const { packages } = req.body;
  if (!Array.isArray(packages)) return res.status(400).json({ message: 'packages array is required.' });
  const CorporatePackage = require('../models/CorporatePackage');
  const normalized = [];
  for (const p of packages) {
    const pkgId = p.package || p.packageId || p;
    const pkgDoc = await CorporatePackage.findById(pkgId).select('basePrice');
    if (!pkgDoc) return res.status(400).json({ message: `Package ${pkgId} not found.` });
    normalized.push({ package: pkgId, price: p.price != null ? Number(p.price) : pkgDoc.basePrice });
  }
  const corporate = await Corporate.findByIdAndUpdate(req.params.id, { packages: normalized }, { new: true })
    .populate('packages.package', 'name basePrice');
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// PATCH /:id/relationship-manager — assign HealthOnTime staff to manage this account
exports.assignRelationshipManager = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (userId) {
    const rm = await User.findById(userId);
    if (!rm || !['superadmin', 'subadmin'].includes(rm.role)) {
      return res.status(400).json({ message: 'Relationship manager must be an existing admin/sub-admin user.' });
    }
  }
  const corporate = await Corporate.findByIdAndUpdate(req.params.id, { relationshipManager: userId || null }, { new: true })
    .populate('relationshipManager', 'name email role');
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// POST /:id/account-managers — create a login (role: corporate) and link it, emailing a temp password
exports.addAccountManager = asyncHandler(async (req, res) => {
  const { name, email, mobile } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (mobile && !isValidPhone(mobile)) return res.status(400).json({ message: 'Enter a valid mobile number.' });

  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });

  const exists = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
  if (exists) return res.status(409).json({ message: 'A user with this email already exists.' });

  const rand = Math.floor(1000 + Math.random() * 9000);
  const tempPassword = `Corp@${rand}`;

  const user = await User.create({ name, email, mobile: mobile || undefined, role: 'corporate', password: tempPassword });
  corporate.owners.push(user._id);
  await corporate.save();

  try {
    await sendMail({
      to: email,
      subject: `Your ${corporate.companyName} account manager access — HealthOnTime`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1d4ed8">Welcome, ${name}!</h2>
          <p>You've been added as an account manager for <strong>${corporate.companyName}</strong> on HealthOnTime. You can schedule appointments for this account's assigned labs.</p>
          <p><strong>Login Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong>
            <span style="font-size:1.3rem;font-weight:700;letter-spacing:2px;color:#111">${tempPassword}</span>
          </p>
          <p style="color:#dc2626;font-size:0.9rem">⚠ Please change your password after logging in.</p>
          <a href="${process.env.FRONTEND_URL || 'https://healthontime.in'}/login"
            style="display:inline-block;margin-top:1rem;background:#1d4ed8;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Login Now →
          </a>
        </div>`,
    });
  } catch (e) {
    console.error('[Corporate] account manager welcome email failed:', e.message);
  }

  res.status(201).json({ user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, tempPassword });
});

// DELETE /:id/account-managers/:userId — unlink (keeps the user account itself intact)
exports.removeAccountManager = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findByIdAndUpdate(
    req.params.id,
    { $pull: { owners: req.params.userId } },
    { new: true }
  ).populate('owners', 'name email mobile isActive');
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// PATCH /:id/settings — reminder-days config + default employee notification channels
exports.updateSettings = asyncHandler(async (req, res) => {
  const { reminderDaysBefore, defaultNotifyChannels } = req.body;
  const update = {};
  if (Array.isArray(reminderDaysBefore)) update['settings.reminderDaysBefore'] = reminderDaysBefore.map(Number).filter((n) => n > 0);
  if (Array.isArray(defaultNotifyChannels)) update['settings.defaultNotifyChannels'] = defaultNotifyChannels.filter((c) => ['email', 'whatsapp'].includes(c));

  const corporate = await Corporate.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// GET /:id/billing — day/month/year-wise billing view. Only appointments whose report is
// FULLY uploaded (status: 'completed') are billable — a partial report does not count.
exports.getBilling = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });

  const { from, to, groupBy = 'day' } = req.query;
  const CorporateAppointment = require('../models/CorporateAppointment');

  const filter = { corporate: corporate._id, status: 'completed' };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from + 'T00:00:00.000Z');
    if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
  }

  const dateFormat = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' }[groupBy] || '%Y-%m-%d';

  const [summaryAgg, unbilledAgg, byPeriod, appointments] = await Promise.all([
    CorporateAppointment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    CorporateAppointment.aggregate([
      { $match: { ...filter, invoiced: false } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    CorporateAppointment.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    CorporateAppointment.find(filter).sort('-createdAt').limit(500).populate('lab', 'name'),
  ]);

  res.json({
    totalAmount: summaryAgg[0]?.total || 0,
    totalCount: summaryAgg[0]?.count || 0,
    unbilledAmount: unbilledAgg[0]?.total || 0,
    unbilledCount: unbilledAgg[0]?.count || 0,
    byPeriod,
    appointments,
  });
});
