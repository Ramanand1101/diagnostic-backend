const asyncHandler = require('express-async-handler');
const LabHoliday = require('../models/LabHoliday');
const Lab = require('../models/Lab');
const { parseCSV } = require('../utils/csvParser');
const { getBlockedDatesForLab } = require('../utils/labHolidayCheck');
const { logActivity } = require('../utils/activityLog');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Validates the scope/recurrence-specific required fields on a payload.
// Returns an error message string, or null if everything is present and consistent.
function validateHolidayPayload(payload) {
  const { scope, lab, city, state, recurrence, date, startDate, endDate, dayOfWeek } = payload;

  if (!['lab', 'city', 'state', 'all'].includes(scope)) return 'A valid scope (lab/city/state/all) is required.';
  if (scope === 'lab' && !lab) return 'Select a lab for a lab-scoped holiday.';
  if (scope === 'city' && !city) return 'Enter a city for a city-scoped holiday.';
  if (scope === 'state' && !state) return 'Enter a state for a state-scoped holiday.';

  if (!['once', 'range', 'weekly'].includes(recurrence)) return 'A valid recurrence (once/range/weekly) is required.';
  if (recurrence === 'once' && !date) return 'Select a date for a single-day holiday.';
  if (recurrence === 'range' && (!startDate || !endDate)) return 'Select both a start and end date for a date-range holiday.';
  if (recurrence === 'range' && startDate && endDate && new Date(startDate) > new Date(endDate)) return 'Start date must be before the end date.';
  if (recurrence === 'weekly' && (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek === '')) return 'Select a day of the week for a recurring weekly holiday.';
  if (recurrence === 'weekly' && (Number(dayOfWeek) < 0 || Number(dayOfWeek) > 6)) return 'Day of week must be between 0 (Sunday) and 6 (Saturday).';

  return null;
}

// Builds a clean holiday document from raw input, clearing fields that don't
// apply to the chosen scope/recurrence so stale values never linger.
function buildHolidayDoc(payload) {
  const doc = {
    scope: payload.scope,
    lab: payload.scope === 'lab' ? payload.lab : null,
    city: payload.scope === 'city' ? payload.city : '',
    state: payload.scope === 'state' ? payload.state : '',
    recurrence: payload.recurrence,
    date: payload.recurrence === 'once' ? payload.date : null,
    startDate: payload.recurrence === 'range' ? payload.startDate : null,
    endDate: payload.recurrence === 'range' ? payload.endDate : null,
    dayOfWeek: payload.recurrence === 'weekly' ? Number(payload.dayOfWeek) : null,
    reason: payload.reason || '',
  };
  return doc;
}

function describeHoliday(h) {
  const scopeLabel = { lab: h.lab?.name || 'Lab', city: h.city, state: h.state, all: 'All labs' }[h.scope] || h.scope;
  const when = h.recurrence === 'once' ? new Date(h.date).toDateString()
    : h.recurrence === 'range' ? `${new Date(h.startDate).toDateString()} – ${new Date(h.endDate).toDateString()}`
    : `every ${DAY_NAMES[h.dayOfWeek]}`;
  return `${scopeLabel} — ${when}`;
}

exports.listHolidays = asyncHandler(async (req, res) => {
  const { scope, lab, city, state, active, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (scope) filter.scope = scope;
  if (lab) filter.lab = lab;
  if (city) filter.city = new RegExp(city, 'i');
  if (state) filter.state = new RegExp(state, 'i');
  if (active !== undefined) filter.active = active === 'true';

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    LabHoliday.find(filter).populate('lab', 'name city state').populate('createdBy', 'name').sort('-createdAt').skip(skip).limit(safeLimit),
    LabHoliday.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

exports.createHoliday = asyncHandler(async (req, res) => {
  const validationError = validateHolidayPayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const holiday = await LabHoliday.create({ ...buildHolidayDoc(req.body), createdBy: req.user._id });
  await holiday.populate('lab', 'name city state');
  logActivity({ actor: req.user, action: 'lab_holiday.created', entity: 'LabHoliday', entityId: holiday._id, description: `${req.user.name} added a holiday (${describeHoliday(holiday)})` });
  res.status(201).json(holiday);
});

exports.updateHoliday = asyncHandler(async (req, res) => {
  const validationError = validateHolidayPayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const holiday = await LabHoliday.findByIdAndUpdate(req.params.id, buildHolidayDoc(req.body), { new: true, runValidators: true })
    .populate('lab', 'name city state');
  if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
  logActivity({ actor: req.user, action: 'lab_holiday.updated', entity: 'LabHoliday', entityId: holiday._id, description: `${req.user.name} updated a holiday (${describeHoliday(holiday)})` });
  res.json(holiday);
});

exports.toggleActive = asyncHandler(async (req, res) => {
  const holiday = await LabHoliday.findById(req.params.id);
  if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
  holiday.active = !holiday.active;
  await holiday.save();
  await holiday.populate('lab', 'name city state');
  logActivity({ actor: req.user, action: holiday.active ? 'lab_holiday.activated' : 'lab_holiday.deactivated', entity: 'LabHoliday', entityId: holiday._id, description: `${req.user.name} ${holiday.active ? 'activated' : 'deactivated'} a holiday (${describeHoliday(holiday)})` });
  res.json(holiday);
});

exports.deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await LabHoliday.findByIdAndDelete(req.params.id);
  if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
  logActivity({ actor: req.user, action: 'lab_holiday.deleted', entity: 'LabHoliday', entityId: holiday._id, description: `${req.user.name} deleted a holiday (${describeHoliday(holiday)})` });
  res.json({ message: 'Holiday deleted' });
});

// GET /lab-holidays/blocked-dates?lab=<id>&days=30 — dates the given lab cannot be
// booked on, for the date picker to grey out.
exports.getBlockedDates = asyncHandler(async (req, res) => {
  const { lab: labId, days = 30 } = req.query;
  if (!labId) return res.status(400).json({ message: 'lab is required.' });
  const lab = await Lab.findById(labId).select('city state');
  if (!lab) return res.status(404).json({ message: 'Lab not found' });

  const blockedDates = await getBlockedDatesForLab(lab, Math.min(Number(days) || 30, 90));
  res.json({ blockedDates });
});

// GET /lab-holidays/demo-csv
exports.demoCsv = (req, res) => {
  const rows = [
    'scope,labName,city,state,recurrence,date,startDate,endDate,dayOfWeek,reason',
    'lab,Vijay Diagnostics,,,once,2026-08-15,,,,Independence Day',
    'city,,Lucknow,,weekly,,,,0,Sunday closure for all Lucknow labs',
    'all,,,,range,,2026-10-20,2026-10-24,,Diwali break — all branches',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="lab-holidays-template.csv"');
  res.send(rows);
};

// POST /lab-holidays/bulk-csv
exports.bulkUploadCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });
  const { rows } = parseCSV(req.file.buffer);
  if (!rows.length) return res.status(400).json({ message: 'CSV has no data rows.' });

  const created = [];
  const errors = [];

  for (const [i, row] of rows.entries()) {
    try {
      let labId = null;
      if (row.scope === 'lab') {
        const labName = (row.labname || '').trim();
        if (!labName) { errors.push({ row: i + 2, error: 'labName is required for scope=lab' }); continue; }
        const labDoc = await Lab.findOne({ name: new RegExp(`^${labName}$`, 'i') }).select('_id');
        if (!labDoc) { errors.push({ row: i + 2, error: `Lab "${labName}" not found` }); continue; }
        labId = labDoc._id;
      }

      const payload = {
        scope: row.scope,
        lab: labId,
        city: row.city || '',
        state: row.state || '',
        recurrence: row.recurrence,
        date: row.date || null,
        startDate: row.startdate || null,
        endDate: row.enddate || null,
        dayOfWeek: row.dayofweek !== undefined && row.dayofweek !== '' ? Number(row.dayofweek) : null,
        reason: row.reason || '',
      };

      const validationError = validateHolidayPayload(payload);
      if (validationError) { errors.push({ row: i + 2, error: validationError }); continue; }

      const holiday = await LabHoliday.create({ ...buildHolidayDoc(payload), createdBy: req.user._id });
      created.push(holiday._id);
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  if (created.length) {
    logActivity({ actor: req.user, action: 'lab_holiday.bulk_uploaded', entity: 'LabHoliday', entityId: null, description: `${req.user.name} bulk-uploaded ${created.length} holiday${created.length === 1 ? '' : 's'}` });
  }
  res.json({ created: created.length, errors, total: rows.length });
});
