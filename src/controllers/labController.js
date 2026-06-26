const asyncHandler = require('express-async-handler');
const Lab = require('../models/Lab');
const { syncObjects, deleteObject } = require('../services/algoliaSync');
const makeSlug = require('../utils/slug');

exports.getCities = asyncHandler(async (req, res) => {
  const cities = await Lab.distinct('city', { approved: true });
  const sorted = cities.filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.json({ cities: sorted });
});

exports.listLabs = asyncHandler(async (req, res) => {
  const { q, city, approved, featured, homeCollection, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { city: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }];
  if (city) filter.city = new RegExp(city, 'i');
  if (approved !== undefined) filter.approved = approved === 'true';
  if (featured !== undefined) filter.featured = featured === 'true';
  if (homeCollection !== undefined) filter.homeCollection = homeCollection === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const items = await Lab.find(filter).sort(sort).skip(skip).limit(Number(limit));
  const total = await Lab.countDocuments(filter);
  res.json({ items, page: Number(page), limit: Number(limit), total });
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
  await syncObjects('labs', [{
    objectID: String(lab._id),
    id: String(lab._id),
    name: lab.name,
    slug: lab.slug,
    city: lab.city,
    address: lab.address,
    description: lab.description || '',
    ratingAvg: lab.ratingAvg || 0,
    reviewCount: lab.reviewCount || 0,
    homeCollection: !!lab.homeCollection,
    approved: !!lab.approved,
    featured: !!lab.featured,
    sampleCollectionTime: lab.sampleCollectionTime || '',
    reportDeliveryTime: lab.reportDeliveryTime || '',
    accreditation: lab.accreditation || [],
    badges: lab.badges || [],
    _geoloc: (lab.lat && lab.lng) ? { lat: lab.lat, lng: lab.lng } : undefined
  }]);
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
  await syncObjects('labs', [{
    objectID: String(lab._id),
    id: String(lab._id),
    name: lab.name,
    slug: lab.slug,
    city: lab.city,
    address: lab.address,
    description: lab.description || '',
    ratingAvg: lab.ratingAvg || 0,
    reviewCount: lab.reviewCount || 0,
    homeCollection: !!lab.homeCollection,
    approved: !!lab.approved,
    featured: !!lab.featured,
    sampleCollectionTime: lab.sampleCollectionTime || '',
    reportDeliveryTime: lab.reportDeliveryTime || '',
    accreditation: lab.accreditation || [],
    badges: lab.badges || [],
    _geoloc: (lab.lat && lab.lng) ? { lat: lab.lat, lng: lab.lng } : undefined
  }]);
  res.json(lab);
});

exports.approveLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findByIdAndUpdate(req.params.id, {
    approved: true,
    verificationStatus: 'verified'
  }, { new: true });
  if (!lab) return res.status(404).json({ message: 'Lab not found' });
  res.json(lab);
});

exports.rejectLab = asyncHandler(async (req, res) => {
  const lab = await Lab.findByIdAndUpdate(req.params.id, {
    approved: false,
    verificationStatus: 'rejected'
  }, { new: true });
  if (!lab) return res.status(404).json({ message: 'Lab not found' });
  await syncObjects('labs', [{
    objectID: String(lab._id),
    id: String(lab._id),
    name: lab.name,
    slug: lab.slug,
    city: lab.city,
    address: lab.address,
    description: lab.description || '',
    ratingAvg: lab.ratingAvg || 0,
    reviewCount: lab.reviewCount || 0,
    homeCollection: !!lab.homeCollection,
    approved: !!lab.approved,
    featured: !!lab.featured,
    sampleCollectionTime: lab.sampleCollectionTime || '',
    reportDeliveryTime: lab.reportDeliveryTime || '',
    accreditation: lab.accreditation || [],
    badges: lab.badges || [],
    _geoloc: (lab.lat && lab.lng) ? { lat: lab.lat, lng: lab.lng } : undefined
  }]);
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
