'use client';
import { useState, useEffect } from 'react';
import { FiTag, FiCopy, FiCheck } from 'react-icons/fi';
import { couponApi } from '@/lib/api';
import toast from 'react-hot-toast';

function offerText(coupon) {
  const off = coupon.type === 'percent'
    ? `${coupon.value}% OFF${coupon.maxDiscount ? ` up to ₹${coupon.maxDiscount.toLocaleString('en-IN')}` : ''}`
    : `₹${coupon.value.toLocaleString('en-IN')} OFF`;
  const min = coupon.minOrderAmount > 0 ? ` on orders above ₹${coupon.minOrderAmount.toLocaleString('en-IN')}` : '';
  return `Get ${off}${min}`;
}

function CouponItem({ coupon }) {
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
    <div className="flex items-center gap-3 flex-shrink-0">
      <span className="text-sm text-gray-700 whitespace-nowrap">{offerText(coupon)}</span>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 text-xs font-bold rounded-full pl-3 pr-2.5 py-1.5 border border-dashed transition-colors whitespace-nowrap ${
          copied ? 'border-green-300 bg-green-50 text-green-700' : 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
        }`}
      >
        {coupon.code} {copied ? <FiCheck /> : <FiCopy />}
      </button>
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
    <section className="py-6 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-5 py-3.5 flex flex-wrap items-center gap-x-8 gap-y-3 overflow-x-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            <FiTag className="text-primary-600" />
            <h2 className="text-sm font-bold text-gray-900 whitespace-nowrap">Available Offers</h2>
          </div>
          {coupons.map((c, i) => (
            <div key={c._id} className="flex items-center gap-8 flex-shrink-0">
              {i > 0 && <span className="hidden sm:block h-6 w-px bg-primary-200" />}
              <CouponItem coupon={c} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
