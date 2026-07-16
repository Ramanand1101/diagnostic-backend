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

// DELETE /api/v1/products/bulk-delete
exports.bulkDeleteProducts = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
  const result = await Product.deleteMany({ _id: { $in: ids } });
  res.json({ deleted: result.deletedCount });
});

// PATCH /api/v1/products/bulk-price — set salePrice on multiple products
exports.bulkUpdatePrice = asyncHandler(async (req, res) => {
  const { ids, salePrice, discountPercent } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
  const update = {};
  if (salePrice !== undefined) update.salePrice = Number(salePrice) || null;
  if (discountPercent !== undefined) update.discountPercent = Number(discountPercent) || null;
  const result = await Product.updateMany({ _id: { $in: ids } }, update);
  res.json({ updated: result.modifiedCount });
});

// GET /api/v1/products/admin — lists ALL products (including inactive) for admin
exports.adminListProducts = asyncHandler(async (req, res) => {
  const { q, lab, category, type, isActive, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = {};
  if (type) filter.type = type;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }];
  if (category) filter.category = category;
  if (lab) filter.lab = lab;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    Product.find(filter).populate('lab', 'name city').populate('category', 'name').populate('subcategory', 'name').sort(sort).skip(skip).limit(safeLimit),
    Product.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

// GET /api/v1/products/demo-csv — public template download
exports.productDemoCsv = (req, res) => {
  const rows = [
    'name,price,salePrice,reportTime,sampleType,homeCollection,fastingRequired,description,category,labEmail,brand',
    '--- OPTION 1: Upload for a single lab (use labEmail column) ---,,,,,,,,,,',
    'CBC Complete Blood Count,299,199,24 hours,Blood,true,true,Measures blood components,Pathology,apollo-lucknow@apollo.com,',
    '--- OPTION 2: Upload for ALL branches of a chain (use brand column) ---,,,,,,,,,,',
    'CBC Complete Blood Count,299,199,24 hours,Blood,true,true,Measures blood components,Pathology,,Apollo Diagnostics',
    'Lipid Profile,599,399,24 hours,Blood,true,true,Cholesterol analysis,Pathology,,Apollo Diagnostics',
    'Full Body Checkup,1999,1499,48 hours,Blood,true,true,Comprehensive health package,Packages,,Apollo Diagnostics',
    'Chest X-Ray,500,350,Same day,N/A,false,false,Digital chest radiograph,Radiology,,Apollo Diagnostics',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
  res.send(rows);
};

// POST /api/v1/products/bulk-csv — admin only
// CSV columns: name, price, salePrice, reportTime, sampleType, homeCollection,
//              fastingRequired, description, category, labEmail, brand
//
// Lab resolution priority:
//   1. brand column  → applies to ALL labs matching that brand (multi-lab insert per row)
//   2. labEmail      → single lab matched by email
//   3. neither       → product created with no lab
exports.bulkUploadProductsCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });

  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows.' });

  const Lab = require('../models/Lab');
  const Category = require('../models/Category');
  const algoliaRows = [];
  let created = 0;
  const errors = [];

  for (const [i, row] of rows.entries()) {
    if (!row.name) { errors.push({ row: i + 2, error: 'name is required' }); continue; }
    if (!row.price) { errors.push({ row: i + 2, error: 'price is required' }); continue; }

    try {
      // Resolve category
      let categoryId = null;
      const catName = row.category || row.categoryname || '';
      if (catName) {
        let cat = await Category.findOne({ name: new RegExp(`^${catName}$`, 'i') });
        if (!cat) cat = await Category.create({ name: catName, slug: makeSlug(catName) });
        categoryId = cat._id;
      }

      // Resolve target labs
      const brandKey = (row.brand || '').trim();
      const emailKey = (row.labemail || row.lab_email || '').trim();

      let targetLabs = [];
      if (brandKey) {
        // All labs with this brand
        targetLabs = await Lab.find({ brand: new RegExp(`^${brandKey}$`, 'i') }).select('_id name').lean();
        if (!targetLabs.length) {
          errors.push({ row: i + 2, error: `No labs found with brand "${brandKey}"` });
          continue;
        }
      } else if (emailKey) {
        const lab = await Lab.findOne({ email: new RegExp(`^${emailKey}$`, 'i') }).select('_id name').lean();
        if (lab) targetLabs = [lab];
      }

      // Build base product data
      const baseData = {
        name: row.name,
        price: Number(row.price) || 0,
        salePrice: row.saleprice ? Number(row.saleprice) : undefined,
        reportTime: row.reporttime || '',
        sampleType: row.sampletype || '',
        homeCollection: row.homecollection === 'true' || row.homecollection === '1',
        fastingRequired: row.fastingrequired === 'true' || row.fastingrequired === '1',
        description: row.description || '',
        category: categoryId,
        isActive: true,
      };

      if (targetLabs.length === 0) {
        // No lab — create one product without lab
        const product = await Product.create({ ...baseData, slug: makeSlug(`${row.name}-${Date.now()}`) });
        algoliaRows.push(product);
        created++;
      } else {
        // Create one product per target lab
        for (const lab of targetLabs) {
          const product = await Product.create({
            ...baseData,
            lab: lab._id,
            slug: makeSlug(`${row.name}-${lab.name}-${Date.now()}`),
          });
          algoliaRows.push(product);
          created++;
        }
      }
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  // Sync to Algolia
  if (algoliaRows.length) {
    await syncObjects('products', algoliaRows.map((p) => ({
      objectID: String(p._id), name: p.name, slug: p.slug,
      price: p.price, salePrice: p.salePrice || null,
      lab: p.lab ? String(p.lab) : null, isActive: true,
    })));
  }

  res.json({ created, errors, total: rows.length });
});
