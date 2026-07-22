'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const ANIMATION_PRESETS = {
  'lab-hero':    { emoji: '🔬', label: 'Lab Hero',      tagline: 'Tests Booked!' },
  'ambulance':   { emoji: '🚑', label: 'Ambulance',     tagline: "We're coming!" },
  'rocket':      { emoji: '🚀', label: 'Rocket',        tagline: 'Booking Done!' },
  'dna':         { emoji: '🧬', label: 'DNA',           tagline: 'Science saves!' },
  'doctor':      { emoji: '👨‍⚕️', label: 'Doctor',       tagline: 'See you soon!' },
  'stethoscope': { emoji: '🩺', label: 'Stethoscope',   tagline: 'All set!' },
};

function AnimationOverlay({ config, onDone }) {
  const [phase, setPhase] = useState('hidden'); // hidden → visible → exit

  const duration  = Math.max(1500, Math.min(config?.duration || 2400, 5000));
  const presetKey = config?.preset || 'lab-hero';
  const preset    = ANIMATION_PRESETS[presetKey] || ANIMATION_PRESETS['lab-hero'];
  const hasGif    = !!(config?.customGif || '').trim();

  useEffect(() => {
    // one rAF so the CSS transition fires from hidden → visible
    let rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => setPhase('visible'));
    });
    const t1 = setTimeout(() => setPhase('exit'),    duration - 500);
    const t2 = setTimeout(() => onDone?.(),          duration);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayOpacity = phase === 'hidden' ? 0 : phase === 'exit' ? 0 : 1;

  const charTransform =
    phase === 'hidden'  ? 'translateY(130%) scale(0.5)' :
    phase === 'visible' ? 'translateY(0%)   scale(1)'   :
                          'translateY(70%)  scale(0.8)';

  const charOpacity = phase === 'visible' ? 1 : 0;

  const charTransition =
    phase === 'hidden'  ? 'none' :
    phase === 'visible' ? 'opacity 300ms ease, transform 550ms cubic-bezier(0.34,1.56,0.64,1)' :
                          'opacity 500ms ease, transform 400ms ease';

  return (
    <>
      <style>{`
        @keyframes anim-label-pop {
          0%   { opacity:0; transform:scale(0.5) translateY(12px); }
          65%  { transform:scale(1.1) translateY(-3px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes anim-pulse {
          0%,100% { transform:scale(1); }
          50%     { transform:scale(1.05); }
        }
      `}</style>

      {/* dim overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2147483640,
        background: 'rgba(0,0,0,0.50)',
        opacity: overlayOpacity,
        transition: 'opacity 350ms ease',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }} />

      {/* character + label */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2147483641,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: '8vh',
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.1rem',
          opacity: charOpacity,
          transform: charTransform,
          transition: charTransition,
        }}>
          {/* character */}
          {hasGif ? (
            <img
              src={config.customGif}
              alt="character"
              style={{
                height: 'min(58vh, 400px)', width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.55))',
                animation: phase === 'visible' ? 'anim-pulse 1.4s ease-in-out infinite' : 'none',
              }}
            />
          ) : (
            <div style={{
              fontSize: 'min(32vw, 200px)', lineHeight: 1,
              filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.45))',
              animation: phase === 'visible' ? 'anim-pulse 1.4s ease-in-out infinite' : 'none',
            }}>
              {preset.emoji}
            </div>
          )}

          {/* label pill */}
          {phase === 'visible' && (
            <div style={{
              background: 'rgba(255,255,255,0.96)',
              borderRadius: '999px',
              padding: '0.55rem 1.8rem',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: '#1d4ed8',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              animation: 'anim-label-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}>
              ✅ {preset.tagline}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function BookingAnimation({ config, onDone }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Don't render anything until client is mounted (avoids SSR hydration mismatch)
  if (!mounted) return null;

  return createPortal(
    <AnimationOverlay config={config} onDone={onDone} />,
    document.body
  );
}
