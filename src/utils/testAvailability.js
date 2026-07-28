const TestAvailabilityRule = require('../models/TestAvailabilityRule');

const SCOPE_RANK = { lab: 4, city: 3, state: 2, brand: 1 };
const OVERRIDE_TYPES = ['specificDates', 'dateRange', 'temporaryDisable', 'permanentDisable'];
const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function withinBounds(date, from, to) {
  if (from && date < new Date(new Date(from).setHours(0, 0, 0, 0))) return false;
  if (to && date > new Date(new Date(to).setHours(23, 59, 59, 999))) return false;
  return true;
}

// Does `rule` govern `date` at all, and if so, is the test available (true) or not (false)?
// Returns null if the rule simply doesn't speak to this date (caller should keep looking).
function evaluateRule(rule, date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);

  switch (rule.scheduleType) {
    case 'permanentDisable':
      if (!withinBounds(d, rule.effectiveFrom, null)) return null; // hasn't taken effect yet
      return false;
    case 'temporaryDisable':
      return withinBounds(d, rule.effectiveFrom, rule.effectiveTo) ? false : null;
    case 'specificDates':
      return (rule.specificDates || []).some((sd) => sameDay(new Date(sd), d)) ? true : null;
    case 'dateRange':
      return withinBounds(d, rule.effectiveFrom, rule.effectiveTo) ? true : null;
    case 'everyday':
      return withinBounds(d, rule.effectiveFrom, rule.effectiveTo) ? true : null;
    case 'selectedDays':
      if (!withinBounds(d, rule.effectiveFrom, rule.effectiveTo)) return null;
      return (rule.daysOfWeek || []).includes(d.getDay()) ? true : null;
    case 'alternateDays': {
      if (!rule.alternateAnchorDate) return null;
      if (!withinBounds(d, rule.effectiveFrom, rule.effectiveTo)) return null;
      const anchor = new Date(rule.alternateAnchorDate); anchor.setHours(0, 0, 0, 0);
      const diffDays = Math.round((d - anchor) / 86400000);
      return diffDays >= 0 && diffDays % 2 === 0 ? true : null;
    }
    case 'customRecurring': {
      if (!rule.alternateAnchorDate || !rule.customIntervalDays) return null;
      if (!withinBounds(d, rule.effectiveFrom, rule.effectiveTo)) return null;
      const anchor = new Date(rule.alternateAnchorDate); anchor.setHours(0, 0, 0, 0);
      const diffDays = Math.round((d - anchor) / 86400000);
      return diffDays >= 0 && diffDays % rule.customIntervalDays === 0 ? true : null;
    }
    default:
      return null;
  }
}

// All active rules that could possibly govern this test at this lab (by exact lab, its
// city, its state, its brand, or a blanket rule for all tests at that scope).
async function rulesForTestAndLab(testMasterId, lab) {
  const scopeOr = [{ scope: 'lab', lab: lab._id }];
  if (lab.city) scopeOr.push({ scope: 'city', city: new RegExp(`^${escapeRegex(lab.city)}$`, 'i') });
  if (lab.state) scopeOr.push({ scope: 'state', state: new RegExp(`^${escapeRegex(lab.state)}$`, 'i') });
  if (lab.brand) scopeOr.push({ scope: 'brand', brand: lab.brand });

  return TestAvailabilityRule.find({
    active: true,
    $or: testMasterId ? [{ testMaster: testMasterId }, { testMaster: null }] : [{ testMaster: null }],
    $and: [{ $or: scopeOr }],
  }).lean();
}

// The core resolver: is `testMasterId` bookable at `lab` on `date`? Highest-specificity
// scope wins; within any scope, a date-specific override always beats a recurring pattern.
// No matching rule at all → available by default (the platform doesn't require every
// test/lab combination to be explicitly configured).
function resolve(rules, date) {
  const bySpecificity = (a, b) => SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope];
  const overrides = rules.filter((r) => OVERRIDE_TYPES.includes(r.scheduleType)).sort(bySpecificity);
  const patterns = rules.filter((r) => !OVERRIDE_TYPES.includes(r.scheduleType)).sort(bySpecificity);

  for (const rule of overrides) {
    const verdict = evaluateRule(rule, date);
    if (verdict !== null) return { available: verdict, reason: rule.reason || null, rule };
  }
  for (const rule of patterns) {
    const verdict = evaluateRule(rule, date);
    if (verdict !== null) return { available: verdict, reason: verdict ? null : (rule.reason || null), rule };
  }
  return { available: true, reason: null, rule: null };
}

async function isAvailable({ testMasterId, lab, date }) {
  const rules = await rulesForTestAndLab(testMasterId, lab);
  return resolve(rules, date);
}

// For a date-picker: which of the next `daysAhead` days is this test NOT bookable at this lab.
async function getUnavailableDatesForTestLab(testMasterId, lab, daysAhead = 30) {
  const rules = await rulesForTestAndLab(testMasterId, lab);
  const unavailable = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i);
    const { available } = resolve(rules, d);
    if (!available) {
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
      unavailable.push(`${y}-${m}-${day}`);
    }
  }
  return unavailable;
}

// Batch resolver for a list of populated Products (each with .testMaster._id and .lab
// populated with city/state/brand) — fetches all potentially-relevant rules ONCE instead
// of once per product, then resolves each in memory.
async function filterAvailableProducts(products, date) {
  const testIds = [...new Set(products.map((p) => String(p.testMaster?._id || p.testMaster)).filter(Boolean))];
  if (!testIds.length) return products;

  const rules = await TestAvailabilityRule.find({
    active: true,
    $or: [{ testMaster: { $in: testIds } }, { testMaster: null }],
  }).lean();

  return products.filter((p) => {
    const lab = p.lab;
    if (!lab) return true; // no lab context — nothing to restrict against
    const tmId = String(p.testMaster?._id || p.testMaster || '');
    const relevant = rules.filter((r) => {
      if (r.testMaster && String(r.testMaster) !== tmId) return false;
      if (r.scope === 'lab') return String(r.lab) === String(lab._id);
      if (r.scope === 'city') return lab.city && r.city?.toLowerCase() === lab.city.toLowerCase();
      if (r.scope === 'state') return lab.state && r.state?.toLowerCase() === lab.state.toLowerCase();
      if (r.scope === 'brand') return lab.brand && String(r.brand) === String(lab.brand._id || lab.brand);
      return false;
    });
    return resolve(relevant, date).available;
  });
}

module.exports = { isAvailable, getUnavailableDatesForTestLab, filterAvailableProducts, resolve, rulesForTestAndLab };
