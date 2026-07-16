'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { bookingApi, userApi, authApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import {
  FiTrash2, FiShoppingCart, FiMapPin, FiArrowLeft,
  FiCheckCircle, FiAlertCircle, FiLoader,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Time slot picker ──────────────────────────────────────────────────────────
const MORNING_SLOTS = [
  '06:00 AM – 07:00 AM', '07:00 AM – 08:00 AM', '08:00 AM – 09:00 AM',
  '09:00 AM – 10:00 AM', '10:00 AM – 11:00 AM', '11:00 AM – 12:00 PM',
];
const AFTERNOON_SLOTS = [
  '12:00 PM – 01:00 PM', '01:00 PM – 02:00 PM', '02:00 PM – 03:00 PM',
  '03:00 PM – 04:00 PM',
];
const EVENING_SLOTS = [
  '04:00 PM – 05:00 PM', '05:00 PM – 06:00 PM', '06:00 PM – 07:00 PM',
  '07:00 PM – 08:00 PM', '08:00 PM – 09:00 PM',
];

const SLOT_GROUPS = [
  { label: 'Morning Slots (AM)', emoji: '☀️', color: 'text-amber-600', slots: MORNING_SLOTS },
  { label: 'Afternoon Slots (PM)', emoji: '🌤️', color: 'text-blue-600', slots: AFTERNOON_SLOTS },
  { label: 'Evening Slots', emoji: '🌙', color: 'text-indigo-600', slots: EVENING_SLOTS },
];

// Returns true if the slot's start time has already passed (only for today's date)
function isSlotPast(slot, slotDate) {
  if (!slotDate) return false;
  const today = new Date().toISOString().split('T')[0];
  if (slotDate !== today) return false;

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

const TYPE_COLOR = {
  test:     'bg-blue-50 text-blue-700 border-blue-100',
  package:  'bg-purple-50 text-purple-700 border-purple-100',
  medicine: 'bg-teal-50 text-teal-700 border-teal-100',
};

// ── Cart item card ────────────────────────────────────────────────────────────
function CartItem({ item, onRemove }) {
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
      </div>
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <button onClick={() => onRemove(item._id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
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
  phone: '', email: '', pincode: '', slotDate: '', slotTime: '',
  visitType: 'lab', address: '',
};

function BookingForm({ groups, onSuccess, submitting, setSubmitting }) {
  const router = useRouter();
  const { user, refreshUser, login } = useAuth();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [pincodeValid, setPincodeValid] = useState(false);
  const [initialized, setInitialized] = useState(false);

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

    setForm({
      ...DEFAULT_FORM,
      ...saved,
      ...(user ? {
        patientName: saved.patientName || user.name || '',
        phone: user.mobile || saved.phone || '',
        email: user.email || saved.email || '',
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
  const today = new Date().toISOString().split('T')[0];
  const hasHome = groups.some((g) => g.items.some((i) => i.homeCollection));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error('Please enter a valid 10-digit mobile number starting with 6–9.'); return;
    }
    if (form.email && !EMAIL_RE.test(form.email)) {
      toast.error('Please enter a valid email address.'); return;
    }
    if (!pincodeValid) { toast.error('Please enter a valid pincode first'); return; }

    setSubmitting(true);

    // Auto-register guest and log them in before booking
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

    try {
      for (const group of groups) {
        const subtotal = group.items.reduce((sum, i) => sum + (i.salePrice || i.price), 0);
        await bookingApi.create({
          lab: group.labId,
          items: group.items.map((i) => ({
            product: i._id,
            name: i.name,
            qty: 1,
            price: i.salePrice || i.price,
          })),
          patients: [{
            name: form.patientName,
            age: +form.patientAge,
            gender: form.patientGender,
            relation: 'self',
            phone: form.phone,
            email: form.email,
          }],
          pincode: form.pincode,
          slotDate: form.slotDate,
          slotTime: form.slotTime,
          visitType: form.visitType,
          address: form.address,
          subtotal,
          total: subtotal,
          paymentMethod: 'cash',
        });
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

      toast.success('Booking confirmed! Check your dashboard.');
      onSuccess();
      router.push('/dashboard/bookings');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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

      {/* Row 1: Name | Age | Phone | Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Patient Name <span className="text-red-500">*</span></label>
          <input required value={form.patientName} onChange={F('patientName')} className="input text-sm" placeholder="Full name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Age <span className="text-red-500">*</span></label>
          <input required type="number" min="1" max="120" value={form.patientAge} onChange={F('patientAge')} className="input text-sm" placeholder="Age" />
        </div>
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

      {/* Row 2: Gender | Visit Type | Pincode | Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
          <select value={form.patientGender} onChange={F('patientGender')} className="input text-sm">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Visit Type</label>
          <select value={form.visitType} onChange={F('visitType')} className="input text-sm">
            <option value="lab">Visit Lab</option>
            {hasHome && <option value="home">Home Collection</option>}
          </select>
        </div>
        <div>
          <PincodeField
            pincode={form.pincode}
            onChange={(v) => setForm((f) => ({ ...f, pincode: v }))}
            groups={groups}
            onValidated={setPincodeValid}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Date <span className="text-red-500">*</span></label>
          <input required type="date" min={today} value={form.slotDate} onChange={F('slotDate')} className="input text-sm" />
        </div>
      </div>

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
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Collection Address <span className="text-red-500">*</span></label>
          <textarea required rows={2} value={form.address} onChange={F('address')} className="input text-sm resize-none" placeholder="Full address for sample collection" />
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
        disabled={submitting}
        className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold text-sm transition-colors mt-2"
      >
        {submitting
          ? (user ? 'Confirming…' : 'Creating account & booking…')
          : user
            ? `Confirm Booking${groups.length > 1 ? ` (${groups.length} labs)` : ''}`
            : `Create Account & Confirm Booking`}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, removeItem, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const groups = Object.values(
    items.reduce((acc, item) => {
      const labId = item.lab?._id || item.lab || 'unknown';
      if (!acc[labId]) acc[labId] = { labId, labName: item.lab?.name || 'Unknown Lab', items: [] };
      acc[labId].items.push(item);
      return acc;
    }, {})
  );

  const total    = items.reduce((sum, i) => sum + (i.salePrice || i.price || 0), 0);
  const mrpTotal = items.reduce((sum, i) => sum + (i.price || 0), 0);
  const savings  = mrpTotal - total;

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
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/search" className="text-gray-400 hover:text-gray-600 transition-colors">
                <FiArrowLeft className="text-xl" />
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

            {/* LEFT: Cart items grouped by lab */}
            <div className="lg:col-span-2 space-y-6">
              {groups.map((group) => (
                <div key={group.labId}>
                  {groups.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <FiMapPin className="text-gray-400 text-sm" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{group.labName}</span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <CartItem key={item._id} item={item} onRemove={removeItem} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: Price summary (sticky) */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-800 text-sm mb-4">Price Summary</h2>
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
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {savings > 0 && (
                  <p className="mt-3 text-xs text-green-600 font-medium bg-green-50 rounded-lg px-3 py-2 text-center">
                    You save ₹{savings.toLocaleString('en-IN')} on this order!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM: Patient & Slot form — same width as cart items (lg:col-span-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <BookingForm
                groups={groups}
                onSuccess={clearCart}
                submitting={submitting}
                setSubmitting={setSubmitting}
              />
              <p className="text-xs text-center text-gray-400">
                By confirming, you agree to our terms &amp; conditions
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
