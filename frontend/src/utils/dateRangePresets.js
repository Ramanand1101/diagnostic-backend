// Resolves a named date-range preset into concrete { dateFrom, dateTo } ISO date
// strings (YYYY-MM-DD) for the Bookings/Billing admin filter bars. 'custom' returns
// null — the caller is expected to use its own from/to date inputs in that case.
function pad(n) { return String(n).padStart(2, '0'); }
function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export function resolveDatePreset(preset) {
  const now = new Date();

  if (preset === 'thisMonth') {
    return { dateFrom: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: toISODate(now) };
  }
  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dateFrom: toISODate(start), dateTo: toISODate(end) };
  }
  if (preset === 'thisYear') {
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: toISODate(now) };
  }
  if (preset === 'lastYear') {
    return { dateFrom: `${now.getFullYear() - 1}-01-01`, dateTo: `${now.getFullYear() - 1}-12-31` };
  }
  return null; // 'custom' or unrecognized — caller supplies its own dateFrom/dateTo
}

export const DATE_PRESETS = [
  { value: '',          label: 'All Time' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear',  label: 'This Year' },
  { value: 'lastYear',  label: 'Last Year' },
  { value: 'custom',    label: 'Custom Range' },
];
