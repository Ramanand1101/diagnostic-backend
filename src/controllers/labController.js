const asyncHandler = require('express-async-handler');
const Lab = require('../models/Lab');
const { syncObjects, deleteObject } = require('../services/algoliaSync');
const makeSlug = require('../utils/slug');
const { parseCSV } = require('../utils/csvParser');

function labRecord(lab) {
  return {
    objectID: String(lab._id),
    id: String(lab._id),
    name: lab.name,
    slug: lab.slug,
    brand: lab.brand ? (lab.brand.name || String(lab.brand)) : '',
    city: lab.city || '',
    state: lab.state || '',
    address: lab.address || '',
    area: lab.area || '',
    pincode: lab.pincode || '',
    phone: lab.phone || '',
    description: lab.description || '',
    ratingAvg: lab.ratingAvg || 0,
    reviewCount: lab.reviewCount || 0,
    homeCollection: !!lab.homeCollection,
    approved: !!lab.approved,
    featured: !!lab.featured,
    verificationStatus: lab.verificationStatus || 'pending',
    sampleCollectionTime: lab.sampleCollectionTime || '',
    reportDeliveryTime: lab.reportDeliveryTime || '',
    accreditation: lab.accreditation || [],
    badges: lab.badges || [],
    _geoloc: (lab.lat && lab.lng) ? { lat: lab.lat, lng: lab.lng } : undefined,
  };
}

exports.getCities = asyncHandler(async (req, res) => {
  const cities = await Lab.distinct('city', { approved: true });
  const sorted = cities.filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.json({ cities: sorted });
});

exports.listLabs = asyncHandler(async (req, res) => {
  const { q, city, approved, featured, homeCollection, brand, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { city: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }, { brand: new RegExp(q, 'i') }];
  if (city) filter.city = new RegExp(city, 'i');
  if (brand) filter.brand = new RegExp(brand, 'i');
  if (approved !== undefined) filter.approved = approved === 'true';
  if (featured !== undefined) filter.featured = featured === 'true';
  if (homeCollection !== undefined) filter.homeCollection = homeCollection === 'true';

  const skip = (Number(page) - 1) * safeLimit;
  const items = await Lab.find(filter).populate('brand', 'name slug').sort(sort).skip(skip).limit(safeLimit);
  const total = await Lab.countDocuments(filter);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.getLabBySlug = asyncHandler(async (req, res) => {
  const lab = await Lab.findOne({ slug: req.params.slug }).populate('owner', 'name email mobile role');
  if (!lab) return res.status(404).json({ message: 'Lab not found' });
  res.json(lab);
});

exports.getMyLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findOne({ owner: req.user._id });
  res.json(lab || null);
});

exports.createLab = asyncHandler(async (req, res) => {
  if (!req.body.slug && req.body.name) req.body.slug = makeSlug(req.body.name);
  if (req.user.role === 'lab') req.body.owner = req.user._id;
  const lab = await Lab.create(req.body);
  console.log('Created Lab:', lab);
  await syncObjects('labs', [labRecord(lab)]);
  res.status(201).json(lab);
});

exports.updateLab = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.name && !payload.slug) payload.slug = makeSlug(payload.name);

  // Lab role users can only update their own lab
  const filter = req.user.role === 'lab'
    ? { _id: req.params.id, owner: req.user._id }
    : { _id: req.params.id };

  const lab = await Lab.findOneAndUpdate(filter, payload, { new: true, runValidators: true });
  if (!lab) return res.status(req.user.role === 'lab' ? 403 : 404).json({ message: req.user.role === 'lab' ? 'Not your lab' : 'Lab not found' });
  await syncObjects('labs', [labRecord(lab)]);
  res.json(lab);
});

exports.approveLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findByIdAndUpdate(req.params.id, {
    approved: true,
    verificationStatus: 'verified'
  }, { new: true });
  if (!lab) return res.status(404).json({ message: 'Lab not found' });
  await syncObjects('labs', [labRecord(lab)]);
  res.json(lab);
});

exports.rejectLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findByIdAndUpdate(req.params.id, {
    approved: false,
    verificationStatus: 'rejected'
  }, { new: true });
  if (!lab) return res.status(404).json({ message: 'Lab not found' });
  await syncObjects('labs', [labRecord(lab)]);
  res.json(lab);
});

exports.nearbyLabs = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const labs = await Lab.find(city ? { city: new RegExp(city, 'i'), approved: true } : { approved: true })
    .sort('-ratingAvg')
    .limit(20);
  res.json(labs);
});

exports.compareLabs = asyncHandler(async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  const labs = await Lab.find({ _id: { $in: ids } });
  res.json(labs);
});

// DELETE /api/v1/labs/bulk-delete — admin: delete multiple labs by id array
exports.bulkDeleteLabs = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
  const result = await Lab.deleteMany({ _id: { $in: ids } });
  res.json({ deleted: result.deletedCount });
});

// GET /api/v1/labs/demo-csv — public, returns a downloadable template
exports.labDemoCsv = (req, res) => {
  const rows = [
    'name,address,area,city,state,pincode,phone,homeCollection,featured,description',
    'Vijay Diagnostics,Shop 12 Hazratganj Market,Hazratganj,Lucknow,Uttar Pradesh,226001,9876543210,true,false,NABL certified diagnostic centre',
    'Apollo Diagnostics,Plot 5 Sector A,Gomti Nagar,Lucknow,Uttar Pradesh,226010,9876543211,true,true,Premium diagnostics with home collection',
    'SRL Diagnostics,Civil Lines Road,Civil Lines,Lucknow,Uttar Pradesh,226001,9876543212,true,false,Trusted pathology services',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="labs-template.csv"');
  res.send(rows);
};

// POST /api/v1/labs/bulk-csv — admin only, file in req.file.buffer
exports.bulkUploadLabsCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });

  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows.' });

  const created = [];
  const errors = [];

  const Brand = require('../models/Brand');
  for (const [i, row] of rows.entries()) {
    if (!row.name) { errors.push({ row: i + 2, error: 'name is required' }); continue; }
    try {
      // Resolve brand by name
      let brandId = null;
      const brandName = (row.brand || '').trim();
      if (brandName) {
        const brand = await Brand.findOne({ name: new RegExp(`^${brandName}$`, 'i') });
        if (brand) brandId = brand._id;
        // else: skip silently — brand not found, lab created without brand
      }

      const slug = makeSlug(`${row.name}-${row.city || ''}-${Date.now()}`);
      const lab = await Lab.create({
        name: row.name,
        brand: brandId,
        address: row.address || '',
        area: row.area || row.locality || '',
        city: row.city || '',
        state: row.state || '',
        pincode: row.pincode || '',
        phone: row.phone || '',
        email: row.email || '',
        homeCollection: row.homecollection === 'true' || row.homecollection === '1',
        featured: row.featured === 'true' || row.featured === '1',
        description: row.description || '',
        slug,
        approved: true,
        verificationStatus: 'verified',
      });
      await syncObjects('labs', [labRecord(lab)]);
      created.push(lab._id);
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  res.json({ created: created.length, errors, total: rows.length });
});
