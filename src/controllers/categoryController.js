const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const makeSlug = require('../utils/slug');

// GET /categories  — supports ?parent=null (top-level) or ?parent=<id> (subcategories)
exports.list = asyncHandler(async (req, res) => {
  const { q, parent, limit = 200, page = 1 } = req.query;
  const filter = {};

  if (parent === 'null' || parent === '') {
    filter.parent = null;
  } else if (parent) {
    filter.parent = parent;
  }

  if (q) filter.name = new RegExp(q, 'i');

  const safeLimit = Math.min(Number(limit) || 200, 500);
  const skip = (Number(page) - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Category.find(filter).populate('parent', 'name slug').sort('name').skip(skip).limit(safeLimit),
    Category.countDocuments(filter),
  ]);

  res.json({ items, total, page: Number(page), limit: safeLimit });
});

// GET /categories/tree — full tree: categories with their subcategories nested
exports.tree = asyncHandler(async (req, res) => {
  const [parents, children] = await Promise.all([
    Category.find({ parent: null, isActive: true }).sort('name').lean(),
    Category.find({ parent: { $ne: null }, isActive: true }).sort('name').lean(),
  ]);

  const childMap = {};
  children.forEach((c) => {
    const key = c.parent.toString();
    if (!childMap[key]) childMap[key] = [];
    childMap[key].push(c);
  });

  const tree = parents.map((p) => ({ ...p, subcategories: childMap[p._id.toString()] || [] }));
  res.json(tree);
});

// GET /categories/:slug
exports.getBySlug = asyncHandler(async (req, res) => {
  const item = await Category.findOne({ slug: req.params.slug }).populate('parent', 'name slug');
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

// POST /categories
exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug) body.slug = makeSlug(body.name);
  if (!body.parent) body.parent = null;
  const item = await Category.create(body);
  res.status(201).json(item);
});

// PUT /categories/:id
exports.update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.name && !payload.slug) payload.slug = makeSlug(payload.name);
  if (!payload.parent) payload.parent = null;
  const item = await Category.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

// DELETE /categories/:id  — also deletes all subcategories
exports.remove = asyncHandler(async (req, res) => {
  const item = await Category.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  // cascade delete subcategories
  await Category.deleteMany({ parent: req.params.id });
  res.json({ message: 'Deleted' });
});
