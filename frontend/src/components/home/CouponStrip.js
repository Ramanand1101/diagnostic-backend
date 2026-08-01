'use client';
import { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiTag } from 'react-icons/fi';
import { couponApi } from '@/lib/api';
import toast from 'react-hot-toast';

const FLAP_COLORS = [
  'from-primary-600 to-primary-700',
  'from-orange-500 to-pink-500',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-indigo-600',
];

function headline(coupon) {
  if (coupon.type === 'percent') {
    return `${coupon.value}% OFF${coupon.maxDiscount ? ` up to ₹${coupon.maxDiscount.toLocaleString('en-IN')}` : ''}`;
  }
  return `₹${coupon.value.toLocaleString('en-IN')} OFF`;
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
    <div className="flex-shrink-0 w-72 snap-start flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`w-10 flex-shrink-0 bg-gradient-to-b ${colorClass} flex items-center justify-center`}>
        <span className="text-white text-[10px] font-bold tracking-widest [writing-mode:vertical-rl] rotate-180 select-none">
          OFFER
        </span>
      </div>
      <div className="flex-1 min-w-0 px-4 py-3.5 border-l border-dashed border-gray-200">
        <p className="text-gray-900 font-bold text-base leading-tight">{headline(coupon)}</p>
        <p className="text-primary-700 font-extrabold text-lg tracking-wide mt-0.5 truncate">{coupon.code}</p>
        <p className="text-gray-500 text-xs mt-1">
          {coupon.minOrderAmount > 0 ? `On orders above ₹${coupon.minOrderAmount.toLocaleString('en-IN')}` : 'No minimum order'}
        </p>
        <button
          onClick={handleCopy}
          className={`mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full py-1.5 transition-colors ${
            copied ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied' : 'Copy Code'}
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
    <section className="py-8 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <FiTag className="text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">Available Offers</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {coupons.map((c, i) => (
            <CouponCard key={c._id} coupon={c} colorClass={FLAP_COLORS[i % FLAP_COLORS.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
