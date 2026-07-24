const asyncHandler = require('express-async-handler');
const Corporate = require('../models/Corporate');
const User = require('../models/User');
const { sendMail } = require('../config/email');

exports.listCorporates = asyncHandler(async (req, res) => {
  const { q, city, active, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = {};
  if (q) filter.$or = [{ companyName: new RegExp(q, 'i') }, { city: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  if (city) filter.city = new RegExp(city, 'i');
  if (active !== undefined) filter.active = active === 'true';

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    Corporate.find(filter)
      .populate('owners', 'name email mobile isActive')
      .populate('assignedLabs', 'name city')
      .populate('relationshipManager', 'name email role')
      .sort('-createdAt').skip(skip).limit(safeLimit),
    Corporate.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.getCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id)
    .populate('owners', 'name email mobile isActive')
    .populate('assignedLabs', 'name city address')
    .populate('relationshipManager', 'name email role');
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  res.json(corporate);
});

// Corporate-role user viewing their own company (used to scope appointment scheduling)
exports.getMyCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findOne({ owners: req.user._id })
    .populate('assignedLabs', 'name city address phone');
  res.json(corporate || null);
});

exports.createCorporate = asyncHandler(async (req, res) => {
  const { companyName, email, phone } = req.body;
  if (!companyName || !email || !phone) {
    return res.status(400).json({ message: 'Company name, email and phone are required.' });
  }
  const corporate = await Corporate.create(req.body);
  res.status(201).json(corporate);
});

exports.updateCorporate = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  delete payload.owners;            // managed via dedicated account-manager endpoints
  delete payload.assignedLabs;      // managed via /labs endpoint
  delete payload.relationshipManager; // managed via /relationship-manager endpoint

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
