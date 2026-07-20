const TestMaster = require('../models/TestMaster');
const Category = require('../models/Category');
const { parseCSV } = require('../utils/csvParser');
const makeSlug = require('../utils/slug');

exports.list = async (req, res) => {
  try {
    const { q, category, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const skip = (Number(page) - 1) * safeLimit;

    const filter = {};
    if (category) filter.category = category;
    if (q) filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { sampleType: { $regex: q, $options: 'i' } },
    ];

    const [items, total] = await Promise.all([
      TestMaster.find(filter).sort({ name: 1 }).skip(skip).limit(safeLimit)
        .populate('category', 'name')
        .populate('subcategory', 'name'),
      TestMaster.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), limit: safeLimit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/test-master/search?q=cbc — for autocomplete in product form
exports.search = async (req, res) => {
  try {
    const { q = '' } = req.query;
    const items = await TestMaster.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
      ],
    })
      .limit(20)
      .select('name category subcategory sampleType reportTime fastingRequired homeCollection description')
      .populate('category', 'name _id')
      .populate('subcategory', 'name _id');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const test = await TestMaster.create(req.body);
    res.status(201).json(test);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Test name already exists' });
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const test = await TestMaster.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('category', 'name')
      .populate('subcategory', 'name');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Cascade: sync description + metadata to all products with the same name
    const Product = require('../models/Product');
    const { syncObjects } = require('../services/algoliaSync');

    const nameRegex = new RegExp(`^${test.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const productUpdate = {};
    if (req.body.description !== undefined) productUpdate.description = test.description;
    if (req.body.sampleType  !== undefined) productUpdate.sampleType  = test.sampleType;
    if (req.body.reportTime  !== undefined) productUpdate.reportTime  = test.reportTime;
    if (req.body.fastingRequired !== undefined) productUpdate.fastingRequired = test.fastingRequired;
    if (req.body.homeCollection  !== undefined) productUpdate.homeCollection  = test.homeCollection;

    if (Object.keys(productUpdate).length) {
      await Product.updateMany({ name: nameRegex }, { $set: productUpdate });

      // Re-index updated products in Algolia
      try {
        const updated = await Product.find({ name: nameRegex })
          .populate({ path: 'lab', select: 'name slug city state address area pincode homeCollection ratingAvg verificationStatus' })
          .lean();
        if (updated.length) {
          const records = updated.map((p) => ({
            objectID: String(p._id),
            id: String(p._id),
            type: p.type,
            name: p.name,
            slug: p.slug,
            description: p.description || '',
            price: p.price,
            salePrice: p.salePrice || null,
            reportTime: p.reportTime || '',
            sampleType: p.sampleType || '',
            homeCollection: !!p.homeCollection,
            fastingRequired: !!p.fastingRequired,
            tags: p.tags || [],
            category: p.category ? String(p.category) : null,
            lab: p.lab ? { _id: String(p.lab._id), name: p.lab.name, slug: p.lab.slug, city: p.lab.city, state: p.lab.state || '', address: p.lab.address || '', area: p.lab.area || '', pincode: p.lab.pincode || '' } : null,
            isFeatured: !!p.isFeatured,
            isActive: !!p.isActive,
          }));
          await syncObjects('products', records);
        }
      } catch { /* algolia optional */ }
    }

    res.json(test);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const test = await TestMaster.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Cascade: delete all products with the same name
    const Product = require('../models/Product');
    const { deleteObjects } = require('../services/algoliaSync');

    const products = await Product.find({ name: new RegExp(`^${test.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id').lean();
    if (products.length) {
      const ids = products.map((p) => String(p._id));
      await Product.deleteMany({ _id: { $in: ids } });
      try { await deleteObjects('products', ids); } catch { /* algolia optional */ }
    }

    res.json({ message: 'Deleted', productsRemoved: products.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/test-master/demo-csv
exports.demoCsv = (req, res) => {
  const csv = [
    'name,category,subcategory,sampleType,reportTime,fastingRequired,homeCollection,description',
    'Complete Blood Count (CBC),Pathology,Blood Tests,Blood,24 hours,false,true,Basic blood test',
    'Lipid Profile,Pathology,Blood Tests,Blood,24 hours,true,true,Checks cholesterol',
    'Urine Routine,Pathology,Urine Tests,Urine,4 hours,false,false,Basic urine examination',
    'Chest X-Ray,Radiology,,X-ray,Same day,false,false,Standard chest radiograph',
    'Thyroid Profile (T3 T4 TSH),Pathology,,Blood,48 hours,false,true,Thyroid function test',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="test-master-template.csv"');
  res.send(csv);
};

// GET /api/v1/test-master/export-csv
exports.exportCsv = async (req, res) => {
  try {
    const tests = await require('../models/TestMaster').find({})
      .sort({ name: 1 })
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .lean();

    const header = 'name,category,subcategory,sampleType,reportTime,fastingRequired,homeCollection,isActive,description';
    const rows = tests.map((t) => [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${(t.category?.name || '').replace(/"/g, '""')}"`,
      `"${(t.subcategory?.name || '').replace(/"/g, '""')}"`,
      `"${(t.sampleType || '').replace(/"/g, '""')}"`,
      `"${(t.reportTime || '').replace(/"/g, '""')}"`,
      t.fastingRequired ? 'true' : 'false',
      t.homeCollection ? 'true' : 'false',
      t.isActive !== false ? 'true' : 'false',
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="test-master-export.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/v1/test-master/bulk-csv
exports.bulkCsv = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file required. Make sure you are uploading a .csv file.' });
    const { rows } = parseCSV(req.file.buffer);

    let created = 0, updated = 0;
    const errors = [];
    const catCache = {};
    const subCache = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name?.trim()) { errors.push({ row: i + 2, error: 'Name is required' }); continue; }

      try {
        const data = { name: row.name.trim() };
        if (row.sampleType) data.sampleType = row.sampleType.trim();
        if (row.reportTime) data.reportTime = row.reportTime.trim();
        if (row.description) data.description = row.description.trim();
        if (row.fastingRequired) data.fastingRequired = row.fastingRequired.toLowerCase() === 'true';
        if (row.homeCollection) data.homeCollection = row.homeCollection.toLowerCase() === 'true';

        // Resolve category
        if (row.category?.trim()) {
          const catName = row.category.trim();
          if (!catCache[catName]) {
            const cat = await Category.findOne({ name: { $regex: `^${catName}$`, $options: 'i' }, parent: null });
            catCache[catName] = cat?._id || null;
          }
          data.category = catCache[catName];

          // Resolve subcategory
          if (row.subcategory?.trim() && data.category) {
            const subKey = `${catName}__${row.subcategory.trim()}`;
            if (!subCache[subKey]) {
              const sub = await Category.findOne({ name: { $regex: `^${row.subcategory.trim()}$`, $options: 'i' }, parent: data.category });
              subCache[subKey] = sub?._id || null;
            }
            data.subcategory = subCache[subKey];
          }
        }

        const escapedName = data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = await TestMaster.findOne({ name: { $regex: `^${escapedName}$`, $options: 'i' } });
        if (existing) {
          await TestMaster.findByIdAndUpdate(existing._id, data);
          updated++;
        } else {
          await TestMaster.create(data);
          created++;
        }
      } catch (err) {
        errors.push({ row: i + 2, error: err.message });
      }
    }

    res.json({ created, updated, errors, total: rows.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
