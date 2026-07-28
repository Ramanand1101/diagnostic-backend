const LabHoliday = require('../models/LabHoliday');

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Formats a Date using its LOCAL calendar day — never toISOString() for this, since
// that converts to UTC first and silently shifts the date back in any timezone ahead
// of UTC (e.g. IST, the server's own timezone here).
function toLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// All active holiday rules that could possibly apply to this lab (by exact lab,
// its city, its state, or a system-wide rule) — callers then check specific dates
// against each rule locally, since recurrence math (weekly/range) can't be done
// entirely in a Mongo query.
async function rulesForLab(lab) {
  const or = [{ scope: 'all' }, { scope: 'lab', lab: lab._id }];
  if (lab.city) or.push({ scope: 'city', city: new RegExp(`^${escapeRegex(lab.city)}$`, 'i') });
  if (lab.state) or.push({ scope: 'state', state: new RegExp(`^${escapeRegex(lab.state)}$`, 'i') });
  return LabHoliday.find({ active: true, $or: or }).lean();
}

function ruleBlocksDate(rule, dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  if (rule.recurrence === 'once' && rule.date) {
    const rd = new Date(rule.date);
    rd.setHours(0, 0, 0, 0);
    return rd.getTime() === d.getTime();
  }
  if (rule.recurrence === 'range' && rule.startDate && rule.endDate) {
    const sd = new Date(rule.startDate); sd.setHours(0, 0, 0, 0);
    const ed = new Date(rule.endDate); ed.setHours(0, 0, 0, 0);
    return d.getTime() >= sd.getTime() && d.getTime() <= ed.getTime();
  }
  if (rule.recurrence === 'weekly' && rule.dayOfWeek !== null && rule.dayOfWeek !== undefined) {
    return d.getDay() === rule.dayOfWeek;
  }
  return false;
}

// Returns the first matching holiday rule (or null) for a given lab + date —
// used to reject a booking/appointment on a holiday date, with the rule's
// `reason` available for a clear error message.
async function findBlockingRule(lab, dateInput) {
  if (!dateInput) return null;
  const rules = await rulesForLab(lab);
  return rules.find((r) => ruleBlocksDate(r, dateInput)) || null;
}

// Returns an array of 'YYYY-MM-DD' strings blocked for this lab within the next
// `daysAhead` days (inclusive of today) — used to grey out dates in date pickers.
async function getBlockedDatesForLab(lab, daysAhead = 30) {
  const rules = await rulesForLab(lab);
  const blocked = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (rules.some((r) => ruleBlocksDate(r, d))) {
      blocked.push(toLocalDateString(d));
    }
  }
  return blocked;
}

module.exports = { findBlockingRule, getBlockedDatesForLab, ruleBlocksDate, rulesForLab };
