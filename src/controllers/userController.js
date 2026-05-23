const asyncHandler = require('express-async-handler');
const User = require('../models/User');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  ['name', 'email', 'mobile', 'avatar'].forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json(user);
});

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort('-createdAt');
  res.json(users);
});
