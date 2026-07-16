const asyncHandler = require('express-async-handler');
const Brand = require('../models/Brand');
const Lab = require('../models/Lab');
const makeSlug = require('../utils/slug');

// GET /brands — list all brands with lab counts
exports.list = asyncHandler(async (req, res) => {
  const { q, limit = 200 } = req.query;
  const filter = {};
  if (q) filter.name = new RegExp(q, 'i');

  const brands = await Brand.find(filter).sort('name').limit(Number(limit)).lean();

  // Attach lab counts per brand
  const ids = brands.map((b) => b._id);
  const counts = await Lab.aggregate([
    { $match: { brand: { $in: ids } } },
    { $group: { _id: '$brand', total: { $sum: 1 }, cities: { $addToSet: '$city' } } },
  ]);
  const countMap = {};
  counts.forEach((c) => { countMap[String(c._id)] = { total: c.total, cities: c.cities.filter(Boolean) }; });

  const items = brands.map((b) => ({
    ...b,
    labCount: countMap[String(b._id)]?.total || 0,
    cities: countMap[String(b._id)]?.cities || [],
  }));

  res.json({ items, total: items.length });
});

// GET /brands/by-city?city=Lucknow — brands that have labs in a city
exports.byCity = asyncHandler(async (req, res) => {
  const { city } = req.query;
  if (!city) return res.json({ items: [] });

  const labs = await Lab.find({ city: new RegExp(city, 'i') }).select('brand').lean();
  const brandIds = [...new Set(labs.map((l) => l.brand?.toString()).filter(Boolean))];
  const brands = await Brand.find({ _id: { $in: brandIds } }).sort('name').lean();

  // Add branch count in this city per brand
  const cityCount = await Lab.aggregate([
    { $match: { city: new RegExp(city, 'i'), brand: { $in: brandIds.map((id) => require('mongoose').Types.ObjectId.createFromHexString(id)) } } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
  ]);
  const cityCountMap = {};
  cityCount.forEach((c) => { cityCountMap[String(c._id)] = c.count; });

  const items = brands.map((b) => ({ ...b, cityBranchCount: cityCountMap[String(b._id)] || 0 }));
  res.json({ items });
});

// POST /brands
exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug) body.slug = makeSlug(body.name);
  const brand = await Brand.create(body);
  res.status(201).json(brand);
});

// PUT /brands/:id
exports.update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.name && !payload.slug) payload.slug = makeSlug(payload.name);
  const brand = await Brand.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!brand) return res.status(404).json({ message: 'Brand not found' });
  res.json(brand);
});

// DELETE /brands/:id
exports.remove = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) return res.status(404).json({ message: 'Brand not found' });
  // Unset brand from all labs that used this brand
  await Lab.updateMany({ brand: req.params.id }, { $unset: { brand: '' } });
  res.json({ message: 'Deleted' });
});
