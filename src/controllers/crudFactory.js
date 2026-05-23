const asyncHandler = require('express-async-handler');
const makeSlug = require('../utils/slug');
const paginate = require('../utils/paginate');

function createCrudController(Model, options = {}) {
  const searchable = options.searchable || ['name', 'title', 'slug', 'city'];
  const defaultSort = options.defaultSort || '-createdAt';

  const list = asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 20, sort, type, city, active, approved } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (city) filter.city = new RegExp(city, 'i');
    if (active !== undefined) filter.isActive = active === 'true';
    if (approved !== undefined) filter.approved = approved === 'true';
    if (q) filter.$or = searchable.map((key) => ({ [key]: new RegExp(q, 'i') }));

    let query = Model.find(filter);
    query = query.sort(sort || defaultSort);
    query = paginate(query, { page, limit });
    const items = await query.exec();

    const total = await Model.countDocuments(filter);
    res.json({ items, page: Number(page), limit: Number(limit), total });
  });

  const getBySlug = asyncHandler(async (req, res) => {
    const item = await Model.findOne({ slug: req.params.slug });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  });

  const getById = asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  });

  const create = asyncHandler(async (req, res) => {
    if (req.body.name && !req.body.slug) req.body.slug = makeSlug(req.body.name);
    if (req.body.title && !req.body.slug) req.body.slug = makeSlug(req.body.title);
    const item = await Model.create(req.body);
    res.status(201).json(item);
  });

  const update = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    if (payload.name && !payload.slug) payload.slug = makeSlug(payload.name);
    if (payload.title && !payload.slug) payload.slug = makeSlug(payload.title);
    const item = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  });

  const remove = asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  });

  return { list, getBySlug, getById, create, update, remove };
}

module.exports = createCrudController;
