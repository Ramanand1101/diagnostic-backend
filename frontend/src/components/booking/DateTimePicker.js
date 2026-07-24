'use client';
import { useState, useEffect } from 'react';

// ── Time slot picker ──────────────────────────────────────────────────────────
const SLOT_GROUPS = [
  { label: 'Morning Slots (AM)',   emoji: '☀️',  color: 'text-amber-600',  slots: ['06:00 AM – 07:00 AM','07:00 AM – 08:00 AM','08:00 AM – 09:00 AM','09:00 AM – 10:00 AM','10:00 AM – 11:00 AM','11:00 AM – 12:00 PM'] },
  { label: 'Afternoon Slots (PM)', emoji: '🌤️', color: 'text-blue-600',   slots: ['12:00 PM – 01:00 PM','01:00 PM – 02:00 PM','02:00 PM – 03:00 PM','03:00 PM – 04:00 PM'] },
  { label: 'Evening Slots',        emoji: '🌙',  color: 'text-indigo-600', slots: ['04:00 PM – 05:00 PM','05:00 PM – 06:00 PM','06:00 PM – 07:00 PM','07:00 PM – 08:00 PM','08:00 PM – 09:00 PM'] },
];

// Returns true if the slot's start time has already passed (only for today's date)
function isSlotPast(slot, slotDate) {
  if (!slotDate) return false;
  const _d = new Date();
  const _today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
  if (slotDate !== _today) return false;

  const startStr = slot.split('–')[0].trim();
  const [timePart, period] = startStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const slotMinutes = hours * 60 + minutes;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= currentMinutes;
}

export function TimeSlotPicker({ value, onChange, slotDate, onlyMorning }) {
  useEffect(() => {
    if (value && isSlotPast(value, slotDate)) {
      onChange('');
    }
  }, [slotDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = onlyMorning ? SLOT_GROUPS.filter((g) => g.label.startsWith('Morning')) : SLOT_GROUPS;

  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium text-gray-700">
        Preferred Time <span className="text-red-500">*</span>
      </label>

      {groups.map(({ label, emoji, color, slots }) => (
        <div key={label}>
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${color} mb-2`}>
            <span>{emoji}</span> {label}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map((slot) => {
              const past = isSlotPast(slot, slotDate);
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={past}
                  onClick={() => onChange(slot)}
                  title={past ? 'This slot has already passed' : ''}
                  className={`text-xs px-2 py-2 rounded-lg border font-medium transition-all text-center leading-tight ${
                    past
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                      : value === slot
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {value && (
        <p className="text-xs text-primary-600 font-medium flex items-center gap-1">
          ✓ Selected: <span className="font-bold">{value}</span>
        </p>
      )}
    </div>
  );
}

// ── DD / MM / YYYY date picker ────────────────────────────────────────────────
export function DateSelectPicker({ value, onChange, minDate, maxDate }) {
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYyyy(y); setMm(m); setDd(d);
    } else {
      setYyyy(''); setMm(''); setDd('');
    }
  }, [value]);

  const emit = (newYyyy, newMm, newDd) => {
    if (newYyyy && newMm && newDd) {
      onChange(`${newYyyy}-${newMm}-${newDd}`);
    } else {
      onChange('');
    }
  };

  const min = minDate || '';
  const [minY, minM, minD] = min ? min.split('-').map(Number) : [0, 0, 0];
  const max = maxDate || '';
  const [maxY, maxM, maxD] = max ? max.split('-').map(Number) : [9999, 12, 31];

  const nowYear = new Date().getFullYear();
  // When a minDate is given (e.g. appointment scheduling, always today-forward), keep a tight
  // "next few years" list. Otherwise (e.g. agreement dates, which can be past or future) offer
  // a wide practical range.
  const yearOpts = minDate
    ? [nowYear, nowYear + 1, nowYear + 2].filter((y) => y <= maxY)
    : Array.from({ length: 21 }, (_, i) => nowYear - 10 + i).filter((y) => y >= minY && y <= maxY);

  const monthOpts = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => {
    if (Number(yyyy) === minY && m < minM) return false;
    if (Number(yyyy) === maxY && m > maxM) return false;
    return true;
  });

  const daysInMonth = yyyy && mm ? new Date(Number(yyyy), Number(mm), 0).getDate() : 31;
  const dayOpts = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => {
    if (Number(yyyy) === minY && Number(mm) === minM && d < minD) return false;
    if (Number(yyyy) === maxY && Number(mm) === maxM && d > maxD) return false;
    return true;
  });

  const handleYear = (v) => {
    setYyyy(v);
    let newMm = mm, newDd = dd;
    if (Number(v) === minY && Number(mm) < minM) { newMm = ''; newDd = ''; setMm(''); setDd(''); }
    if (Number(v) === minY && Number(mm) === minM && Number(dd) < minD) { newDd = ''; setDd(''); }
    if (Number(v) === maxY && Number(mm) > maxM) { newMm = ''; newDd = ''; setMm(''); setDd(''); }
    if (Number(v) === maxY && Number(mm) === maxM && Number(dd) > maxD) { newDd = ''; setDd(''); }
    emit(v, newMm, newDd);
  };
  const handleMonth = (v) => {
    setMm(v);
    let newDd = dd;
    const days = v && yyyy ? new Date(Number(yyyy), Number(v), 0).getDate() : 31;
    if (Number(dd) > days) { newDd = ''; setDd(''); }
    if (Number(yyyy) === minY && Number(v) === minM && Number(dd) < minD) { newDd = ''; setDd(''); }
    if (Number(yyyy) === maxY && Number(v) === maxM && Number(dd) > maxD) { newDd = ''; setDd(''); }
    emit(yyyy, v, newDd);
  };
  const handleDay = (v) => { setDd(v); emit(yyyy, mm, v); };

  const sel = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none cursor-pointer';

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="relative">
        <select value={dd} onChange={(e) => handleDay(e.target.value)} className={sel}>
          <option value="">DD</option>
          {dayOpts.map((d) => (
            <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
      <div className="relative">
        <select value={mm} onChange={(e) => handleMonth(e.target.value)} className={sel}>
          <option value="">MM</option>
          {monthOpts.map((m) => (
            <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
      <div className="relative">
        <select value={yyyy} onChange={(e) => handleYear(e.target.value)} className={sel}>
          <option value="">YYYY</option>
          {yearOpts.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
    </div>
  );
}
