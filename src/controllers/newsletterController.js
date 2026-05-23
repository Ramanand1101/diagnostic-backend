const asyncHandler = require('express-async-handler');
const Newsletter = require('../models/Newsletter');

exports.subscribe = asyncHandler(async (req, res) => {
  const { email, source } = req.body;
  const existing = await Newsletter.findOne({ email });
  if (existing) return res.json(existing);
  const item = await Newsletter.create({ email, source });
  res.status(201).json(item);
});

exports.listSubscribers = asyncHandler(async (req, res) => {
  const items = await Newsletter.find().sort('-createdAt');
  res.json(items);
});
