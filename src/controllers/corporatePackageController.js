const asyncHandler = require('express-async-handler');
const CorporatePackage = require('../models/CorporatePackage');

exports.listPackages = asyncHandler(async (req, res) => {
  const { q, active, page = 1, limit = 50 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const filter = {};
  if (q) filter.name = new RegExp(q, 'i');
  if (active !== undefined) filter.active = active === 'true';

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    CorporatePackage.find(filter).sort('-createdAt').skip(skip).limit(safeLimit),
    CorporatePackage.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.getPackage = asyncHandler(async (req, res) => {
  const pkg = await CorporatePackage.findById(req.params.id);
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  res.json(pkg);
});

exports.createPackage = asyncHandler(async (req, res) => {
  const { name, basePrice } = req.body;
  if (!name || basePrice === undefined) return res.status(400).json({ message: 'Name and base price are required.' });
  const pkg = await CorporatePackage.create(req.body);
  res.status(201).json(pkg);
});

exports.updatePackage = asyncHandler(async (req, res) => {
  const pkg = await CorporatePackage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  res.json(pkg);
});

exports.deletePackage = asyncHandler(async (req, res) => {
  const pkg = await CorporatePackage.findByIdAndDelete(req.params.id);
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  res.json({ message: 'Package deleted' });
});
