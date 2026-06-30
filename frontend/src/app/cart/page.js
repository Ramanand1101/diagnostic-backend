'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { bookingApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { FiTrash2, FiShoppingCart, FiMapPin, FiClock, FiArrowLeft, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TYPE_COLOR = {
  test:     'bg-blue-50 text-blue-700 border-blue-100',
  package:  'bg-purple-50 text-purple-700 border-purple-100',
  medicine: 'bg-teal-50 text-teal-700 border-teal-100',
};

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
          {(lab.city || lab.state) && (
            <span className="flex items-center gap-0.5">
              · <FiMapPin className="text-[10px]" />
              {[lab.city, lab.state].filter(Boolean).join(', ')}
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

function BookingForm({ groups, onSuccess }) {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    patientName: '', patientAge: '', patientGender: 'male',
    slotDate: '', slotTime: '', visitType: 'lab', address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(true);

  const hasHome = groups.some((g) => g.items.some((i) => i.homeCollection));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
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
          patients: [{ name: form.patientName, age: +form.patientAge, gender: form.patientGender, relation: 'self' }],
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

  const F = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 font-bold text-gray-800 text-sm hover:bg-gray-50 transition-colors"
      >
        Patient &amp; Slot Details
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Patient Name</label>
              <input required value={form.patientName} onChange={F('patientName')} className="input text-sm" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
              <input required type="number" min="1" max="120" value={form.patientAge} onChange={F('patientAge')} className="input text-sm" placeholder="Age" />
            </div>
          </div>

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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Date</label>
              <input required type="date" min={today} value={form.slotDate} onChange={F('slotDate')} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Time</label>
              <input required type="time" value={form.slotTime} onChange={F('slotTime')} className="input text-sm" />
            </div>
          </div>

          {form.visitType === 'home' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Collection Address</label>
              <textarea required rows={2} value={form.address} onChange={F('address')} className="input text-sm resize-none" placeholder="Full address for sample collection" />
            </div>
          )}

          {!user && (
            <p className="text-xs text-center text-gray-500">
              <Link href="/login" className="text-primary-600 font-semibold">Login</Link> required to confirm booking
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !user}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {submitting ? 'Confirming…' : `Confirm Booking${groups.length > 1 ? ` (${groups.length} labs)` : ''}`}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, clearCart } = useCart();

  // Group by lab so we create one booking per lab
  const groups = Object.values(
    items.reduce((acc, item) => {
      const labId = item.lab?._id || item.lab || 'unknown';
      if (!acc[labId]) acc[labId] = { labId, labName: item.lab?.name || 'Unknown Lab', items: [] };
      acc[labId].items.push(item);
      return acc;
    }, {})
  );

  const total = items.reduce((sum, i) => sum + (i.salePrice || i.price || 0), 0);
  const mrpTotal = items.reduce((sum, i) => sum + (i.price || 0), 0);
  const savings = mrpTotal - total;

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
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Cart items (grouped by lab) */}
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

            {/* Right: Summary + Booking form */}
            <div className="space-y-4">

              {/* Price summary */}
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

              {/* Booking form */}
              <BookingForm groups={groups} onSuccess={clearCart} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
