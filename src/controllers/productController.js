const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { syncObjects, deleteObject } = require('../services/algoliaSync');
const makeSlug = require('../utils/slug');
const { parseCSV } = require('../utils/csvParser');

exports.listProducts = asyncHandler(async (req, res) => {
  const { type, q, lab, city, category, brand, featured, fastingRequired, homeCollection, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = { isActive: true };
  if (type) filter.type = type;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }, { tags: new RegExp(q, 'i') }];
  if (category) filter.category = category;
  if (brand) filter.brand = new RegExp(brand, 'i');
  if (featured !== undefined) filter.isFeatured = featured === 'true';
  if (fastingRequired !== undefined) filter.fastingRequired = fastingRequired === 'true';
  if (homeCollection !== undefined) filter.homeCollection = homeCollection === 'true';

  if (city) {
    const Lab = require('../models/Lab');
    const cityLabs = await Lab.find({ city: new RegExp(city, 'i'), approved: true }).select('_id').lean();
    filter.lab = { $in: cityLabs.map((l) => l._id) };
  } else if (lab) {
    filter.lab = lab;
  }

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

  // Lab role: only update products that belong to their lab
  if (req.user.role === 'lab') {
    const Lab = require('../models/Lab');
    const myLab = await Lab.findOne({ owner: req.user._id });
    if (!myLab) return res.status(403).json({ message: 'No lab found for this user' });
    const existing = await Product.findOne({ _id: req.params.id, lab: myLab._id });
    if (!existing) return res.status(403).json({ message: 'Not your product' });
  }

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

// POST /api/v1/products/bulk-tests
// Body: { labIds: [id,...], multipliers?: { labId: number }, skipExisting?: bool }
// Uses the shared Lucknow test catalogue to seed products for the given labs.
exports.bulkUploadTests = asyncHandler(async (req, res) => {
  const { labIds, multipliers = {}, skipExisting = true } = req.body;
  if (!Array.isArray(labIds) || !labIds.length) {
    return res.status(400).json({ message: 'labIds array is required' });
  }

  const Lab      = require('../models/Lab');
  const Category = require('../models/Category');
  const {
    RAW_TESTS, roundPrice, getCategory,
    getSampleType, isFasting, isHomeCollection, getDesc, getReportTime,
  } = require('../data/lucknowTestsData');
  const DISCOUNT = 0.85;

  const labs = await Lab.find({ _id: { $in: labIds } }).lean();
  if (!labs.length) return res.status(404).json({ message: 'No matching labs found' });

  // Upsert categories
  const catNames = [...new Set(RAW_TESTS.map(([name]) => getCategory(name)))];
  const catMap = {};
  for (const catName of catNames) {
    let cat = await Category.findOne({ name: catName });
    if (!cat) {
      cat = await Category.create({ name: catName, slug: makeSlug(catName), type: 'test' });
    }
    catMap[catName] = cat._id;
  }

  let created = 0, skipped = 0;
  const algoliaPayload = [];

  for (const [testName, basePrice] of RAW_TESTS) {
    const cat     = getCategory(testName);
    const catId   = catMap[cat];
    const sample  = getSampleType(testName);
    const fasting = isFasting(testName);
    const home    = isHomeCollection(testName);
    const desc    = getDesc(cat);
    const tags    = [testName.split(' ')[0], cat.split(' ')[0], sample].filter(Boolean);

    for (const lab of labs) {
      const multiplier = multipliers[String(lab._id)] ?? 1.0;
      const price = roundPrice(basePrice * multiplier);
      const sale  = roundPrice(price * DISCOUNT);
      const slug  = makeSlug(`${testName} ${lab.name}`);

      if (skipExisting) {
        const exists = await Product.findOne({ slug });
        if (exists) { skipped++; continue; }
      }

      const product = await Product.create({
        name:            testName,
        slug,
        type:            'test',
        category:        catId,
        lab:             lab._id,
        description:     desc,
        price,
        salePrice:       sale < price ? sale : undefined,
        sampleType:      sample,
        fastingRequired: fasting,
        homeCollection:  home,
        reportTime:      getReportTime(basePrice),
        tags,
        isActive:        true,
        isFeatured:      false,
      });
      created++;

      algoliaPayload.push({
        objectID: String(product._id), name: product.name, slug: product.slug,
        type: product.type, description: product.description || '',
        price: product.price, salePrice: product.salePrice || null,
        reportTime: product.reportTime || '', sampleType: product.sampleType || '',
        homeCollection: !!product.homeCollection, fastingRequired: !!product.fastingRequired,
        tags: product.tags || [], lab: String(product.lab),
        isFeatured: false, isActive: true,
      });
    }
  }

  if (algoliaPayload.length) {
    await syncObjects('products', algoliaPayload);
  }

  res.json({
    created,
    skipped,
    total: created + skipped,
    labs: labs.map((l) => ({ _id: l._id, name: l.name })),
  });
});

// GET /api/v1/products/admin — lists ALL products (including inactive) for admin
exports.adminListProducts = asyncHandler(async (req, res) => {
  const { q, lab, category, type, isActive, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }];
  if (category) filter.category = category;
  if (lab) filter.lab = lab;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter).populate('lab', 'name city').populate('category', 'name').sort(sort).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: Number(limit), total });
});

// GET /api/v1/products/demo-csv — public template download
exports.productDemoCsv = (req, res) => {
  const rows = [
    'name,type,price,salePrice,reportTime,sampleType,homeCollection,fastingRequired,description,labEmail',
    'CBC Complete Blood Count,test,299,199,24 hours,Blood,true,true,Measures different components of blood,lab@example.com',
    'Lipid Profile,test,599,399,24 hours,Blood,true,true,Cholesterol and triglyceride analysis,lab@example.com',
    'Full Body Checkup Basic,package,1999,1499,48 hours,Blood,true,true,Comprehensive preventive health package,lab@example.com',
    'Thyroid Profile T3 T4 TSH,test,449,299,24 hours,Blood,true,false,Complete thyroid function test,lab@example.com',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
  res.send(rows);
};

// POST /api/v1/products/bulk-csv — admin only
exports.bulkUploadProductsCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });

  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows.' });

  const Lab = require('../models/Lab');
  const created = [];
  const errors = [];

  for (const [i, row] of rows.entries()) {
    if (!row.name) { errors.push({ row: i + 2, error: 'name is required' }); continue; }
    if (!row.price) { errors.push({ row: i + 2, error: 'price is required' }); continue; }

    try {
      let labId = null;
      const emailKey = row.labemail || row.lab_email || row.labemail;
      if (emailKey) {
        const lab = await Lab.findOne({ email: new RegExp(`^${emailKey}$`, 'i') }).select('_id');
        if (lab) labId = lab._id;
      }

      const slug = makeSlug(`${row.name}-${Date.now()}`);
      const product = await Product.create({
        name: row.name,
        type: row.type || 'test',
        price: Number(row.price) || 0,
        salePrice: row.saleprice ? Number(row.saleprice) : undefined,
        reportTime: row.reporttime || '',
        sampleType: row.sampletype || '',
        homeCollection: row.homecollection === 'true' || row.homecollection === '1',
        fastingRequired: row.fastingrequired === 'true' || row.fastingrequired === '1',
        description: row.description || '',
        lab: labId,
        slug,
        isActive: true,
      });
      created.push(product._id);
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  res.json({ created: created.length, errors, total: rows.length });
});
