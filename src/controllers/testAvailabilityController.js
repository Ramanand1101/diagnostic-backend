const asyncHandler = require('express-async-handler');
const TestAvailabilityRule = require('../models/TestAvailabilityRule');
const Lab = require('../models/Lab');
const TestMaster = require('../models/TestMaster');
const Product = require('../models/Product');
const { parseCSV } = require('../utils/csvParser');
const { logActivity } = require('../utils/activityLog');
const { isAvailable, getUnavailableDatesForTestLab } = require('../utils/testAvailability');
const { resolveLabIdsForLocation } = require('../utils/geoLabs');

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SCHEDULE_TYPES = ['everyday', 'selectedDays', 'alternateDays', 'specificDates', 'dateRange', 'customRecurring', 'temporaryDisable', 'permanentDisable'];

function validateRulePayload(payload) {
  const { scope, lab, city, state, brand, scheduleType, daysOfWeek, specificDates, effectiveFrom, effectiveTo, alternateAnchorDate, customIntervalDays } = payload;

  if (!['brand', 'state', 'city', 'lab'].includes(scope)) return 'A valid scope (brand/state/city/lab) is required.';
  if (scope === 'lab' && !lab) return 'Select a lab for a lab-scoped rule.';
  if (scope === 'city' && !city) return 'Enter a city for a city-scoped rule.';
  if (scope === 'state' && !state) return 'Enter a state for a state-scoped rule.';
  if (scope === 'brand' && !brand) return 'Select a brand for a brand-scoped rule.';

  if (!SCHEDULE_TYPES.includes(scheduleType)) return 'A valid schedule type is required.';
  if (scheduleType === 'selectedDays' && (!Array.isArray(daysOfWeek) || !daysOfWeek.length)) return 'Select at least one day of the week.';
  if (scheduleType === 'selectedDays' && daysOfWeek.some((d) => Number(d) < 0 || Number(d) > 6)) return 'Days of week must be between 0 (Sunday) and 6 (Saturday).';
  if (scheduleType === 'specificDates' && (!Array.isArray(specificDates) || !specificDates.length)) return 'Provide at least one specific date.';
  if (scheduleType === 'dateRange' && (!effectiveFrom || !effectiveTo)) return 'Select both a start and end date for a date-range rule.';
  if (scheduleType === 'temporaryDisable' && (!effectiveFrom || !effectiveTo)) return 'Select both a start and end date for a temporary disable.';
  if (scheduleType === 'alternateDays' && !alternateAnchorDate) return 'Select an anchor date for alternate-day availability.';
  if (scheduleType === 'customRecurring' && (!alternateAnchorDate || !customIntervalDays)) return 'Select an anchor date and interval (days) for a custom recurring schedule.';
  if (effectiveFrom && effectiveTo && new Date(effectiveFrom) > new Date(effectiveTo)) return 'Effective-from date must be before effective-to date.';

  return null;
}

function buildRuleDoc(payload) {
  return {
    testMaster: payload.testMaster || null,
    scope: payload.scope,
    brand: payload.scope === 'brand' ? payload.brand : null,
    state: payload.scope === 'state' ? payload.state : '',
    city: payload.scope === 'city' ? payload.city : '',
    lab: payload.scope === 'lab' ? payload.lab : null,
    scheduleType: payload.scheduleType,
    daysOfWeek: payload.scheduleType === 'selectedDays' ? (payload.daysOfWeek || []).map(Number) : [],
    alternateAnchorDate: ['alternateDays', 'customRecurring'].includes(payload.scheduleType) ? payload.alternateAnchorDate : null,
    specificDates: payload.scheduleType === 'specificDates' ? (payload.specificDates || []) : [],
    customIntervalDays: payload.scheduleType === 'customRecurring' ? Number(payload.customIntervalDays) : null,
    effectiveFrom: payload.effectiveFrom || null,
    effectiveTo: payload.effectiveTo || null,
    homeCollectionAvailable: payload.homeCollectionAvailable === undefined || payload.homeCollectionAvailable === '' ? null : Boolean(payload.homeCollectionAvailable),
    timeSlots: payload.timeSlots || [],
    reason: payload.reason || '',
  };
}

function describeRule(r) {
  const scopeLabel = { lab: r.lab?.name || 'Lab', city: r.city, state: r.state, brand: r.brand?.name || 'Brand' }[r.scope] || r.scope;
  const testLabel = r.testMaster?.name || 'All tests';
  return `${testLabel} @ ${scopeLabel} — ${r.scheduleType}`;
}

exports.listRules = asyncHandler(async (req, res) => {
  const { scope, testMaster, lab, city, state, brand, active, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (scope) filter.scope = scope;
  if (testMaster) filter.testMaster = testMaster;
  if (lab) filter.lab = lab;
  if (city) filter.city = new RegExp(city, 'i');
  if (state) filter.state = new RegExp(state, 'i');
  if (brand) filter.brand = brand;
  if (active !== undefined) filter.active = active === 'true';

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    TestAvailabilityRule.find(filter)
      .populate('lab', 'name city state')
      .populate('brand', 'name')
      .populate('testMaster', 'name category')
      .populate('createdBy', 'name')
      .sort('-createdAt').skip(skip).limit(safeLimit),
    TestAvailabilityRule.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.createRule = asyncHandler(async (req, res) => {
  const validationError = validateRulePayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const rule = await TestAvailabilityRule.create({ ...buildRuleDoc(req.body), createdBy: req.user._id });
  await rule.populate([{ path: 'lab', select: 'name city state' }, { path: 'brand', select: 'name' }, { path: 'testMaster', select: 'name category' }]);
  logActivity({ actor: req.user, action: 'test_availability.created', entity: 'TestAvailabilityRule', entityId: rule._id, description: `${req.user.name} added an availability rule (${describeRule(rule)})` });
  res.status(201).json(rule);
});

exports.updateRule = asyncHandler(async (req, res) => {
  const validationError = validateRulePayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const rule = await TestAvailabilityRule.findByIdAndUpdate(req.params.id, buildRuleDoc(req.body), { new: true, runValidators: true })
    .populate('lab', 'name city state').populate('brand', 'name').populate('testMaster', 'name category');
  if (!rule) return res.status(404).json({ message: 'Rule not found' });
  logActivity({ actor: req.user, action: 'test_availability.updated', entity: 'TestAvailabilityRule', entityId: rule._id, description: `${req.user.name} updated an availability rule (${describeRule(rule)})` });
  res.json(rule);
});

exports.toggleActive = asyncHandler(async (req, res) => {
  const rule = await TestAvailabilityRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ message: 'Rule not found' });
  rule.active = !rule.active;
  await rule.save();
  await rule.populate([{ path: 'lab', select: 'name city state' }, { path: 'brand', select: 'name' }, { path: 'testMaster', select: 'name category' }]);
  logActivity({ actor: req.user, action: rule.active ? 'test_availability.activated' : 'test_availability.deactivated', entity: 'TestAvailabilityRule', entityId: rule._id, description: `${req.user.name} ${rule.active ? 'activated' : 'deactivated'} an availability rule (${describeRule(rule)})` });
  res.json(rule);
});

exports.deleteRule = asyncHandler(async (req, res) => {
  const rule = await TestAvailabilityRule.findByIdAndDelete(req.params.id);
  if (!rule) return res.status(404).json({ message: 'Rule not found' });
  logActivity({ actor: req.user, action: 'test_availability.deleted', entity: 'TestAvailabilityRule', entityId: rule._id, description: `${req.user.name} deleted an availability rule (${describeRule(rule)})` });
  res.json({ message: 'Rule deleted' });
});

// POST /test-availability/bulk-toggle — enable/disable many rules at once by id
exports.bulkToggle = asyncHandler(async (req, res) => {
  const { ids, active } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array is required.' });
  const result = await TestAvailabilityRule.updateMany({ _id: { $in: ids } }, { active: Boolean(active) });
  logActivity({ actor: req.user, action: 'test_availability.bulk_toggled', entity: 'TestAvailabilityRule', entityId: null, description: `${req.user.name} ${active ? 'activated' : 'deactivated'} ${result.modifiedCount} availability rule(s) in bulk` });
  res.json({ modified: result.modifiedCount });
});

// POST /test-availability/bulk-apply — apply one rule config to many labs at once
exports.bulkApplyToLabs = asyncHandler(async (req, res) => {
  const { labIds, ...rulePayload } = req.body;
  if (!Array.isArray(labIds) || !labIds.length) return res.status(400).json({ message: 'labIds array is required.' });

  const validationError = validateRulePayload({ ...rulePayload, scope: 'lab', lab: labIds[0] });
  if (validationError) return res.status(400).json({ message: validationError });

  const labs = await Lab.find({ _id: { $in: labIds } }).select('_id');
  const docs = labs.map((lab) => ({
    ...buildRuleDoc({ ...rulePayload, scope: 'lab', lab: lab._id }),
    createdBy: req.user._id,
  }));
  const created = await TestAvailabilityRule.insertMany(docs);
  logActivity({ actor: req.user, action: 'test_availability.bulk_applied', entity: 'TestAvailabilityRule', entityId: null, description: `${req.user.name} applied an availability rule to ${created.length} lab(s) in bulk` });
  res.status(201).json({ created: created.length });
});

// GET /test-availability/check?testMaster=&lab=&date=
exports.checkAvailability = asyncHandler(async (req, res) => {
  const { testMaster, lab: labId, date } = req.query;
  if (!labId || !date) return res.status(400).json({ message: 'lab and date are required.' });
  const lab = await Lab.findById(labId).select('city state brand');
  if (!lab) return res.status(404).json({ message: 'Lab not found' });

  const verdict = await isAvailable({ testMasterId: testMaster || null, lab, date: new Date(date) });
  res.json(verdict);
});

// GET /test-availability/unavailable-dates?testMaster=&lab=&days=30
exports.getUnavailableDates = asyncHandler(async (req, res) => {
  const { testMaster, lab: labId, days = 30 } = req.query;
  if (!labId) return res.status(400).json({ message: 'lab is required.' });
  const lab = await Lab.findById(labId).select('city state brand');
  if (!lab) return res.status(404).json({ message: 'Lab not found' });

  const unavailableDates = await getUnavailableDatesForTestLab(testMaster || null, lab, Math.min(Number(days) || 30, 90));
  res.json({ unavailableDates });
});

// GET /test-availability/alternatives?testMaster=&lab=&date=&lat=&lng=&city=&radiusKm=
// When a test is unavailable at the requested lab on the requested date, suggest nearby
// labs that both stock the test (have an active Product for it) and are available that day.
exports.suggestAlternativeLabs = asyncHandler(async (req, res) => {
  const { testMaster, lab: excludeLabId, date, lat, lng, city, radiusKm } = req.query;
  if (!testMaster || !date) return res.status(400).json({ message: 'testMaster and date are required.' });

  const nearbyLabIds = await resolveLabIdsForLocation({ city, lat, lng, radiusKm });
  const productFilter = { testMaster, isActive: true };
  if (nearbyLabIds) productFilter.lab = { $in: nearbyLabIds };

  const candidateProducts = await Product.find(productFilter).populate('lab', 'name city state address lat lng').limit(50);
  const candidateLabs = candidateProducts
    .map((p) => p.lab)
    .filter((lab) => lab && String(lab._id) !== String(excludeLabId || ''));

  const seen = new Set();
  const uniqueLabs = candidateLabs.filter((lab) => {
    if (seen.has(String(lab._id))) return false;
    seen.add(String(lab._id));
    return true;
  });

  const results = [];
  for (const lab of uniqueLabs) {
    const verdict = await isAvailable({ testMasterId: testMaster, lab, date: new Date(date) });
    if (verdict.available) results.push({ lab: { _id: lab._id, name: lab.name, city: lab.city, state: lab.state, address: lab.address } });
    if (results.length >= 10) break;
  }
  res.json({ alternatives: results });
});

// GET /test-availability/demo-csv
exports.demoCsv = (req, res) => {
  const rows = [
    'testName,scope,labName,city,state,brandName,scheduleType,daysOfWeek,alternateAnchorDate,specificDates,customIntervalDays,effectiveFrom,effectiveTo,reason',
    'CBC,lab,Vijay Diagnostics,,,,everyday,,,,,,,',
    'Lipid Profile,city,,Lucknow,,,selectedDays,"1,2,3,4,5",,,,,,',
    ',lab,Vijay Diagnostics,,,,temporaryDisable,,,,,2026-08-01,2026-08-05,Machine Maintenance',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="test-availability-template.csv"');
  res.send(rows);
};

// POST /test-availability/bulk-csv
exports.bulkUploadCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });
  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows.' });

  const created = [];
  const errors = [];

  for (const [i, row] of rows.entries()) {
    try {
      let testMasterId = null;
      if (row.testname) {
        const tm = await TestMaster.findOne({ name: new RegExp(`^${escapeRegex(row.testname)}$`, 'i') }).select('_id');
        if (!tm) { errors.push({ row: i + 2, error: `Test "${row.testname}" not found` }); continue; }
        testMasterId = tm._id;
      }

      let labId = null;
      if (row.scope === 'lab') {
        const labName = (row.labname || '').trim();
        if (!labName) { errors.push({ row: i + 2, error: 'labName is required for scope=lab' }); continue; }
        const labDoc = await Lab.findOne({ name: new RegExp(`^${escapeRegex(labName)}$`, 'i') }).select('_id');
        if (!labDoc) { errors.push({ row: i + 2, error: `Lab "${labName}" not found` }); continue; }
        labId = labDoc._id;
      }

      let brandId = null;
      if (row.scope === 'brand') {
        const Brand = require('../models/Brand');
        const brandName = (row.brandname || '').trim();
        if (!brandName) { errors.push({ row: i + 2, error: 'brandName is required for scope=brand' }); continue; }
        const brandDoc = await Brand.findOne({ name: new RegExp(`^${escapeRegex(brandName)}$`, 'i') }).select('_id');
        if (!brandDoc) { errors.push({ row: i + 2, error: `Brand "${brandName}" not found` }); continue; }
        brandId = brandDoc._id;
      }

      const payload = {
        testMaster: testMasterId,
        scope: row.scope,
        lab: labId,
        brand: brandId,
        city: row.city || '',
        state: row.state || '',
        scheduleType: row.scheduletype,
        daysOfWeek: row.daysofweek ? row.daysofweek.split(',').map((d) => Number(d.trim())) : [],
        alternateAnchorDate: row.alternateanchordate || null,
        specificDates: row.specificdates ? row.specificdates.split(',').map((d) => d.trim()) : [],
        customIntervalDays: row.customintervaldays || null,
        effectiveFrom: row.effectivefrom || null,
        effectiveTo: row.effectiveto || null,
        reason: row.reason || '',
      };

      const validationError = validateRulePayload(payload);
      if (validationError) { errors.push({ row: i + 2, error: validationError }); continue; }

      const rule = await TestAvailabilityRule.create({ ...buildRuleDoc(payload), createdBy: req.user._id });
      created.push(rule._id);
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  if (created.length) {
    logActivity({ actor: req.user, action: 'test_availability.bulk_uploaded', entity: 'TestAvailabilityRule', entityId: null, description: `${req.user.name} bulk-uploaded ${created.length} availability rule${created.length === 1 ? '' : 's'}` });
  }
  res.json({ created: created.length, errors, total: rows.length });
});
