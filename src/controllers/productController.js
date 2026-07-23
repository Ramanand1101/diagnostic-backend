const asyncHandler = require('express-async-handler');
const Product    = require('../models/Product');
const TestMaster = require('../models/TestMaster');
const { syncObjects, deleteObject } = require('../services/algoliaSync');
const makeSlug   = require('../utils/slug');
const { parseCSV } = require('../utils/csvParser');

// ─── helpers ─────────────────────────────────────────────────────────────────

// Resolve testMaster ObjectId and return { testMaster, name } for Product.
// Throws if the ID is given but invalid.
async function resolveTestMaster(tmId) {
  if (!tmId) return {};
  const tm = await TestMaster.findById(tmId).lean();
  if (!tm) throw new Error('TestMaster entry not found');
  return { testMaster: tm._id, name: tm.name };
}

// Build an Algolia record from a fully-populated product doc.
function toAlgoliaRecord(p) {
  const tm  = p.testMaster || {};
  const lab = p.lab        || {};
  return {
    objectID:        String(p._id),
    id:              String(p._id),
    type:            p.type || 'test',
    name:            p.name,
    slug:            p.slug,
    // metadata lives in TestMaster — read via populate
    description:     tm.description    || '',
    sampleType:      tm.sampleType     || '',
    reportTime:      tm.reportTime     || '',
    fastingRequired: !!tm.fastingRequired,
    homeCollection:  !!tm.homeCollection,
    category:        tm.category  ? String(tm.category._id  || tm.category)  : null,
    categoryName:    tm.category?.name || '',
    subcategory:     tm.subcategory ? String(tm.subcategory._id || tm.subcategory) : null,
    // lab + pricing are per-product
    price:           p.price        || 0,
    salePrice:       p.salePrice    || null,
    discountPercent: p.discountPercent || null,
    brand:           p.brand        || '',
    tags:            p.tags         || [],
    lab: lab._id ? {
      _id:     String(lab._id),
      name:    lab.name    || '',
      slug:    lab.slug    || '',
      city:    lab.city    || '',
      state:   lab.state   || '',
      address: lab.address || '',
      area:    lab.area    || '',
      pincode: lab.pincode || '',
    } : null,
    isFeatured: !!p.isFeatured,
    isActive:   !!p.isActive,
  };
}

const TM_POPULATE = { path: 'testMaster', select: 'name category subcategory description sampleType reportTime fastingRequired homeCollection' };
const LAB_SELECT  = 'name slug city state address area pincode email homeCollection ratingAvg';

// ─── public routes ────────────────────────────────────────────────────────────

exports.listProducts = asyncHandler(async (req, res) => {
  const { type, q, lab, city, page = 1, limit = 20, sort = '-createdAt',
          brand, featured } = req.query;

  const filter = { isActive: true };
  if (type)     filter.type      = type;
  if (q)        filter.name      = new RegExp(q, 'i');
  if (brand)    filter.brand     = new RegExp(brand, 'i');
  if (featured) filter.isFeatured = featured === 'true';

  if (city) {
    const Lab = require('../models/Lab');
    const cityLabs = await Lab.find({ city: new RegExp(city, 'i'), approved: true }).select('_id').lean();
    filter.lab = { $in: cityLabs.map((l) => l._id) };
  } else if (lab) {
    filter.lab = lab;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate(TM_POPULATE)
      .populate('lab', LAB_SELECT)
      .sort(sort).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: Number(limit), total });
});

exports.getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate(TM_POPULATE)
    .populate('lab', LAB_SELECT);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

// ─── admin routes ─────────────────────────────────────────────────────────────

exports.adminListProducts = asyncHandler(async (req, res) => {
  const { q, lab, category, type, isActive, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = {};
  if (type)                    filter.type     = type;
  if (q)                       filter.name     = new RegExp(q, 'i');
  if (lab)                     filter.lab      = lab;
  if (isActive !== undefined)  filter.isActive = isActive === 'true';

  // category filter: find TestMaster IDs with that category, then filter products
  if (category) {
    const tmIds = await TestMaster.find({ category }).select('_id').lean();
    filter.testMaster = { $in: tmIds.map((t) => t._id) };
  }

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate(TM_POPULATE)
      .populate('lab', 'name city email')
      .sort(sort).skip(skip).limit(safeLimit),
    Product.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.createProduct = asyncHandler(async (req, res) => {
  const tmData = await resolveTestMaster(req.body.testMaster);
  const body = { ...req.body, ...tmData };

  if (!body.slug && body.name) {
    const labSuffix = body.lab ? String(body.lab).slice(-6) : Date.now().toString().slice(-6);
    body.slug = makeSlug(`${body.name}-${labSuffix}`);
  }
  if (['superadmin', 'subadmin'].includes(req.user?.role)) body.addedByAdmin = true;

  const product = await Product.create(body);
  const populated = await product.populate([TM_POPULATE, { path: 'lab', select: LAB_SELECT }]);
  try { await syncObjects('products', [toAlgoliaRecord(populated)]); } catch {}
  res.status(201).json(populated);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  // Lab role: guard to own lab only
  if (req.user.role === 'lab') {
    const Lab = require('../models/Lab');
    const myLab = await Lab.findOne({ owners: req.user._id });
    if (!myLab) return res.status(403).json({ message: 'No lab found for this user' });
    const existing = await Product.findOne({ _id: req.params.id, lab: myLab._id });
    if (!existing) return res.status(403).json({ message: 'Not your product' });
  }

  const tmData  = await resolveTestMaster(req.body.testMaster);
  const payload = { ...req.body, ...tmData };
  if (payload.name && !payload.slug) payload.slug = makeSlug(payload.name);

  const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    .populate(TM_POPULATE)
    .populate('lab', LAB_SELECT);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  try { await syncObjects('products', [toAlgoliaRecord(product)]); } catch {}
  res.json(product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  try { await deleteObject('products', req.params.id); } catch {}
  res.json({ message: 'Deleted' });
});

exports.setPrice = asyncHandler(async (req, res) => {
  const Lab = require('../models/Lab');
  const lab = await Lab.findOne({ owners: req.user._id });
  if (!lab) return res.status(403).json({ message: 'Lab profile not found' });

  const product = await Product.findOne({ _id: req.params.id, lab: lab._id });
  if (!product) return res.status(404).json({ message: 'Product not found in your lab' });

  const { price, salePrice, discountPercent } = req.body;
  if (price           !== undefined) product.price           = Number(price);
  if (salePrice       !== undefined) product.salePrice       = salePrice       ? Number(salePrice)       : undefined;
  if (discountPercent !== undefined) product.discountPercent = discountPercent  ? Number(discountPercent) : undefined;
  await product.save();

  const populated = await product.populate([TM_POPULATE, { path: 'lab', select: LAB_SELECT }]);
  try { syncObjects('products', [toAlgoliaRecord(populated)]).catch(() => {}); } catch {}
  res.json(populated);
});

// ─── bulk operations ──────────────────────────────────────────────────────────

exports.bulkDeleteProducts = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
  await Product.deleteMany({ _id: { $in: ids } });
  res.json({ deleted: ids.length });
});

exports.bulkUpdatePrice = asyncHandler(async (req, res) => {
  const { ids, salePrice, discountPercent } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
  const update = {};
  if (salePrice       !== undefined) update.salePrice       = Number(salePrice)       || null;
  if (discountPercent !== undefined) update.discountPercent = Number(discountPercent) || null;
  const result = await Product.updateMany({ _id: { $in: ids } }, update);
  res.json({ updated: result.modifiedCount });
});

// ─── CSV / XLSX upload & demo ─────────────────────────────────────────────────

exports.productDemoCsv = asyncHandler(async (req, res) => {
  const XLSX = require('xlsx');
  const { labEmails = '', brand = '' } = req.query;
  const emailList = labEmails ? labEmails.split(',').map((e) => e.trim()).filter(Boolean) : [''];

  const tests = await TestMaster.find({}).populate('category', 'name').sort('name').limit(200).lean();
  const source = tests.length ? tests : [
    { name: 'CBC Complete Blood Count', reportTime: '24 hours', sampleType: 'Blood', homeCollection: false, fastingRequired: true, description: 'Measures blood components', category: { name: 'Pathology' } },
    { name: 'Lipid Profile', reportTime: 'Same day', sampleType: 'Blood', homeCollection: false, fastingRequired: true, description: 'Cholesterol analysis', category: { name: 'Pathology' } },
  ];

  const headers = ['name', 'price', 'salePrice', 'labEmail', 'brand'];
  const aoa = [headers];
  for (const labEmail of emailList) {
    for (const t of source) {
      aoa.push([t.name, 0, 0, labEmail, brand]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 42 }, { wch: 10 }, { wch: 10 }, { wch: 32 }, { wch: 20 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'products');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="products-template.xlsx"');
  res.send(buf);
});

exports.bulkUploadProductsCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File is required (CSV or XLSX).' });

  let rows;
  const isXlsx = req.file.originalname?.toLowerCase().endsWith('.xlsx') ||
    req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (isXlsx) {
    const XLSX = require('xlsx');
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).map((r) => {
      const lower = {};
      for (const [k, v] of Object.entries(r)) lower[k.toLowerCase().replace(/[\s_-]+/g, '')] = String(v ?? '').trim();
      return lower;
    });
  } else {
    ({ rows } = parseCSV(req.file.buffer));
  }
  if (!rows.length) return res.status(400).json({ message: 'File has no data rows.' });

  const Lab   = require('../models/Lab');
  const Brand = require('../models/Brand');
  const overrideLabEmails = (req.query.labEmails || '').split(',').map((e) => e.trim()).filter(Boolean);
  let overrideLabs = [];
  if (overrideLabEmails.length) {
    overrideLabs = (await Promise.all(
      overrideLabEmails.map((email) => Lab.findOne({ email: new RegExp(`^${email}$`, 'i') }).select('_id name').lean())
    )).filter(Boolean);
  }

  let created = 0;
  const errors = [];
  const algoliaRows = [];

  for (const [i, row] of rows.entries()) {
    if (!row.name)  { errors.push({ row: i + 2, error: 'name is required' }); continue; }
    if (!row.price) { errors.push({ row: i + 2, error: 'price is required' }); continue; }

    const esc = row.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tm  = await TestMaster.findOne({ name: new RegExp(`^${esc}$`, 'i') }).lean();
    if (!tm) {
      errors.push({ row: i + 2, error: `"${row.name}" not found in Test Master. Add it first.` });
      continue;
    }

    try {
      let targetLabs = [];
      if (overrideLabEmails.length) {
        targetLabs = overrideLabs;
      } else if ((row.brand || '').trim()) {
        const brandDoc = await Brand.findOne({ name: new RegExp(`^${row.brand.trim()}$`, 'i') });
        if (!brandDoc) { errors.push({ row: i + 2, error: `Brand "${row.brand}" not found.` }); continue; }
        targetLabs = await Lab.find({ brand: brandDoc._id }).select('_id name').lean();
        if (!targetLabs.length) { errors.push({ row: i + 2, error: `Brand "${row.brand}" has no labs.` }); continue; }
      } else if ((row.labemail || row.lab_email || '').trim()) {
        const emailKey = (row.labemail || row.lab_email || '').trim();
        const lab = await Lab.findOne({ email: new RegExp(`^${emailKey}$`, 'i') }).select('_id name').lean();
        if (lab) targetLabs = [lab];
      }

      // Product stores ONLY: testMaster ref + name (cache) + lab + pricing
      const base = {
        testMaster: tm._id,
        name:       tm.name,
        price:      Number(row.price)    || 0,
        salePrice:  row.saleprice ? Number(row.saleprice) : undefined,
        isActive:   true,
      };

      const labList = targetLabs.length ? targetLabs : [null];
      for (const lab of labList) {
        const product = await Product.create({
          ...base,
          lab:  lab?._id || undefined,
          slug: makeSlug(`${tm.name}-${lab?.name || Date.now()}-${Date.now()}`),
        });
        const populated = await product.populate([TM_POPULATE, { path: 'lab', select: LAB_SELECT }]);
        algoliaRows.push(toAlgoliaRecord(populated));
        created++;
      }
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  try { if (algoliaRows.length) await syncObjects('products', algoliaRows); } catch {}
  res.json({ created, errors, total: rows.length });
});

exports.labDemoCsv = (req, res) => {
  const csv = [
    'name,price,salePrice,tags',
    'Complete Blood Count (CBC),500,399,cbc;blood',
    'Urine Routine Examination,200,149,urine;routine',
    'Thyroid Profile (T3 T4 TSH),800,599,thyroid;tsh',
    'Lipid Profile,600,449,cholesterol;lipid',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="lab-tests-template.csv"');
  res.send(csv);
};

exports.labBulkCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });
  const Lab = require('../models/Lab');
  const lab = await Lab.findOne({ owners: req.user._id });
  if (!lab) return res.status(403).json({ message: 'No lab found for your account' });

  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows.' });

  const created = [], errors = [], algoliaRows = [];

  for (const [i, row] of rows.entries()) {
    if (!row.name)  { errors.push({ row: i + 2, error: 'name is required' }); continue; }
    if (!row.price) { errors.push({ row: i + 2, error: 'price is required' }); continue; }

    const esc = row.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tm  = await TestMaster.findOne({ name: new RegExp(`^${esc}$`, 'i') }).lean();
    if (!tm) { errors.push({ row: i + 2, error: `"${row.name}" not found in Test Master.` }); continue; }

    try {
      const tags    = (row.tags || '').split(/[;,]/).map((t) => t.trim()).filter(Boolean);
      const product = await Product.create({
        testMaster: tm._id,
        name:       tm.name,
        slug:       makeSlug(`${tm.name}-${String(lab._id).slice(-6)}-${Date.now()}`),
        lab:        lab._id,
        price:      Number(row.price)    || 0,
        salePrice:  row.saleprice ? Number(row.saleprice) : undefined,
        tags,
        isActive:   true,
      });
      const populated = await product.populate([TM_POPULATE, { path: 'lab', select: LAB_SELECT }]);
      algoliaRows.push(toAlgoliaRecord(populated));
      created.push(product._id);
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  try { if (algoliaRows.length) await syncObjects('products', algoliaRows); } catch {}
  res.json({ message: `${created.length} test(s) uploaded`, created: created.length, errors, total: rows.length });
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const { q, lab, category } = req.query;
  const filter = {};
  if (q)   filter.name = new RegExp(q, 'i');
  if (lab) filter.lab  = lab;
  if (category) {
    const tmIds = await TestMaster.find({ category }).select('_id').lean();
    filter.testMaster = { $in: tmIds.map((t) => t._id) };
  }

  const items = await Product.find(filter)
    .populate(TM_POPULATE)
    .populate('lab', 'name city email')
    .sort('-createdAt').limit(10000).lean();

  const esc = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  const headers = ['name','price','salePrice','reportTime','sampleType','homeCollection','fastingRequired','description','category','lab','labCity','labEmail','isActive','isFeatured'];
  const rows = items.map((p) => [
    p.name,
    p.price           || '',
    p.salePrice       || '',
    p.testMaster?.reportTime     || '',
    p.testMaster?.sampleType     || '',
    p.testMaster?.homeCollection  ? 'true' : 'false',
    p.testMaster?.fastingRequired ? 'true' : 'false',
    (p.testMaster?.description || '').replace(/\n/g, ' '),
    p.testMaster?.category?.name  || '',
    p.lab?.name  || '',
    p.lab?.city  || '',
    p.lab?.email || '',
    p.isActive   ? 'true' : 'false',
    p.isFeatured ? 'true' : 'false',
  ].map(esc).join(','));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="products-export-${Date.now()}.csv"`);
  res.send([headers.join(','), ...rows].join('\n'));
});

// ─── bulk-tests (Lucknow catalogue seed) ─────────────────────────────────────

exports.bulkUploadTests = asyncHandler(async (req, res) => {
  const { labIds, multipliers = {}, skipExisting = true } = req.body;
  if (!Array.isArray(labIds) || !labIds.length) return res.status(400).json({ message: 'labIds array is required' });

  const Lab = require('../models/Lab');
  const { RAW_TESTS, roundPrice, getCategory, getSampleType, isFasting, isHomeCollection, getDesc, getReportTime } = require('../data/lucknowTestsData');
  const Category = require('../models/Category');
  const DISCOUNT = 0.85;

  const labs = await Lab.find({ _id: { $in: labIds } }).lean();
  if (!labs.length) return res.status(404).json({ message: 'No matching labs found' });

  const catNames = [...new Set(RAW_TESTS.map(([n]) => getCategory(n)))];
  const catMap   = {};
  for (const catName of catNames) {
    let cat = await Category.findOne({ name: catName });
    if (!cat) cat = await Category.create({ name: catName, slug: makeSlug(catName), type: 'test' });
    catMap[catName] = cat._id;
  }

  let created = 0, skipped = 0;
  const algoliaPayload = [];

  for (const [testName, basePrice] of RAW_TESTS) {
    const cat     = getCategory(testName);
    const catId   = catMap[cat];
    const tags    = [testName.split(' ')[0], cat.split(' ')[0], getSampleType(testName)].filter(Boolean);

    // Upsert TestMaster entry
    const esc = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let tm = await TestMaster.findOne({ name: new RegExp(`^${esc}$`, 'i') });
    if (!tm) {
      tm = await TestMaster.create({
        name:            testName,
        category:        catId,
        sampleType:      getSampleType(testName),
        fastingRequired: isFasting(testName),
        homeCollection:  isHomeCollection(testName),
        description:     getDesc(cat),
        reportTime:      getReportTime(basePrice),
      });
    }

    for (const lab of labs) {
      const multiplier = multipliers[String(lab._id)] ?? 1.0;
      const price = roundPrice(basePrice * multiplier);
      const sale  = roundPrice(price * DISCOUNT);
      const slug  = makeSlug(`${testName} ${lab.name}`);

      if (skipExisting && await Product.findOne({ slug })) { skipped++; continue; }

      const product = await Product.create({
        testMaster: tm._id,
        name:       tm.name,
        slug,
        type:       'test',
        lab:        lab._id,
        price,
        salePrice:  sale < price ? sale : undefined,
        tags,
        isActive:   true,
      });
      created++;

      const populated = await product.populate([TM_POPULATE, { path: 'lab', select: LAB_SELECT }]);
      algoliaPayload.push(toAlgoliaRecord(populated));
    }
  }

  try { if (algoliaPayload.length) await syncObjects('products', algoliaPayload); } catch {}
  res.json({ created, skipped, total: created + skipped, labs: labs.map((l) => ({ _id: l._id, name: l.name })) });
});

// ─── migration — link existing products to TestMaster by name ─────────────────

exports.migrateTestMaster = asyncHandler(async (req, res) => {
  const escape  = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const unlinked = await Product.find({ testMaster: null }).lean();
  let linked = 0, notFound = 0;

  for (const p of unlinked) {
    const tm = await TestMaster.findOne({ name: new RegExp(`^${escape(p.name)}$`, 'i') }).lean();
    if (tm) {
      await Product.findByIdAndUpdate(p._id, { $set: { testMaster: tm._id, name: tm.name } });
      linked++;
    } else {
      notFound++;
    }
  }

  res.json({ total: unlinked.length, linked, notFound });
});
