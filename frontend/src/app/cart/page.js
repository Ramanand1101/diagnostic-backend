'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { bookingApi } from '@/lib/api';
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
  '03:00 PM – 04:00 PM', '04:00 PM – 05:00 PM', '05:00 PM – 06:00 PM',
  '06:00 PM – 07:00 PM', '07:00 PM – 08:00 PM', '08:00 PM – 09:00 PM',
];

function TimeSlotPicker({ value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-700">
        Preferred Time <span className="text-red-500">*</span>
      </label>

      {/* Morning */}
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-2">
          <span>☀️</span> Morning Slots (AM)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MORNING_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onChange(slot)}
              className={`text-xs px-2 py-2 rounded-lg border font-medium transition-all text-center ${
                value === slot
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Afternoon */}
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-2">
          <span>🌤️</span> Afternoon Slots (PM)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AFTERNOON_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onChange(slot)}
              className={`text-xs px-2 py-2 rounded-lg border font-medium transition-all text-center ${
                value === slot
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

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
function BookingForm({ groups, onSuccess, submitting, setSubmitting }) {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({
    patientName: '',
    patientAge: '',
    patientGender: 'male',
    phone: '',
    email: '',
    pincode: '',
    slotDate: '',
    slotTime: '',
    visitType: 'lab',
    address: '',
  });
  const [pincodeValid, setPincodeValid] = useState(false);

  // Pre-fill from user profile
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        patientName: f.patientName || user.name || '',
        phone: f.phone || user.mobile || '',
        email: f.email || user.email || '',
      }));
    }
  }, [user]);

  const F = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const today = new Date().toISOString().split('T')[0];
  const hasHome = groups.some((g) => g.items.some((i) => i.homeCollection));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (!pincodeValid) { toast.error('Please enter a valid pincode first'); return; }

    setSubmitting(true);
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
        <p className="text-xs text-center text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <Link href="/login" className="text-primary-600 font-semibold">Login</Link> required to confirm booking
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold text-sm transition-colors mt-2"
      >
        {submitting
          ? 'Confirming…'
          : `Confirm Booking${groups.length > 1 ? ` (${groups.length} labs)` : ''}`}
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
