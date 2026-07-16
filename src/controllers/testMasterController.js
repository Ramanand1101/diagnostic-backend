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
    res.json(test);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const test = await TestMaster.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/v1/test-master/demo-csv
exports.demoCsv = (req, res) => {
  const csv = [
    '# Test Master List CSV Template',
    '# name: Test name (required, must be unique)',
    '# category: Category name (must match existing category)',
    '# subcategory: Subcategory name (optional)',
    '# sampleType: Blood / Urine / Stool / Saliva / Swab etc.',
    '# reportTime: e.g. 24 hours / Same day / 48 hours',
    '# fastingRequired: true / false',
    '# homeCollection: true / false',
    '# description: Optional description',
    'name,category,subcategory,sampleType,reportTime,fastingRequired,homeCollection,description',
    'Complete Blood Count (CBC),Pathology,Blood Tests,Blood,24 hours,false,true,Basic blood test to check overall health',
    'Lipid Profile,Pathology,Blood Tests,Blood,24 hours,true,true,Checks cholesterol and triglycerides',
    'Chest X-Ray,Radiology,,X-ray,Same day,false,false,Standard chest radiograph',
    'Urine Routine,Pathology,Urine Tests,Urine,4 hours,false,false,Basic urine examination',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="test-master-template.csv"');
  res.send(csv);
};

// POST /api/v1/test-master/bulk-csv
exports.bulkCsv = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file required' });
    const rows = parseCSV(req.file.buffer.toString('utf8'));

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

        const existing = await TestMaster.findOne({ name: { $regex: `^${data.name}$`, $options: 'i' } });
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
