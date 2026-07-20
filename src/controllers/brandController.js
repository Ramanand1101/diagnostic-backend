const asyncHandler = require('express-async-handler');
const Brand = require('../models/Brand');
const Lab = require('../models/Lab');
const makeSlug = require('../utils/slug');
const { parseCSV } = require('../utils/csvParser');

// GET /brands — list all brands with lab counts
exports.list = asyncHandler(async (req, res) => {
  const { q, limit = 200 } = req.query;
  const filter = {};
  if (q) filter.name = new RegExp(q, 'i');

  const brands = await Brand.find(filter).sort('name').limit(Number(limit)).lean();

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

// GET /brands/by-city?city=Lucknow
exports.byCity = asyncHandler(async (req, res) => {
  const { city } = req.query;
  if (!city) return res.json({ items: [] });

  const labs = await Lab.find({ city: new RegExp(city, 'i') }).select('brand').lean();
  const brandIds = [...new Set(labs.map((l) => l.brand?.toString()).filter(Boolean))];
  const brands = await Brand.find({ _id: { $in: brandIds } }).sort('name').lean();

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
  await Lab.updateMany({ brand: req.params.id }, { $unset: { brand: '' } });
  res.json({ message: 'Deleted' });
});

// POST /brands/upload-logo
exports.uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Image file required' });
  const url =
    req.file.location ||
    `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.file.key}`;
  res.json({ url });
});

// GET /brands/demo-csv
exports.demoCsv = (req, res) => {
  const rows = [
    'name,website,description,isActive',
    'Apollo Diagnostics,https://www.apollodiagnostics.in,Leading diagnostic chain across India,true',
    'Dr Lal PathLabs,https://www.lalpathlabs.com,Trusted pathology services since 1949,true',
    'SRL Diagnostics,https://www.srlworld.com,NABL accredited diagnostic network,true',
    'Thyrocare,https://www.thyrocare.com,Affordable preventive healthcare diagnostics,true',
    'Metropolis Healthcare,https://www.metropolisindia.com,Premium diagnostic services,true',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="brands-template.csv"');
  res.send(rows);
};

// POST /brands/bulk-csv
// Columns: name, website, description, isActive
exports.bulkCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows' });

  let created = 0, updated = 0;
  const errors = [];

  for (const [i, row] of rows.entries()) {
    const name = (row.name || '').trim();
    if (!name) { errors.push({ row: i + 2, error: 'name is required' }); continue; }

    try {
      const payload = {
        name,
        slug: makeSlug(name),
        website: row.website || '',
        description: row.description || '',
        isActive: row.isactive !== 'false',
      };

      const existing = await Brand.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (existing) {
        await Brand.findByIdAndUpdate(existing._id, payload);
        updated++;
      } else {
        await Brand.create(payload);
        created++;
      }
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  res.json({ created, updated, errors, total: rows.length });
});

// GET /brands/export-csv
exports.exportCsv = asyncHandler(async (req, res) => {
  const brands = await Brand.find({}).sort('name').lean();
  const ids = brands.map((b) => b._id);
  const counts = await Lab.aggregate([
    { $match: { brand: { $in: ids } } },
    { $group: { _id: '$brand', total: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => { countMap[String(c._id)] = c.total; });

  const header = 'name,website,phone,email,description,isActive,labCount';
  const rows = brands.map((b) => [
    `"${(b.name || '').replace(/"/g, '""')}"`,
    `"${(b.website || '').replace(/"/g, '""')}"`,
    `"${(b.phone || '').replace(/"/g, '""')}"`,
    `"${(b.email || '').replace(/"/g, '""')}"`,
    `"${(b.description || '').replace(/"/g, '""')}"`,
    b.isActive ? 'true' : 'false',
    countMap[String(b._id)] || 0,
  ].join(','));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="brands-export.csv"');
  res.send([header, ...rows].join('\n'));
});

// DELETE /brands/bulk-delete
exports.bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
  await Brand.deleteMany({ _id: { $in: ids } });
  await Lab.updateMany({ brand: { $in: ids } }, { $unset: { brand: '' } });
  res.json({ deleted: ids.length });
});

// PATCH /brands/:id/home-collection — toggle homeCollection on brand + all its labs
exports.setHomeCollection = asyncHandler(async (req, res) => {
  const { homeCollection } = req.body;
  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    { homeCollection: !!homeCollection },
    { new: true }
  );
  if (!brand) return res.status(404).json({ message: 'Brand not found' });
  await Lab.updateMany({ brand: req.params.id }, { homeCollection: !!homeCollection });
  res.json({ brand, labsUpdated: true });
});
