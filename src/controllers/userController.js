const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../config/email');

// POST /api/v1/users — admin creates a user and emails them a temp password
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, mobile, role = 'customer' } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });

  const exists = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
  if (exists) return res.status(409).json({ message: 'A user with this email already exists.' });

  // Generate a readable temp password: e.g. Diag@4832
  const rand = Math.floor(1000 + Math.random() * 9000);
  const tempPassword = `Health@${rand}`;

  const user = await User.create({ name, email, mobile: mobile || undefined, role, password: tempPassword, isVerified: true });

  // Send welcome email with temp password
  try {
    await sendMail({
      to: email,
      subject: 'Your account has been created — HealthOnTime',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1d4ed8">Welcome to HealthOnTime, ${name}!</h2>
          <p>An account has been created for you by the admin.</p>
          <p><strong>Login Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong>
            <span style="font-size:1.3rem;font-weight:700;letter-spacing:2px;color:#111">${tempPassword}</span>
          </p>
          <p style="color:#dc2626;font-size:0.9rem">⚠ Please change your password after logging in.</p>
          <a href="${process.env.FRONTEND_URL || 'https://healthontime.in'}/login"
            style="display:inline-block;margin-top:1rem;background:#1d4ed8;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Login Now →
          </a>
        </div>
      `,
    });
  } catch (e) {
    // Don't fail the request if email fails — just warn
    console.error('Welcome email failed:', e.message);
  }

  res.status(201).json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role }, tempPassword });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  ['name', 'email', 'mobile', 'alternateMobile', 'alternateEmail', 'avatar'].forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  if (req.body.location) {
    user.location = {
      lat: req.body.location.lat,
      lng: req.body.location.lng,
      address: req.body.location.address || '',
    };
  }

  if (Array.isArray(req.body.addresses)) {
    user.addresses = req.body.addresses;
  }

  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json(user);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: 'Current and new password are required.' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });

  const user = await User.findById(req.user._id).select('+password');
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed successfully.' });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const { role, q, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = role ? { role } : {};
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { mobile: new RegExp(q, 'i') }];
  const skip = (Number(page) - 1) * safeLimit;

  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort('-createdAt').skip(skip).limit(safeLimit),
    User.countDocuments(filter),
  ]);

  res.json({ items: users, total, page: Number(page), limit: safeLimit });
});

exports.updateRole = asyncHandler(async (req, res) => {
  const VALID_ROLES = ['superadmin', 'subadmin', 'lab', 'customer'];
  const { role } = req.body;
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ message: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Only superadmin can promote to superadmin
  if (role === 'superadmin' && req.user.role !== 'superadmin')
    return res.status(403).json({ message: 'Only superadmin can assign superadmin role' });

  // Cannot demote another superadmin unless you are one
  if (user.role === 'superadmin' && req.user.role !== 'superadmin')
    return res.status(403).json({ message: 'Cannot change a superadmin\'s role' });

  user.role = role;
  await user.save();
  res.json({ message: `Role updated to ${role}`, user: { _id: user._id, name: user.name, role: user.role } });
});

const VALID_PERMISSIONS = [
  'labs','brands','products','categories','test-master','bulk-upload',
  'crm','bookings','reports','lab-changes','users','reviews','tickets',
  'hero-slides','home-settings','coupons','blogs','newsletter','pages','settings',
];

exports.updatePermissions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role !== 'subadmin') return res.status(400).json({ message: 'Permissions can only be set for subadmins' });
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return res.status(400).json({ message: 'permissions must be an array' });
  const filtered = permissions.filter((p) => VALID_PERMISSIONS.includes(p));
  user.permissions = filtered;
  await user.save();
  res.json({ message: 'Permissions updated', permissions: user.permissions });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'superadmin') return res.status(403).json({ message: 'Cannot delete superadmin' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

exports.bulkDeleteUsers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ message: 'ids array is required' });
  // Never delete superadmins via bulk
  const result = await User.deleteMany({ _id: { $in: ids }, role: { $ne: 'superadmin' } });
  res.json({ message: `${result.deletedCount} user(s) deleted` });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'superadmin' && req.user.role !== 'superadmin')
    return res.status(403).json({ message: 'Only superadmin can reset superadmin passwords' });

  // Generate random readable password: 3 words pattern
  const chars = 'abcdefghjkmnpqrstuvwxyz';
  const nums  = '23456789';
  const rand  = (s) => s[Math.floor(Math.random() * s.length)];
  const newPassword = [
    Array.from({ length: 4 }, () => rand(chars)).join(''),
    Array.from({ length: 2 }, () => rand(nums)).join(''),
    Array.from({ length: 4 }, () => rand(chars)).join(''),
  ].join('-');

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Send email notification if requested (default true)
  const sendEmail = req.body.sendEmail !== false;
  if (sendEmail && user.email) {
    try {
      await sendMail({
        to: user.email,
        subject: 'Your HealthOnTime Password Has Been Reset',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
            <div style="background:#0ea5e9;padding:24px 32px;border-radius:12px 12px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Password Reset</h1>
            </div>
            <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
              <p>Hi <strong>${user.name || 'there'}</strong>,</p>
              <p>Your HealthOnTime account password has been reset by an administrator.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
                <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Your new password</p>
                <p style="margin:8px 0 0;font-size:22px;font-weight:700;letter-spacing:.08em;font-family:monospace;color:#0ea5e9">${newPassword}</p>
              </div>
              <p style="font-size:13px;color:#64748b">Please log in with this password and change it immediately from your profile settings.</p>
              <a href="${process.env.FRONTEND_URL || 'https://healthontime.in'}/login"
                style="display:inline-block;margin-top:8px;background:#0ea5e9;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                Login Now →
              </a>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
              <p style="font-size:11px;color:#94a3b8;margin:0">If you did not expect this, please contact support immediately.</p>
            </div>
          </div>`,
      });
    } catch (e) {
      console.error('[resetPassword] email failed:', e.message);
    }
  }

  res.json({
    message: 'Password reset successfully',
    tempPassword: newPassword,
    emailSent: sendEmail && !!user.email,
  });
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 }).select('name email mobile role createdAt').lean();
  const header = 'name,email,mobile,role,createdAt';
  const rows = users.map((u) => [
    `"${(u.name || '').replace(/"/g, '""')}"`,
    `"${(u.email || '').replace(/"/g, '""')}"`,
    `"${(u.mobile || '').replace(/"/g, '""')}"`,
    u.role || 'customer',
    u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
  ].join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
  res.send([header, ...rows].join('\n'));
});
