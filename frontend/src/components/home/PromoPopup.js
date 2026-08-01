'use client';
import { useEffect, useState } from 'react';
import { FiX, FiCopy, FiGift } from 'react-icons/fi';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'dh_promo_popup_dismissed';
const OPEN_DELAY_MS = 900;

// Best-effort coupon code extraction — promoText is admin-edited HTML like
// 'Get <strong>10% OFF*</strong> ... Use: <strong>WELCOME10</strong>', so the
// last all-caps/digit token of reasonable length is almost always the code.
function extractCode(promoText) {
  const plain = String(promoText || '').replace(/<[^>]+>/g, ' ');
  const matches = plain.match(/\b[A-Z][A-Z0-9]{3,}\b/g);
  return matches?.[matches.length - 1] || null;
}

export default function PromoPopup({ promoText }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch {}
    if (dismissed || !promoText) return;
    const t = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [promoText]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  if (!open) return null;

  const code = extractCode(promoText);

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => toast.success(`Copied "${code}"!`, { icon: '📋' }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={close}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-[promoPopIn_0.35s_ease-out]"
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
        >
          <FiX className="text-lg" />
        </button>

        <div className="bg-gradient-to-br from-primary-600 to-primary-800 pt-9 pb-7 px-6 text-center">
          <div className="relative inline-flex">
            <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
            <span className="relative w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
              <FiGift className="text-2xl text-primary-600" />
            </span>
          </div>
          <p className="text-white font-bold text-lg mt-3">Special Offer, Just for You!</p>
        </div>

        <div className="px-6 py-6 text-center">
          <div
            className="text-sm text-gray-600 leading-relaxed rich-html mb-4"
            dangerouslySetInnerHTML={{ __html: promoText }}
          />
          {code && (
            <button
              onClick={copyCode}
              className="w-full flex items-center justify-between gap-2 bg-primary-50 border border-dashed border-primary-300 rounded-xl px-4 py-3 hover:bg-primary-100 transition-colors"
            >
              <span className="font-mono font-bold text-primary-700 tracking-wide">{code}</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-primary-600 shrink-0">
                <FiCopy /> Copy
              </span>
            </button>
          )}
          <button
            onClick={close}
            className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes promoPopIn {
          0% { opacity: 0; transform: scale(0.9) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
