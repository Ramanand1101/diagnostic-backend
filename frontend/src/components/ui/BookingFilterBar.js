'use client';
import { useState, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';
import { DATE_PRESETS, resolveDatePreset } from '@/utils/dateRangePresets';

// Shared filter bar for the admin Bookings and Billing tables — lab dropdown, a
// date-range preset (with a custom from/to fallback), and customer name / mobile
// search. Controlled: `value` is { lab, datePreset, dateFrom, dateTo, customer, mobile },
// `onChange` receives the next value object on every change.
export default function BookingFilterBar({ value, onChange, labs = [], showLabFilter = true }) {
  const [customerInput, setCustomerInput] = useState(value.customer || '');
  const [mobileInput, setMobileInput] = useState(value.mobile || '');
  const customerTimer = useRef(null);
  const mobileTimer = useRef(null);

  const set = (patch) => onChange({ ...value, ...patch });

  const handlePresetChange = (preset) => {
    if (preset === 'custom') {
      set({ datePreset: preset });
      return;
    }
    const range = resolveDatePreset(preset);
    set({ datePreset: preset, dateFrom: range?.dateFrom || '', dateTo: range?.dateTo || '' });
  };

  const handleCustomerInput = (e) => {
    const val = e.target.value;
    setCustomerInput(val);
    clearTimeout(customerTimer.current);
    customerTimer.current = setTimeout(() => set({ customer: val }), 400);
  };

  const handleMobileInput = (e) => {
    const val = e.target.value;
    setMobileInput(val);
    clearTimeout(mobileTimer.current);
    mobileTimer.current = setTimeout(() => set({ mobile: val }), 400);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {showLabFilter && (
        <select value={value.lab || ''} onChange={(e) => set({ lab: e.target.value })} className="input text-sm max-w-[200px]">
          <option value="">All Labs</option>
          {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      )}

      <select value={value.datePreset || ''} onChange={(e) => handlePresetChange(e.target.value)} className="input text-sm max-w-[160px]">
        {DATE_PRESETS.map(({ value: v, label }) => <option key={v} value={v}>{label}</option>)}
      </select>

      {value.datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={value.dateFrom || ''} onChange={(e) => set({ dateFrom: e.target.value })}
            className="input text-sm py-1.5 px-2" max={value.dateTo || undefined} />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={value.dateTo || ''} onChange={(e) => set({ dateTo: e.target.value })}
            className="input text-sm py-1.5 px-2" min={value.dateFrom || undefined} />
        </div>
      )}

      <div className="relative min-w-[160px]">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input type="text" placeholder="Customer name…" value={customerInput} onChange={handleCustomerInput}
          className="input pl-8 py-2 text-sm w-full" />
      </div>

      <div className="relative min-w-[150px]">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input type="text" placeholder="Mobile number…" value={mobileInput} onChange={handleMobileInput}
          className="input pl-8 py-2 text-sm w-full" />
      </div>
    </div>
  );
}
