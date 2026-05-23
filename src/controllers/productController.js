const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { syncObjects, deleteObject } = require('../services/algoliaSync');
const makeSlug = require('../utils/slug');

exports.listProducts = asyncHandler(async (req, res) => {
  const { type, q, lab, category, brand, featured, fastingRequired, homeCollection, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }, { tags: new RegExp(q, 'i') }];
  if (lab) filter.lab = lab;
  if (category) filter.category = category;
  if (brand) filter.brand = new RegExp(brand, 'i');
  if (featured !== undefined) filter.isFeatured = featured === 'true';
  if (fastingRequired !== undefined) filter.fastingRequired = fastingRequired === 'true';
  if (homeCollection !== undefined) filter.homeCollection = homeCollection === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const items = await Product.find(filter).populate('lab category').sort(sort).skip(skip).limit(Number(limit));
  const total = await Product.countDocuments(filter);
  res.json({ items, page: Number(page), limit: Number(limit), total });
});

exports.getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate('lab category');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

exports.createProduct = asyncHandler(async (req, res) => {
  if (!req.body.slug && req.body.name) req.body.slug = makeSlug(req.body.name);
  const product = await Product.create(req.body);
  await syncObjects('products', [{
    objectID: String(product._id),
    id: String(product._id),
    type: product.type,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    price: product.price,
    salePrice: product.salePrice || null,
    discountPercent: product.discountPercent || null,
    reportTime: product.reportTime || '',
    homeCollection: !!product.homeCollection,
    fastingRequired: !!product.fastingRequired,
    brand: product.brand || '',
    tags: product.tags || [],
    category: product.category ? String(product.category) : null,
    lab: product.lab ? String(product.lab) : null,
    isFeatured: !!product.isFeatured,
    isActive: !!product.isActive
  }]);
  res.status(201).json(product);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.name && !payload.slug) payload.slug = makeSlug(payload.name);
  const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await syncObjects('products', [{
    objectID: String(product._id),
    id: String(product._id),
    type: product.type,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    price: product.price,
    salePrice: product.salePrice || null,
    discountPercent: product.discountPercent || null,
    reportTime: product.reportTime || '',
    homeCollection: !!product.homeCollection,
    fastingRequired: !!product.fastingRequired,
    brand: product.brand || '',
    tags: product.tags || [],
    category: product.category ? String(product.category) : null,
    lab: product.lab ? String(product.lab) : null,
    isFeatured: !!product.isFeatured,
    isActive: !!product.isActive
  }]);
  res.json(product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  await deleteObject('products', req.params.id);
  res.json({ message: 'Deleted' });
});
