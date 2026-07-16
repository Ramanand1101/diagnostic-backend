const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const makeSlug = require('../utils/slug');
const { parseCSV } = require('../utils/csvParser');

// GET /categories  — supports ?parent=null (top-level) or ?parent=<id> (subcategories)
exports.list = asyncHandler(async (req, res) => {
  const { q, parent, limit = 200, page = 1 } = req.query;
  const filter = {};

  if (parent === 'null' || parent === '') {
    filter.parent = null;
  } else if (parent) {
    filter.parent = parent;
  }

  if (q) filter.name = new RegExp(q, 'i');

  const safeLimit = Math.min(Number(limit) || 200, 500);
  const skip = (Number(page) - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Category.find(filter).populate('parent', 'name slug').sort('name').skip(skip).limit(safeLimit),
    Category.countDocuments(filter),
  ]);

  res.json({ items, total, page: Number(page), limit: safeLimit });
});

// GET /categories/tree
exports.tree = asyncHandler(async (req, res) => {
  const [parents, children] = await Promise.all([
    Category.find({ parent: null, isActive: true }).sort('name').lean(),
    Category.find({ parent: { $ne: null }, isActive: true }).sort('name').lean(),
  ]);

  const childMap = {};
  children.forEach((c) => {
    const key = c.parent.toString();
    if (!childMap[key]) childMap[key] = [];
    childMap[key].push(c);
  });

  const tree = parents.map((p) => ({ ...p, subcategories: childMap[p._id.toString()] || [] }));
  res.json(tree);
});

// GET /categories/:slug
exports.getBySlug = asyncHandler(async (req, res) => {
  const item = await Category.findOne({ slug: req.params.slug }).populate('parent', 'name slug');
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

// POST /categories
exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug) body.slug = makeSlug(body.name);
  if (!body.parent) body.parent = null;
  const item = await Category.create(body);
  res.status(201).json(item);
});

// PUT /categories/:id
exports.update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.name && !payload.slug) payload.slug = makeSlug(payload.name);
  if (!payload.parent) payload.parent = null;
  const item = await Category.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

// DELETE /categories/:id  — also deletes all subcategories
exports.remove = asyncHandler(async (req, res) => {
  const item = await Category.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  await Category.deleteMany({ parent: req.params.id });
  res.json({ message: 'Deleted' });
});

// GET /categories/demo-csv
exports.demoCsv = (req, res) => {
  const rows = [
    'name,parentCategory,description,isActive',
    '--- Top-level categories: leave parentCategory empty ---,,, ',
    'Pathology,,Blood and body fluid tests,true',
    'Radiology,,Imaging and scan services,true',
    'Packages,,Health checkup bundles,true',
    '--- Subcategories: put parent name in parentCategory column ---,,, ',
    'Blood Tests,Pathology,Complete blood analysis tests,true',
    'Urine Tests,Pathology,Urine examination tests,true',
    'Stool Tests,Pathology,Stool/fecal analysis tests,true',
    'Hormones,Pathology,Hormone level tests,true',
    'Thyroid Tests,Pathology,Thyroid function tests,true',
    'Liver Function,Pathology,Liver health tests,true',
    'Kidney Function,Pathology,Kidney health tests,true',
    'Diabetes,Pathology,Blood sugar and HbA1c tests,true',
    'Cardiac Tests,Pathology,Heart health tests,true',
    'X-Ray,Radiology,Digital X-ray services,true',
    'MRI,Radiology,Magnetic resonance imaging,true',
    'CT Scan,Radiology,Computed tomography scans,true',
    'Ultrasound,Radiology,Sonography services,true',
    'Full Body Checkup,Packages,Comprehensive health packages,true',
    'Diabetes Package,Packages,Diabetes management packages,true',
    'Heart Package,Packages,Cardiac health packages,true',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="categories-template.csv"');
  res.send(rows);
};

// POST /categories/bulk-csv
// Columns: name, parentCategory (parent name — empty = top-level), description, isActive
exports.bulkCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows' });

  let created = 0, updated = 0;
  const errors = [];
  // Cache parent lookups within this upload
  const parentCache = {};

  for (const [i, row] of rows.entries()) {
    const name = (row.name || '').trim();
    if (!name || name.startsWith('---')) continue; // skip blank/comment rows

    try {
      // Resolve parent
      let parentId = null;
      const parentName = (row.parentcategory || row.parent || '').trim();
      if (parentName) {
        if (parentCache[parentName.toLowerCase()]) {
          parentId = parentCache[parentName.toLowerCase()];
        } else {
          const parentDoc = await Category.findOne({ name: new RegExp(`^${parentName}$`, 'i'), parent: null });
          if (!parentDoc) {
            errors.push({ row: i + 2, error: `Parent category "${parentName}" not found. Make sure it's listed earlier in the CSV or already exists.` });
            continue;
          }
          parentId = parentDoc._id;
          parentCache[parentName.toLowerCase()] = parentDoc._id;
        }
      }

      const payload = {
        name,
        parent: parentId,
        description: row.description || '',
        isActive: row.isactive !== 'false',
      };

      // Upsert: match by name + parent
      const existing = await Category.findOne({
        name: new RegExp(`^${name}$`, 'i'),
        parent: parentId,
      });

      if (existing) {
        await Category.findByIdAndUpdate(existing._id, payload);
        updated++;
        // Cache top-level for later subcategory rows
        if (!parentId) parentCache[name.toLowerCase()] = existing._id;
      } else {
        const slug = makeSlug(parentId ? `${parentName}-${name}` : name);
        const doc = await Category.create({ ...payload, slug });
        created++;
        if (!parentId) parentCache[name.toLowerCase()] = doc._id;
      }
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  res.json({ created, updated, errors, total: rows.length });
});
