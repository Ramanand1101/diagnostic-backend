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
    // Capture old name BEFORE updating so we can find products by old name
    const existing = await TestMaster.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ message: 'Test not found' });
    const oldName = existing.name;

    const test = await TestMaster.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('category', 'name')
      .populate('subcategory', 'name');

    const Product = require('../models/Product');
    const { syncObjects } = require('../services/algoliaSync');
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // All metadata that syncs to products
    const syncPayload = {
      name:            test.name,
      description:     test.description,
      sampleType:      test.sampleType,
      reportTime:      test.reportTime,
      fastingRequired: test.fastingRequired,
      homeCollection:  test.homeCollection,
      category:        test.category   || null,
      subcategory:     test.subcategory || null,
    };

    const nameChanged = req.body.name && req.body.name.trim() !== oldName.trim();

    // --- Linked products (have testMaster ObjectId) — simple, reliable ---
    const linkedProducts = await Product.find({ testMaster: test._id }).populate('lab', 'name').lean();
    for (const p of linkedProducts) {
      const update = { ...syncPayload };
      if (nameChanged) {
        const labSuffix = p.lab?.name ? makeSlug(p.lab.name) : '';
        update.slug = makeSlug(`${test.name}${labSuffix ? '-' + labSuffix : ''}-${String(p._id).slice(-5)}`);
      }
      await Product.findByIdAndUpdate(p._id, { $set: update });
    }

    // --- Legacy products (no testMaster link yet) — match by old name string, and link them ---
    if (nameChanged || linkedProducts.length === 0) {
      const oldNameRegex = new RegExp(`^${escape(oldName)}$`, 'i');
      const legacyProducts = await Product.find({ testMaster: null, name: oldNameRegex }).populate('lab', 'name').lean();
      for (const p of legacyProducts) {
        const labSuffix = p.lab?.name ? makeSlug(p.lab.name) : '';
        await Product.findByIdAndUpdate(p._id, {
          $set: {
            ...syncPayload,
            testMaster: test._id,   // link them now
            slug: nameChanged
              ? makeSlug(`${test.name}${labSuffix ? '-' + labSuffix : ''}-${String(p._id).slice(-5)}`)
              : p.slug,
          },
        });
      }
    }

    // Re-index in Algolia
    try {
      const newNameRegex = new RegExp(`^${escape(test.name)}$`, 'i');
      const updated = await Product.find({ $or: [{ testMaster: test._id }, { name: newNameRegex }] })
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

    res.json(test);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/v1/test-master/:id/sync-products
// Body: { fromName: "old product name" }  — renames matching products to this test's current name
exports.syncProducts = async (req, res) => {
  try {
    const test = await TestMaster.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const Product = require('../models/Product');
    const { syncObjects } = require('../services/algoliaSync');
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const fromName = (req.body.fromName || '').trim() || test.name;
    const fromNameRegex = new RegExp(`^${escape(fromName)}$`, 'i');

    // Match by provided old name OR already-linked testMaster
    const toRename = await Product.find({
      $or: [{ name: fromNameRegex }, { testMaster: test._id }],
    }).populate('lab', 'name').lean();

    for (const p of toRename) {
      const labSuffix = p.lab?.name ? makeSlug(p.lab.name) : '';
      const newSlug = makeSlug(`${test.name}${labSuffix ? '-' + labSuffix : ''}-${String(p._id).slice(-5)}`);
      await Product.findByIdAndUpdate(p._id, {
        $set: {
          testMaster:      test._id,   // link while syncing
          name:            test.name,
          slug:            newSlug,
          category:        test.category    || null,
          subcategory:     test.subcategory || null,
          description:     test.description || '',
          sampleType:      test.sampleType  || '',
          reportTime:      test.reportTime  || '',
          fastingRequired: !!test.fastingRequired,
          homeCollection:  !!test.homeCollection,
        },
      });
    }

    // Re-index in Algolia
    try {
      const newNameRegex = new RegExp(`^${escape(test.name)}$`, 'i');
      const updated = await Product.find({ name: newNameRegex })
        .populate({ path: 'lab', select: 'name slug city state address area pincode' })
        .lean();
      if (updated.length) {
        const records = updated.map((p) => ({
          objectID: String(p._id), id: String(p._id), type: p.type, name: p.name, slug: p.slug,
          description: p.description || '', price: p.price, salePrice: p.salePrice || null,
          reportTime: p.reportTime || '', sampleType: p.sampleType || '',
          homeCollection: !!p.homeCollection, fastingRequired: !!p.fastingRequired,
          tags: p.tags || [], category: p.category ? String(p.category) : null,
          lab: p.lab ? { _id: String(p.lab._id), name: p.lab.name, slug: p.lab.slug, city: p.lab.city } : null,
          isFeatured: !!p.isFeatured, isActive: !!p.isActive,
        }));
        await syncObjects('products', records);
      }
    } catch { /* algolia optional */ }

    res.json({ synced: toRename.length, fromName, toName: test.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

// DELETE /api/v1/test-master/bulk  — delete multiple tests by IDs
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'ids array is required' });

    const Product = require('../models/Product');
    const { deleteObjects } = require('../services/algoliaSync');

    const deletedTests = await TestMaster.find({ _id: { $in: ids } }).select('name').lean();
    await TestMaster.deleteMany({ _id: { $in: ids } });

    // Cascade: remove products matching deleted test names
    let totalProductsRemoved = 0;
    const allProductIds = [];
    for (const t of deletedTests) {
      const products = await Product.find({
        name: new RegExp(`^${t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      }).select('_id').lean();
      if (products.length) {
        const pIds = products.map((p) => String(p._id));
        await Product.deleteMany({ _id: { $in: pIds } });
        allProductIds.push(...pIds);
        totalProductsRemoved += pIds.length;
      }
    }
    if (allProductIds.length) {
      try { await deleteObjects('products', allProductIds); } catch { /* algolia optional */ }
    }

    res.json({ deleted: deletedTests.length, productsRemoved: totalProductsRemoved });
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
