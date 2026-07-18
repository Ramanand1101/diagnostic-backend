const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

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
