'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { bookingApi, userApi, authApi, patientApi, couponApi, settingApi, labHolidayApi, testAvailabilityApi } from '@/lib/api';
import BookingAnimation from '@/components/booking/BookingAnimation';
import PatientFormModal from '@/components/patient/PatientFormModal';
import { getErrorMessage } from '@/utils/helpers';
import {
  FiTrash2, FiShoppingCart, FiMapPin, FiArrowLeft,
  FiCheckCircle, FiAlertCircle, FiLoader, FiSearch, FiPlus, FiUser, FiChevronDown,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

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

  // Parse slot start — e.g. '06:00 AM – 07:00 AM' → '06:00 AM'
  const startStr = slot.split('–')[0].trim();
  const [timePart, period] = startStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const slotMinutes = hours * 60 + minutes;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= currentMinutes; // disable if start time already passed
}

function TimeSlotPicker({ value, onChange, slotDate }) {
  // Clear selected slot if it has become past (e.g. date changed to today)
  useEffect(() => {
    if (value && isSlotPast(value, slotDate)) {
      onChange('');
    }
  }, [slotDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium text-gray-700">
        Preferred Time <span className="text-red-500">*</span>
      </label>

      {SLOT_GROUPS.map(({ label, emoji, color, slots }) => (
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
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function DateSelectPicker({ value, onChange, minDate, maxDate, blockedDates = [] }) {
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');

  // Sync inbound value (YYYY-MM-DD) → selects
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYyyy(y); setMm(m); setDd(d);
    } else {
      setYyyy(''); setMm(''); setDd('');
    }
  }, [value]);

  // If the lab's holiday list loads (or changes) after a date was already picked,
  // and that date is now blocked, clear the selection so it can't be submitted.
  useEffect(() => {
    if (value && blockedDates.includes(value)) onChange('');
  }, [blockedDates]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Year options: today's year bounded by maxDate's year
  const nowYear = new Date().getFullYear();
  const yearOpts = [nowYear, nowYear + 1, nowYear + 2].filter((y) => y <= maxY);

  // Month options: filter past months if year == minYear, future months if year == maxYear
  const monthOpts = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => {
    if (Number(yyyy) === minY && m < minM) return false;
    if (Number(yyyy) === maxY && m > maxM) return false;
    return true;
  });

  // Day options: filter by month length, past days (min), and future days (max)
  const daysInMonth = yyyy && mm ? new Date(Number(yyyy), Number(mm), 0).getDate() : 31;
  const blockedSet = new Set(blockedDates);
  const dayOpts = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => {
    if (Number(yyyy) === minY && Number(mm) === minM && d < minD) return false;
    if (Number(yyyy) === maxY && Number(mm) === maxM && d > maxD) return false;
    if (yyyy && mm && blockedSet.has(`${yyyy}-${mm}-${String(d).padStart(2, '0')}`)) return false;
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
      {/* Day */}
      <div className="relative">
        <select value={dd} onChange={(e) => handleDay(e.target.value)} className={sel}>
          <option value="">DD</option>
          {dayOpts.map((d) => (
            <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
      {/* Month */}
      <div className="relative">
        <select value={mm} onChange={(e) => handleMonth(e.target.value)} className={sel}>
          <option value="">MM</option>
          {monthOpts.map((m) => (
            <option key={m} value={String(m).padStart(2, '0')}>{MONTHS[m - 1]}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
      {/* Year */}
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

const TYPE_COLOR = {
  test:     'bg-blue-50 text-blue-700 border-blue-100',
  package:  'bg-purple-50 text-purple-700 border-purple-100',
  medicine: 'bg-teal-50 text-teal-700 border-teal-100',
};

// ── "Booking for" multi-select ──────────────────────────────────────────────────
// A test can be booked for more than one person at once — checking multiple patients
// here means this same test line becomes a separate booking per person selected.
function BookingForPicker({ patients, selectedIds, onToggle, onAddNew }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = patients.filter((p) => selectedIds.includes(p._id));
  const label = selected.length === 0
    ? 'Select patient'
    : selected.length === 1
      ? (selected[0].relation === 'self' ? `${selected[0].name} (You)` : selected[0].name)
      : `${selected[0].relation === 'self' ? `${selected[0].name} (You)` : selected[0].name} +${selected.length - 1} more`;

  return (
    <div className="relative mt-3" ref={ref}>
      <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg pl-3 pr-2 py-2">
        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
          <FiUser className="text-white text-[10px]" />
        </div>
        <span className="text-xs font-semibold text-yellow-800 shrink-0">Booking for</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 flex items-center justify-between gap-1 text-sm font-semibold text-yellow-900 bg-white border border-yellow-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <span className="truncate">{label}</span>
          <FiChevronDown className={`text-yellow-600 text-xs shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {patients.map((p) => {
            const checked = selectedIds.includes(p._id);
            return (
              <label key={p._id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(p._id)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                />
                <span className="text-gray-800">{p.relation === 'self' ? `${p.name} (You)` : p.name}</span>
              </label>
            );
          })}
          <button
            type="button"
            onClick={() => { setOpen(false); onAddNew(); }}
            className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 border-t border-gray-100 mt-1"
          >
            + Add family member...
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cart item card ────────────────────────────────────────────────────────────
function CartItem({ item, onRemove, patients, selectedPatientIds, onPatientToggle, onAddPatient }) {
  const lab = item.lab || {};
  const price = item.salePrice || item.price;
  const discount = item.salePrice && item.salePrice < item.price
    ? Math.round(((item.price - item.salePrice) / item.price) * 100)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1.5 mb-1">
          {item.type && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${TYPE_COLOR[item.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              {item.type}
            </span>
          )}
          {item.sampleType && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-medium">
              {item.sampleType}
            </span>
          )}
          {item.fastingRequired && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-medium">
              Fasting Required
            </span>
          )}
        </div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
          {lab.name && <span className="font-medium text-gray-600">{lab.name}</span>}
          {item.reportTime && <span>· Report in {item.reportTime}</span>}
          {(lab.city) && (
            <span className="flex items-center gap-0.5">
              · <FiMapPin className="text-[10px]" /> {lab.city}
            </span>
          )}
        </div>
        {patients && patients.length > 0 && (
          <BookingForPicker
            patients={patients}
            selectedIds={selectedPatientIds}
            onToggle={(patientId) => onPatientToggle(item.cartItemId, patientId)}
            onAddNew={() => onAddPatient(item.cartItemId)}
          />
        )}
      </div>
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <button onClick={() => onRemove(item.cartItemId)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
          <FiTrash2 className="text-base" />
        </button>
        <div className="text-right">
          {discount && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
              {discount}% OFF
            </span>
          )}
          <p className="text-base font-extrabold text-gray-900">₹{price?.toLocaleString('en-IN')}</p>
          {discount && (
            <p className="text-[11px] text-gray-400 line-through">₹{item.price?.toLocaleString('en-IN')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pincode validator ─────────────────────────────────────────────────────────
function PincodeField({ pincode, onChange, groups, onValidated }) {
  const [status, setStatus] = useState('idle'); // idle | loading | valid | invalid
  const [city, setCity] = useState('');
  const [unavailableLabs, setUnavailableLabs] = useState([]);

  useEffect(() => {
    if (pincode.length !== 6) { setStatus('idle'); setCity(''); setUnavailableLabs([]); onValidated(false); return; }
    setStatus('loading');
    fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data[0]?.Status !== 'Success') { setStatus('invalid'); onValidated(false); return; }
        const po = data[0].PostOffice?.[0];
        const detectedCity = po?.District || po?.Block || po?.Name || '';
        setCity(detectedCity);

        // Check each lab's city against detected city
        const unavailable = groups.filter((g) => {
          const labCity = (g.items[0]?.lab?.city || '').toLowerCase();
          return !labCity.includes(detectedCity.toLowerCase()) &&
                 !detectedCity.toLowerCase().includes(labCity);
        }).map((g) => g.labName);

        setUnavailableLabs(unavailable);
        setStatus(unavailable.length === 0 ? 'valid' : 'warning');
        onValidated(unavailable.length === 0);
      })
      .catch(() => { setStatus('invalid'); onValidated(false); });
  }, [pincode]);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Pincode <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          value={pincode}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="input text-sm pr-8"
          placeholder="e.g. 226001"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">
          {status === 'loading' && <FiLoader className="animate-spin text-gray-400" />}
          {status === 'valid'   && <FiCheckCircle className="text-green-500" />}
          {(status === 'invalid' || status === 'warning') && <FiAlertCircle className="text-red-400" />}
        </span>
      </div>
      {status === 'valid' && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <FiCheckCircle size={11} /> {city} — all labs available in this area
        </p>
      )}
      {status === 'warning' && unavailableLabs.length > 0 && (
        <p className="text-xs text-red-500 mt-1">
          ⚠ {unavailableLabs.join(', ')} {unavailableLabs.length > 1 ? 'do' : 'does'} not serve {city}. Remove them or change pincode.
        </p>
      )}
      {status === 'invalid' && (
        <p className="text-xs text-red-500 mt-1">Invalid pincode. Please check.</p>
      )}
    </div>
  );
}

// ── Booking form ──────────────────────────────────────────────────────────────
const FORM_KEY = (uid) => `cart_form_${uid || 'guest'}`;
const DEFAULT_FORM = {
  patientName: '', patientAge: '', patientGender: 'male',
  phone: '', email: '', slotDate: '', slotTime: '',
  visitType: 'lab',
  addressLine1: '', addressArea: '', addressCity: '', addressState: '', addressPincode: '',
};

function BookingForm({ groups, onReadyForPayment }) {
  const router = useRouter();
  const { user, refreshUser, login } = useAuth();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [pincodeValid, setPincodeValid] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);
  const [unavailableToday, setUnavailableToday] = useState(null); // { product, reason } | null
  const [alternatives, setAlternatives] = useState([]);

  const labId = groups[0]?.labId;
  // `groups` here is lab-only (see displayGroups in CartPage) — flatten across all of
  // them for the rare case of more than one, rather than assuming there's exactly one.
  const allGroupItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const cartTestMasterIds = useMemo(
    () => [...new Set(allGroupItems.map((i) => i.testMaster?._id || i.testMaster).filter(Boolean))],
    [allGroupItems]
  );

  useEffect(() => {
    if (!labId) { setBlockedDates([]); return; }
    Promise.all([
      labHolidayApi.getBlockedDates(labId, 30).then((res) => res.data.blockedDates || []).catch(() => []),
      ...cartTestMasterIds.map((tm) =>
        testAvailabilityApi.getUnavailableDates({ testMaster: tm, lab: labId, days: 30 })
          .then((res) => res.data.unavailableDates || []).catch(() => [])
      ),
    ]).then((lists) => setBlockedDates([...new Set(lists.flat())]));
  }, [labId, cartTestMasterIds]);

  // Live-check the selected date against every test in the cart — a rule created
  // after blockedDates was fetched (or one keyed off a scope the picker doesn't
  // pre-list) can still slip through, so this is the last line of UX defense before
  // the server-side booking validation would reject it anyway.
  useEffect(() => {
    setUnavailableToday(null);
    setAlternatives([]);
    if (!labId || !form.slotDate || !cartTestMasterIds.length) return;
    let cancelled = false;
    (async () => {
      for (const item of allGroupItems) {
        const tm = item.testMaster?._id || item.testMaster;
        if (!tm) continue;
        try {
          const res = await testAvailabilityApi.check({ testMaster: tm, lab: labId, date: form.slotDate });
          if (cancelled) return;
          if (!res.data.available) {
            setUnavailableToday({ product: item.name, reason: res.data.reason });
            testAvailabilityApi.getAlternatives({
              testMaster: tm, lab: labId, date: form.slotDate, city: item.lab?.city,
            }).then((r) => { if (!cancelled) setAlternatives(r.data.alternatives || []); }).catch(() => {});
            return;
          }
        } catch { /* non-blocking UX check */ }
      }
    })();
    return () => { cancelled = true; };
  }, [labId, form.slotDate, cartTestMasterIds, groups]);

  // Load saved form — works for both guests and logged-in users
  useEffect(() => {
    if (initialized) return;
    let saved = {};
    try {
      // For logged-in users: try user-specific key first, then fall back to guest key
      const userKey = user ? FORM_KEY(user._id) : 'cart_form_guest';
      saved = JSON.parse(sessionStorage.getItem(userKey) || '{}');
      if (user && !Object.keys(saved).length) {
        saved = JSON.parse(sessionStorage.getItem('cart_form_guest') || '{}');
        if (Object.keys(saved).length) sessionStorage.removeItem('cart_form_guest');
      }
    } catch {}

    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    // If saved date is in the past, reset to today
    const savedDate = saved.slotDate && saved.slotDate >= todayStr ? saved.slotDate : todayStr;

    const firstAddr = user?.addresses?.[0];
    setForm({
      ...DEFAULT_FORM,
      ...saved,
      slotDate: savedDate,
      ...(user ? {
        patientName: saved.patientName || user.name || '',
        phone: user.mobile || saved.phone || '',
        email: user.email || saved.email || '',
        addressLine1: saved.addressLine1 || firstAddr?.line1 || '',
        addressArea: saved.addressArea || firstAddr?.area || '',
        addressCity: saved.addressCity || firstAddr?.city || '',
        addressState: saved.addressState || firstAddr?.state || '',
        addressPincode: saved.addressPincode || firstAddr?.pincode || '',
      } : {}),
    });
    setInitialized(true);
  }, [user, initialized]);

  // Persist form on every change (guests use 'cart_form_guest' key)
  useEffect(() => {
    if (!initialized) return;
    const key = user ? FORM_KEY(user._id) : 'cart_form_guest';
    try { sessionStorage.setItem(key, JSON.stringify(form)); } catch {}
  }, [form, user, initialized]);

  const F = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const _td = new Date();
  const today = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
  const _maxD = new Date(_td); _maxD.setDate(_maxD.getDate() + 30);
  const maxBookingDate = `${_maxD.getFullYear()}-${String(_maxD.getMonth()+1).padStart(2,'0')}-${String(_maxD.getDate()).padStart(2,'0')}`;
  const hasHome = groups.some((g) => g.items[0]?.lab?.homeCollection || g.items.some((i) => i.homeCollection));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (unavailableToday) {
      toast.error(`"${unavailableToday.product}" is not available on the selected date. Please choose another date.`); return;
    }
    if (!form.slotDate) { toast.error('Please select a date for your booking.'); return; }
    if (!form.slotTime) { toast.error('Please select a preferred time slot.'); return; }
    const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(com|co\.in|co|in|net|info|ai)$/i;
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error('Please enter a valid 10-digit mobile number starting with 6–9.'); return;
    }
    if (form.email && !EMAIL_RE.test(form.email)) {
      toast.error('Please enter a valid email address.'); return;
    }
    if (form.visitType === 'home' && !form.addressPincode) { toast.error('Please enter pincode for home collection'); return; }
    if (form.visitType === 'home' && !/^\d{6}$/.test(form.addressPincode)) { toast.error('Please enter a valid 6-digit pincode'); return; }

    setSubmitting(true);

    // Auto-register guest and log them in before payment
    let activeUser = user;
    if (!activeUser) {
      if (!form.email) {
        toast.error('Please enter your email to create an account and confirm booking.');
        setSubmitting(false);
        return;
      }
      try {
        const res = await authApi.autoRegister({
          name: form.patientName,
          email: form.email,
          mobile: form.phone,
          gender: form.patientGender,
        });
        login(res.data.token, res.data.user);
        activeUser = res.data.user;
        toast.success(`Account created! Check ${form.email} for your login credentials.`, { duration: 5000 });
      } catch (err) {
        const msg = err?.response?.data?.message || '';
        if (err?.response?.status === 409) {
          toast.error('An account with this email already exists. Please login first.');
          router.push(`/login?redirect=/cart`);
        } else {
          toast.error(msg || 'Could not create account. Please try again.');
        }
        setSubmitting(false);
        return;
      }
    }

    // Save phone to profile if not already set
    if (!activeUser.mobile && form.phone) {
      try {
        await userApi.updateMe({ mobile: form.phone });
        await refreshUser();
      } catch {}
    }

    // Clear persisted form
    try {
      sessionStorage.removeItem(FORM_KEY(activeUser._id || activeUser.id));
      sessionStorage.removeItem('cart_form_guest');
    } catch {}

    onReadyForPayment(form, activeUser);
    setSubmitting(false);
  };

  return (
    <form id="booking-form" onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 space-y-4">
      <h2 className="font-bold text-gray-800 text-base">Patient &amp; Slot Details</h2>

      {/* Phone missing warning */}
      {user && !user.mobile && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <FiAlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Your profile doesn&apos;t have a phone number. Please fill it below — it will be saved to your profile automatically.
          </p>
        </div>
      )}

      {/* Row 1: Name | Age (guests only — logged-in users pick who each test is for
          via the "Booking for" dropdown on each cart item instead) | Phone | Email */}
      <div className="grid grid-cols-2 gap-3">
        {!user && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Patient Name <span className="text-red-500">*</span></label>
              <input required value={form.patientName} onChange={F('patientName')} className="input text-sm" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Age <span className="text-red-500">*</span></label>
              <input required type="number" min="1" max="100" value={form.patientAge}
                onKeyDown={(e) => {
                  if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) || e.ctrlKey || e.metaKey) return;
                  if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
                  if (Number(e.target.value.slice(0, e.target.selectionStart) + e.key + e.target.value.slice(e.target.selectionEnd)) > 100) e.preventDefault();
                }}
                onChange={(e) => {
                  if (e.target.value === '' || Number(e.target.value) <= 100) F('patientAge')(e);
                }}
                className="input text-sm" placeholder="Age (1–100)" />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <span className="px-2 py-2.5 bg-gray-50 border-r border-gray-300 text-xs text-gray-500 font-medium">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              pattern="[6-9][0-9]{9}"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              className="flex-1 px-2 py-2.5 text-sm outline-none bg-transparent"
              placeholder="98765 43210"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
          <input required type="email" value={form.email} onChange={F('email')} className="input text-sm" placeholder="you@example.com" />
        </div>
      </div>

      {/* Row 2: Gender (guests only) | Visit Type | Pincode | Date — stacks to 1 column
          on mobile; at grid-cols-2 the Date field only got half the row, leaving each
          DD/MM/YYYY select in DateSelectPicker too narrow and clipping the year text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!user && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
            <select value={form.patientGender} onChange={F('patientGender')} className="input text-sm">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Visit Type</label>
          <select value={form.visitType} onChange={F('visitType')} className="input text-sm">
            <option value="lab">Visit Lab</option>
            {hasHome && <option value="home">Home Collection</option>}
          </select>
        </div>
        {form.visitType === 'home' && (
          <div>
            <PincodeField
              pincode={form.addressPincode}
              onChange={(v) => setForm((f) => ({ ...f, addressPincode: v }))}
              groups={groups}
              onValidated={setPincodeValid}
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Date <span className="text-red-500">*</span></label>
          <DateSelectPicker
            value={form.slotDate}
            onChange={(v) => setForm((f) => ({ ...f, slotDate: v }))}
            minDate={today}
            maxDate={maxBookingDate}
            blockedDates={blockedDates}
          />
          {blockedDates.length >= 30 ? (
            <p className="text-[11px] text-red-600 mt-1 font-medium">
              No diagnostic centers are available on the selected date. Please choose another date.
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 mt-1">Bookings can be scheduled up to 30 days in advance</p>
          )}
        </div>
      </div>

      {unavailableToday && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
          <p className="text-sm text-red-700 font-medium">
            &quot;{unavailableToday.product}&quot; is not available at this lab on the selected date{unavailableToday.reason ? ` (${unavailableToday.reason})` : ''}. Please pick another date.
          </p>
          {alternatives.length > 0 && (
            <div>
              <p className="text-xs text-red-600 mb-1.5">This test is available at nearby labs instead:</p>
              <div className="flex flex-wrap gap-2">
                {alternatives.map((a) => (
                  <span key={a.lab._id} className="text-xs bg-white border border-red-200 rounded-lg px-2.5 py-1.5 text-gray-700">
                    {a.lab.name} — {a.lab.city}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 3: Time slot picker (full width) */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <TimeSlotPicker
          value={form.slotTime}
          onChange={(v) => setForm((f) => ({ ...f, slotTime: v }))}
          slotDate={form.slotDate}
        />
        {/* hidden required field so form validation still works */}
        <input
          type="text"
          required
          value={form.slotTime}
          readOnly
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Address for home collection */}
      {form.visitType === 'home' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-700">Collection Address <span className="text-red-500">*</span></p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Street / Flat No.</label>
            <input required value={form.addressLine1} onChange={F('addressLine1')} className="input text-sm" placeholder="e.g. Flat 12, MG Road" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Area / Locality</label>
            <input value={form.addressArea} onChange={F('addressArea')} className="input text-sm" placeholder="e.g. Gomti Nagar" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input required value={form.addressCity} onChange={F('addressCity')} className="input text-sm" placeholder="Lucknow" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <input value={form.addressState} onChange={F('addressState')} className="input text-sm" placeholder="Uttar Pradesh" />
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
          <FiAlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            No account? No problem — we&apos;ll create one for you automatically and send your login credentials to your email.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !!unavailableToday}
        className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold text-sm transition-colors mt-2"
      >
        {submitting
          ? (user ? 'Checking details…' : 'Creating account…')
          : 'Proceed to Payment →'}
      </button>
    </form>
  );
}

// ── Add More Tests mini search bar ───────────────────────────────────────────
function AddMoreSearch({ cartCity }) {
  const router = useRouter();
  const [addQuery, setAddQuery] = useState('');
  const inputRef = useRef(null);

  const go = () => {
    const trimmed = addQuery.trim();
    if (!trimmed) return;
    const params = new URLSearchParams();
    params.set('test', trimmed);
    if (cartCity) params.set('city', cartCity);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2.5 mb-4">
      <FiPlus className="text-primary-500 shrink-0" size={15} />
      <span className="text-xs font-semibold text-primary-700 shrink-0">Add another test:</span>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={addQuery}
          onChange={(e) => setAddQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          placeholder="Type test name and press Enter…"
          className="w-full text-sm border border-primary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        />
      </div>
      <button
        type="button"
        onClick={go}
        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shrink-0"
      >
        <FiSearch size={12} /> Search
      </button>
    </div>
  );
}

// ── Payment Screen ────────────────────────────────────────────────────────────
const BANKS = [
  'State Bank of India','HDFC Bank','ICICI Bank','Axis Bank',
  'Kotak Mahindra Bank','Bank of Baroda','Punjab National Bank',
  'Yes Bank','IndusInd Bank','Federal Bank',
];

function PaymentScreen({ form, groups, total, couponCode, onSuccess, onBack }) {
  const [payTab, setPayTab] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [cardName, setCardName] = useState(form.patientName || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bank, setBank] = useState('');
  const [processing, setProcessing] = useState(false);

  const labName = groups[0]?.labName || 'Lab';
  const itemCount = groups.reduce((s, g) => s + g.items.length, 0);
  const slotLabel = form.slotDate
    ? new Date(form.slotDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExpiry = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length >= 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  const hasSlot = !!form.slotDate && !!form.slotTime;
  const canPay = hasSlot && (
    payTab === 'upi'        ? upiId.includes('@')
    : payTab === 'card'       ? cardNo.replace(/\s/g,'').length === 16 && cardExpiry.length === 5 && cardCvv.length === 3
    : /* netbanking */          !!bank
  );

  const handlePay = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2200));
    try {
      // Groups computed before login (guest checkout) carry the 'self' placeholder
      // instead of a real Patient ID — resolve it once now that the account exists
      // (BookingForm's handleSubmit already auto-registered + logged in by this point).
      let selfPatientId = null;
      if (groups.some((g) => g.patientId === 'self')) {
        const res = await patientApi.getMine();
        const self = (res.data.items || []).find((p) => p.relation === 'self');
        selfPatientId = self?._id || null;
        if (selfPatientId && (form.patientAge || form.patientGender)) {
          patientApi.update(selfPatientId, {
            age: form.patientAge ? Number(form.patientAge) : undefined,
            gender: form.patientGender,
          }).catch(() => {});
        }
      }

      const created = [];
      for (const group of groups) {
        const subtotal = group.items.reduce((s, i) => s + (i.salePrice || i.price), 0);
        const res = await bookingApi.create({
          lab: group.labId,
          items: group.items.map((i) => ({ product: i._id, name: i.name, qty: 1, price: i.salePrice || i.price })),
          patient: group.patientId === 'self' ? selfPatientId : group.patientId,
          slotDate: form.slotDate,
          slotTime: form.slotTime,
          visitType: form.visitType,
          address: form.visitType === 'home'
            ? { line1: form.addressLine1, area: form.addressArea, city: form.addressCity, state: form.addressState, pincode: form.addressPincode }
            : undefined,
          subtotal,
          total: subtotal,
          coupon: couponCode || undefined,
          paymentMethod: 'online',
          paymentStatus: 'paid',
          status: 'confirmed',
        });
        created.push(res.data);
      }
      onSuccess(created);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setProcessing(false);
    }
  };

  if (processing) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary-600 animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">💳</span>
      </div>
      <p className="text-lg font-bold text-gray-800 mb-1">Processing Payment…</p>
      <p className="text-sm text-gray-400">Please wait, do not close this page</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-primary-600 text-sm font-medium mb-5 transition-colors">
        <FiArrowLeft /> Back to cart
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-700 to-primary-600 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-primary-200 text-xs font-medium mb-0.5">Complete your booking</p>
              <p className="text-white font-bold text-base leading-tight truncate">{labName}</p>
              <p className="text-primary-300 text-xs mt-1">
                {itemCount} test{itemCount !== 1 ? 's' : ''}{slotLabel ? ` · ${slotLabel}` : ''}{form.slotTime ? ` · ${form.slotTime}` : ''}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-primary-300 text-xs">Total</p>
              <p className="text-white font-extrabold text-2xl">₹{total.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Demo notice */}
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 flex items-center gap-2">
          <span className="text-xs font-bold text-amber-700">⚡ DEMO MODE</span>
          <span className="text-xs text-amber-600">— No real payment will be charged</span>
        </div>

        {/* Payment method tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'upi',        label: 'UPI',         emoji: '📱' },
            { id: 'card',       label: 'Card',        emoji: '💳' },
            { id: 'netbanking', label: 'Net Banking',  emoji: '🏦' },
          ].map(({ id, label, emoji }) => (
            <button key={id} onClick={() => setPayTab(id)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 ${
                payTab === id
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/30'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              <span className="text-base">{emoji}</span>{label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* UPI Tab */}
          {payTab === 'upi' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Enter UPI ID</label>
              <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@paytm / @gpay / @upi"
                className="input text-sm w-full" />
              <p className="text-xs text-gray-400 mt-1.5">e.g. 9876543210@paytm · name@okaxis · user@gpay</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {['PhonePe','GPay','Paytm','BHIM'].map((app) => (
                  <button key={app} type="button" onClick={() => setUpiId(`demo@${app.toLowerCase()}`)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 font-medium text-gray-600 transition-colors">
                    {app}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card Tab */}
          {payTab === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Card Number</label>
                <input type="text" inputMode="numeric" value={cardNo}
                  onChange={(e) => setCardNo(fmtCard(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  className="input text-sm font-mono tracking-widest" maxLength={19} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name on Card</label>
                <input type="text" value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="YOUR NAME"
                  className="input text-sm tracking-wide uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Expiry</label>
                  <input type="text" inputMode="numeric" value={cardExpiry}
                    onChange={(e) => setCardExpiry(fmtExpiry(e.target.value))}
                    placeholder="MM / YY" className="input text-sm" maxLength={5} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">CVV</label>
                  <input type="password" inputMode="numeric" value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g,'').slice(0,3))}
                    placeholder="•••" className="input text-sm" maxLength={3} />
                </div>
              </div>
            </div>
          )}

          {/* Net Banking Tab */}
          {payTab === 'netbanking' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Select your bank</label>
              <select value={bank} onChange={(e) => setBank(e.target.value)} className="input text-sm">
                <option value="">— Choose your bank —</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          {/* Pay button */}
          <button onClick={handlePay} disabled={!canPay}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-sm ${
              canPay
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-200 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            🔒 Pay ₹{total.toLocaleString('en-IN')}
          </button>

          <p className="text-center text-[11px] text-gray-400">
            256-bit SSL encrypted &nbsp;·&nbsp; Demo mode — no real payment
          </p>
        </div>
      </div>

      {/* Accepted methods */}
      <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
        {['Visa','Mastercard','RuPay','UPI','Net Banking'].map((m) => (
          <span key={m} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded font-medium">{m}</span>
        ))}
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ bookings }) {
  const router = useRouter();
  const first = bookings[0] || {};
  const warnings = first.warnings || [];
  const slotDate = first.slotDate
    ? new Date(first.slotDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="text-center py-10 max-w-lg mx-auto">
      {/* Animated check */}
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5"
        style={{ animation: 'bounceIn 0.5s ease' }}>
        <FiCheckCircle className="text-green-500" size={48} />
      </div>
      <style>{`@keyframes bounceIn{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}`}</style>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Booking Confirmed! 🎉</h1>
      <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
        Your lab test is booked and confirmed. We&apos;ll send you a reminder before your appointment.
      </p>

      {/* Warning banners */}
      {warnings.includes('lateNight') && (
        <div className="mb-4 text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start">
          <span className="text-xl shrink-0">🌙</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Important Notice</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Note: If the diagnostic center is closed or opens late, please cooperate. Our team will coordinate with the diagnostic center and inform you of any schedule changes if required.
            </p>
          </div>
        </div>
      )}
      {warnings.includes('shortNotice') && (
        <div className="mb-4 text-left bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-3 items-start">
          <span className="text-xl shrink-0">⏰</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Important Notice</p>
            <p className="text-xs text-red-700 mt-0.5">
              Please check with the diagnostic center/lab regarding appointment availability before visiting.
            </p>
          </div>
        </div>
      )}

      {/* Booking cards */}
      <div className="space-y-4 mb-8 text-left">
        {bookings.map((booking, i) => (
          <div key={booking._id || i} className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-green-500 px-5 py-3 flex items-center justify-between">
              <span className="text-white font-bold text-sm tracking-wide">{booking.bookingNo}</span>
              <span className="text-[11px] bg-white/25 text-white px-2.5 py-0.5 rounded-full font-semibold">
                ✓ Confirmed
              </span>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {[
                { label: 'Lab',     value: booking.lab?.name || 'Lab' },
                booking.lab?.address && { label: 'Address', value: [booking.lab.address, booking.lab.city].filter(Boolean).join(', ') },
                (booking.lab?.publicPhone || booking.lab?.phone) && { label: 'Lab Phone', value: booking.lab.publicPhone || booking.lab.phone },
                { label: 'Date',    value: slotDate },
                { label: 'Time',    value: booking.slotTime || '—' },
                { label: 'Visit',   value: booking.visitType === 'home' ? 'Home Collection' : 'Visit Lab' },
                { label: 'Paid',    value: `₹${(booking.total || 0).toLocaleString('en-IN')}`, green: true },
              ].filter(Boolean).map(({ label, value, green }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 text-xs uppercase tracking-wide font-medium">{label}</span>
                  <span className={`font-semibold ${green ? 'text-green-600' : 'text-gray-800'}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={() => router.push('/dashboard/bookings')}
          className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
          View My Bookings
        </button>
        <button onClick={() => router.push('/')}
          className="px-8 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          Back to Home
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, removeItem, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState('cart'); // 'cart' | 'payment' | 'success'

  // Each step swaps in a whole new screen on the same URL (no navigation), so the
  // browser keeps whatever scroll offset the user was at on the previous screen —
  // e.g. payment used to open mid-page if the booking form had been scrolled down.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const [paymentMeta, setPaymentMeta] = useState(null); // { form, activeUser }
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [animConfig, setAnimConfig] = useState(null);   // null = not loaded
  const [showAnim, setShowAnim] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);

  // Who each cart item is being booked for — one or more saved Patients (self and/or
  // family members). Selecting more than one for a test books it once per selected
  // person. Guests (not logged in) never have a patients list yet, so every item
  // silently falls back to the 'self' placeholder, resolved into a real Patient right
  // after their account is auto-created during checkout (see PaymentScreen.handlePay).
  const [patients, setPatients] = useState([]);
  const [itemPatients, setItemPatients] = useState({}); // item.cartItemId -> patientId[]
  const [patientModalItemId, setPatientModalItemId] = useState(null);

  // Coupon — validated against the current cart total for a preview; the actual
  // discount is always recomputed (and enforced) server-side per booking at checkout,
  // this just gives the customer an accurate estimate and clear error messages upfront.
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, message }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (!user) { setPatients([]); return; }
    patientApi.getMine().then((res) => setPatients(res.data.items || [])).catch(() => {});
  }, [user]);

  const selfPatient = patients.find((p) => p.relation === 'self');

  // Persist "who's this test for" selections across navigation — without this, leaving
  // /cart (e.g. to search for another test) and coming back wiped every manual
  // multi-select choice back to the "self" default, which is exactly the frustrating
  // bug that was reported: pick Umesh + Praveen for a test, go add another test, come
  // back, and it's silently back to just Self.
  const ITEM_PATIENTS_KEY = `dh_cart_patients_${user?._id || 'guest'}`;
  const itemPatientsLoaded = useRef(false);
  useEffect(() => {
    itemPatientsLoaded.current = false;
    try {
      const raw = localStorage.getItem(ITEM_PATIENTS_KEY);
      if (raw) setItemPatients(JSON.parse(raw));
    } catch {}
    itemPatientsLoaded.current = true;
  }, [ITEM_PATIENTS_KEY]);

  useEffect(() => {
    if (!itemPatientsLoaded.current) return;
    try { localStorage.setItem(ITEM_PATIENTS_KEY, JSON.stringify(itemPatients)); } catch {}
  }, [itemPatients, ITEM_PATIENTS_KEY]);

  // Default every cart item to "self" once the patients list (or a new item) shows up
  useEffect(() => {
    if (!selfPatient) return;
    setItemPatients((prev) => {
      let changed = false;
      const next = { ...prev };
      items.forEach((i) => { if (!next[i.cartItemId]?.length) { next[i.cartItemId] = [selfPatient._id]; changed = true; } });
      return changed ? next : prev;
    });
  }, [selfPatient, items]);

  // Toggling a patient off when they're the only one selected is a no-op — a test
  // must always be booked for at least one person.
  const handlePatientToggle = (itemId, patientId) => {
    setItemPatients((prev) => {
      const current = prev[itemId] || [];
      const next = current.includes(patientId)
        ? (current.length > 1 ? current.filter((id) => id !== patientId) : current)
        : [...current, patientId];
      return { ...prev, [itemId]: next };
    });
  };

  // Load animation config once on mount
  useEffect(() => {
    settingApi.getPublic('booking_animation')
      .then((res) => setAnimConfig(res.data.value || { enabled: false }))
      .catch(() => setAnimConfig({ enabled: false }));
  }, []);

  const handleReadyForPayment = (form, activeUser) => {
    if (animConfig?.enabled) {
      // Save the payload and show animation first
      setPendingPayment({ form, activeUser });
      setShowAnim(true);
    } else {
      setPaymentMeta({ form, activeUser });
      setStep('payment');
    }
  };

  // Called when animation finishes
  const handleAnimDone = () => {
    setShowAnim(false);
    if (pendingPayment) {
      setPaymentMeta(pendingPayment);
      setPendingPayment(null);
      setStep('payment');
    }
  };

  const handlePaymentSuccess = (bookings) => {
    clearCart();
    setConfirmedBookings(bookings);
    setStep('success');
  };

  const isRestricted = user && (user.role === 'superadmin' || user.role === 'subadmin' || user.role === 'lab');

  // Only one lab is allowed per checkout (see the gate below) — `distinctLabIds`
  // drives that. What the customer SEES is grouped by lab only (`displayGroups`) so a
  // test picked for 2 patients still shows as one card with its "Booking for +1 more"
  // picker, not duplicated. What actually gets BOOKED is a separate concern — a test
  // picked for N patients becomes N bookings, computed as `bookingGroups` (lab +
  // patient) only for PaymentScreen to iterate when calling bookingApi.create.
  const distinctLabIds = [...new Set(items.map((i) => String(i.lab?._id || i.lab || 'unknown')))];
  const displayGroups = Object.values(
    items.reduce((acc, item) => {
      const labId = item.lab?._id || item.lab || 'unknown';
      if (!acc[labId]) acc[labId] = { labId, labName: item.lab?.name || 'Unknown Lab', items: [] };
      acc[labId].items.push(item);
      return acc;
    }, {})
  );
  const bookingGroups = Object.values(
    items.reduce((acc, item) => {
      const labId = item.lab?._id || item.lab || 'unknown';
      const patientIds = itemPatients[item.cartItemId]?.length ? itemPatients[item.cartItemId] : [selfPatient?._id || 'self'];
      // A test picked for more than one patient becomes one booking per patient —
      // the same cart line is deliberately pushed into more than one group here.
      patientIds.forEach((patientId) => {
        const key = `${labId}::${patientId}`;
        if (!acc[key]) {
          const p = patients.find((pp) => pp._id === patientId);
          acc[key] = { labId, patientId, labName: item.lab?.name || 'Unknown Lab', patientName: p?.name, items: [] };
        }
        acc[key].items.push(item);
      });
      return acc;
    }, {})
  );

  // Priced per booking, not per cart line — a test picked for 2 patients is charged
  // (and totalled) twice, since it becomes two separate bookings at checkout.
  const patientCount = (item) => itemPatients[item.cartItemId]?.length || 1;
  const total    = items.reduce((sum, i) => sum + (i.salePrice || i.price || 0) * patientCount(i), 0);
  const mrpTotal = items.reduce((sum, i) => sum + (i.price || 0) * patientCount(i), 0);
  const savings  = mrpTotal - total;
  const payable  = Math.max(0, total - (appliedCoupon?.discount || 0));

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await couponApi.validate({ code, subtotal: total });
      setAppliedCoupon({ code, discount: res.data.discount, message: res.data.message });
      toast.success(res.data.message);
    } catch (err) {
      setCouponError(getErrorMessage(err));
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  // Smart back URL — rebuild search from cart items (test names + city)
  const cartCity = items[0]?.lab?.city || '';
  const backUrl = useMemo(() => {
    if (items.length === 0) return '/search';
    const params = new URLSearchParams();
    const testNames = [...new Set(items.map((i) => i.name).filter(Boolean))];
    testNames.forEach((name) => params.append('test', name));
    if (cartCity) params.set('city', cartCity);
    return `/search?${params.toString()}`;
  }, [items, cartCity]);

  // ── Success screen ──
  if (step === 'success') {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <SuccessScreen bookings={confirmedBookings} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ── Payment screen ──
  if (step === 'payment' && paymentMeta) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <PaymentScreen
              form={paymentMeta.form}
              groups={bookingGroups}
              total={payable}
              couponCode={appliedCoupon?.code}
              onSuccess={handlePaymentSuccess}
              onBack={() => setStep('cart')}
            />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-20 px-4">
          <FiShoppingCart className="text-6xl text-gray-200 mb-4" />
          <h1 className="text-xl font-bold text-gray-700 mb-1">Your cart is empty</h1>
          <p className="text-sm text-gray-400 mb-6">Add tests from the search page to book them</p>
          <Link href="/search" className="btn-primary px-6 py-2.5 text-sm font-semibold rounded-xl">
            Search Tests
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      {showAnim && <BookingAnimation config={animConfig} onDone={handleAnimDone} />}
      {patientModalItemId && (
        <PatientFormModal
          onClose={() => setPatientModalItemId(null)}
          onSaved={(saved) => {
            setPatients((ps) => [...ps, saved]);
            setItemPatients((prev) => ({ ...prev, [patientModalItemId]: [...(prev[patientModalItemId] || []), saved._id] }));
          }}
        />
      )}
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href={backUrl} className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors font-medium text-sm" title="Back to search results">
                <FiArrowLeft className="text-base" />
                Back to Search
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
                <p className="text-sm text-gray-400">{items.length} test{items.length !== 1 ? 's' : ''} added</p>
              </div>
            </div>
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Clear all
            </button>
          </div>

          {/* TOP: Cart items (left) + Price summary (right, sticky) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-6">

            {/* LEFT: Cart items grouped by lab — each test shows once, regardless of
                how many patients it's booked for (that's what its own "Booking for"
                picker is for; splitting into per-patient bookings happens only at
                payment time via bookingGroups, not in what's displayed here) */}
            <div className="lg:col-span-2 space-y-6">
              {displayGroups.map((group) => (
                <div key={group.labId}>
                  {displayGroups.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <FiMapPin className="text-gray-400 text-sm" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{group.labName}</span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <CartItem
                        key={item.cartItemId}
                        item={item}
                        onRemove={removeItem}
                        patients={patients}
                        selectedPatientIds={itemPatients[item.cartItemId] || (selfPatient ? [selfPatient._id] : [])}
                        onPatientToggle={handlePatientToggle}
                        onAddPatient={setPatientModalItemId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: Booking + price summary, combined into one card (sticky) */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                {/* Booking Summary — who's getting what, so a cart with several people
                    and several tests each stays easy to scan at a glance */}
                {patients.length > 0 && bookingGroups.length > 0 && (
                  <>
                    <h2 className="font-bold text-gray-800 text-sm mb-4">Booking Summary</h2>
                    <div className="space-y-3 mb-5">
                      {bookingGroups.map((group) => {
                        const p = patients.find((pp) => pp._id === group.patientId);
                        const subtotal = group.items.reduce((s, i) => s + (i.salePrice || i.price || 0), 0);
                        return (
                          <div key={group.patientId} className="border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {p?.relation === 'self' ? `${p.name} (You)` : p?.name || group.patientName || 'Patient'}
                              </p>
                              <span className="text-[10px] text-gray-400 shrink-0">{group.items.length} test{group.items.length !== 1 ? 's' : ''}</span>
                            </div>
                            <ul className="space-y-1">
                              {group.items.map((item) => (
                                <li key={item.cartItemId} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                                  <span className="truncate">{item.name}</span>
                                  <span className="shrink-0 font-medium text-gray-700">₹{(item.salePrice || item.price)?.toLocaleString('en-IN')}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 text-xs font-semibold text-gray-800">
                              <span>Subtotal</span>
                              <span>₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-px bg-gray-100 mb-4" />
                  </>
                )}

                <h2 className="font-bold text-gray-800 text-sm mb-4">Price Summary</h2>

                {/* Coupon */}
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                    <div>
                      <p className="text-xs font-bold text-green-700">{appliedCoupon.code} applied</p>
                      <p className="text-[11px] text-green-600">You saved ₹{appliedCoupon.discount.toLocaleString('en-IN')}</p>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                        placeholder="Have a coupon code?"
                        className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-colors shrink-0"
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>MRP Total</span>
                    <span>₹{mrpTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount</span>
                      <span>- ₹{savings.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span>- ₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>₹{payable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {(savings > 0 || appliedCoupon) && (
                  <p className="mt-3 text-xs text-green-600 font-medium bg-green-50 rounded-lg px-3 py-2 text-center">
                    You save ₹{(savings + (appliedCoupon?.discount || 0)).toLocaleString('en-IN')} on this order!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM: Patient & Slot form — same width as cart items (lg:col-span-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {isRestricted ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <div className="text-3xl mb-3">🚫</div>
                  <p className="font-semibold text-amber-800 text-sm mb-1">
                    {user.role === 'lab' ? 'Lab accounts cannot place bookings' : 'Admin accounts cannot place bookings'}
                  </p>
                  <p className="text-xs text-amber-600">
                    Bookings can only be placed by patient/customer accounts.
                  </p>
                </div>
              ) : distinctLabIds.length > 1 ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl shrink-0">⚠️</div>
                    <div>
                      <p className="font-semibold text-red-800 text-sm">One lab at a time only</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        You have tests from {distinctLabIds.length} different labs. Please keep tests from only one lab to proceed with booking.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {distinctLabIds.map((labId) => {
                      const labItems = items.filter((i) => String(i.lab?._id || i.lab || 'unknown') === labId);
                      return (
                        <div key={labId} className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2.5">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{labItems[0]?.lab?.name || 'Unknown Lab'}</p>
                            <p className="text-xs text-gray-400">{labItems.length} test{labItems.length !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={() => labItems.forEach((i) => removeItem(i.cartItemId))}
                            className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors font-medium">
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <BookingForm
                    groups={displayGroups}
                    onReadyForPayment={handleReadyForPayment}
                  />
                  <p className="text-xs text-center text-gray-400">
                    By confirming, you agree to our terms &amp; conditions
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
