const asyncHandler = require('express-async-handler');
const Page = require('../models/Page');
const makeSlug = require('../utils/slug');
const { syncObjects, deleteObject } = require('../services/algoliaSync');

exports.list = asyncHandler(async (req, res) => {
  const items = await Page.find().sort('-createdAt');
  res.json({ items });
});

exports.getBySlug = asyncHandler(async (req, res) => {
  const item = await Page.findOne({ slug: req.params.slug });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.body.slug && req.body.title) req.body.slug = makeSlug(req.body.title);
  const item = await Page.create(req.body);
  await syncObjects('pages', [{
    objectID: String(item._id),
    id: String(item._id),
    title: item.title,
    slug: item.slug,
    content: item.content || '',
    seoTitle: item.seoTitle || '',
    seoDescription: item.seoDescription || '',
    isPublished: !!item.isPublished
  }]);
  res.status(201).json(item);
});

exports.update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.title && !payload.slug) payload.slug = makeSlug(payload.title);
  const item = await Page.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: 'Not found' });
  await syncObjects('pages', [{
    objectID: String(item._id),
    id: String(item._id),
    title: item.title,
    slug: item.slug,
    content: item.content || '',
    seoTitle: item.seoTitle || '',
    seoDescription: item.seoDescription || '',
    isPublished: !!item.isPublished
  }]);
  res.json(item);
});

exports.remove = asyncHandler(async (req, res) => {
  await Page.findByIdAndDelete(req.params.id);
  await deleteObject('pages', req.params.id);
  res.json({ message: 'Deleted' });
});
