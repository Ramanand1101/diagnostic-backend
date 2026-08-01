'use client';
import { useState, useEffect } from 'react';
import { FiTag } from 'react-icons/fi';
import { couponApi } from '@/lib/api';
import toast from 'react-hot-toast';

// Matches the section's bg so the notch circles look "punched" out of the card edges
const PAGE_BG = 'bg-gray-50';

const FLAP_COLORS = [
  'from-purple-600 to-indigo-700',
  'from-orange-500 to-red-600',
  'from-emerald-500 to-teal-600',
  'from-primary-600 to-primary-700',
];

function headline(coupon) {
  if (coupon.type === 'percent') {
    return `Flat ${coupon.value}% off*`;
  }
  return `Flat ₹${coupon.value.toLocaleString('en-IN')} off*`;
}

function description(coupon) {
  if (coupon.type === 'percent') {
    return `Save ${coupon.value}%${coupon.maxDiscount ? ` (up to ₹${coupon.maxDiscount.toLocaleString('en-IN')})` : ''} using this code.`;
  }
  return `Save ₹${coupon.value.toLocaleString('en-IN')} using this code.`;
}

function Notch({ className }) {
  return <div className={`absolute w-4 h-4 rounded-full ${PAGE_BG} ${className}`} />;
}

function CouponCard({ coupon, colorClass }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(`Code ${coupon.code} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy code');
    }
  };

  return (
    <div className="relative flex-shrink-0 w-80 snap-start flex bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Left flap */}
      <div className={`relative w-16 flex-shrink-0 bg-gradient-to-b ${colorClass} flex items-center justify-center`}>
        <span className="text-white text-xs font-bold tracking-widest [writing-mode:vertical-rl] rotate-180 select-none">
          DISCOUNT
        </span>
      </div>

      {/* Ticket-edge notches, punched at the flap/content divide */}
      <Notch className="left-16 -top-2 -translate-x-1/2" />
      <Notch className="left-16 -bottom-2 -translate-x-1/2" />
      {/* Ticket-edge notch on the outer right edge */}
      <Notch className="-right-2 top-1/2 -translate-y-1/2" />

      {/* Right content */}
      <div className="relative flex-1 min-w-0 px-5 py-4">
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center">
          <FiTag className="text-rose-500 text-sm" />
        </div>

        <p className="text-gray-500 text-sm pr-8">{headline(coupon)}</p>
        <p className="text-gray-900 font-extrabold text-xl tracking-wide mt-0.5 truncate pr-8">{coupon.code}</p>
        <p className="text-gray-600 text-sm mt-2">{description(coupon)}</p>
        <p className="text-primary-600 text-xs font-medium mt-1">
          {coupon.minOrderAmount > 0 ? `*On orders above ₹${coupon.minOrderAmount.toLocaleString('en-IN')}` : '*No minimum order'}
        </p>

        <button
          onClick={handleCopy}
          className="mt-3 w-full border border-gray-200 border-dashed rounded-full py-2 font-bold text-sm text-gray-900 hover:bg-gray-50 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
    </div>
  );
}

export default function CouponStrip() {
  const [coupons, setCoupons] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    couponApi.getActive()
      .then((res) => setCoupons(res.data.items || []))
      .catch(() => setCoupons([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || coupons.length === 0) return null;

  return (
    <section className={`py-8 ${PAGE_BG}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <FiTag className="text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">Available Offers</h2>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory">
          {coupons.map((c, i) => (
            <CouponCard key={c._id} coupon={c} colorClass={FLAP_COLORS[i % FLAP_COLORS.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
