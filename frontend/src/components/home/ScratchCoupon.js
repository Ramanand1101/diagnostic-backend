'use client';
import { useEffect, useRef, useState } from 'react';

const REVEAL_THRESHOLD = 0.45; // fraction of the scratch layer cleared before auto-reveal
const STORAGE_KEY = 'dh_promo_revealed';

// A scratch-off coupon card: a canvas "foil" layer sits over the real promo text and
// gets progressively erased as the visitor drags across it (mouse or touch), same
// interaction pattern as the scratch cards on most e-commerce apps. Revealing once per
// browser session is remembered so returning to the homepage doesn't force a re-scratch.
export default function ScratchCoupon({ promoText }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scratchingRef = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') setRevealed(true);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (revealed || !ready) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#f97316');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `600 ${Math.min(14, height * 0.4)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁 Scratch here to reveal your offer', width / 2, height / 2);

    const scratchAt = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(18, height * 0.6), 0, Math.PI * 2);
      ctx.fill();
    };

    const checkRevealPercent = () => {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0;
      const step = 4 * 20; // sample every 20th pixel for speed
      let sampled = 0;
      for (let i = 3; i < data.length; i += step) {
        sampled += 1;
        if (data[i] === 0) cleared += 1;
      }
      return sampled ? cleared / sampled : 0;
    };

    const reveal = () => {
      setRevealed(true);
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
    };

    const posFromEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (e.clientX ?? e.touches?.[0]?.clientX) - rect.left, y: (e.clientY ?? e.touches?.[0]?.clientY) - rect.top };
    };

    const onDown = (e) => { scratchingRef.current = true; const { x, y } = posFromEvent(e); scratchAt(x, y); };
    const onMove = (e) => {
      if (!scratchingRef.current) return;
      e.preventDefault();
      const { x, y } = posFromEvent(e);
      scratchAt(x, y);
      if (checkRevealPercent() > REVEAL_THRESHOLD) reveal();
    };
    const onUp = () => { scratchingRef.current = false; };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [revealed, ready]);

  if (!ready) return <div className="h-10" />;

  return (
    <div className="relative z-0">
      {/* Pulsing glow behind the card — draws the eye to it until it's scratched.
          Needs the parent's `z-0` (a stacking context) or a bare negative z-index
          here would paint behind the section's opaque white background instead. */}
      {!revealed && (
        <span className="absolute -inset-1 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 opacity-70 blur-md animate-pulse z-0" />
      )}
      <div ref={containerRef} className="relative z-10 h-11 sm:h-10 rounded-xl overflow-hidden select-none">
        {/* Real promo content — always in the DOM, visible once the foil layer is gone */}
        <div className="absolute inset-0 flex items-center justify-center px-4 bg-white">
          <div
            className={`text-center text-[11px] sm:text-sm text-gray-600 leading-relaxed rich-html transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}
            dangerouslySetInnerHTML={{ __html: revealed ? `🎉 ${promoText}` : '' }}
          />
        </div>
        {!revealed && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
          />
        )}
      </div>
    </div>
  );
}
