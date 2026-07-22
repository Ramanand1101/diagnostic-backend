'use client';
import { useEffect, useState } from 'react';

export const ANIMATION_PRESETS = {
  'lab-hero':   { emoji: '🔬', label: 'Lab Hero',     tagline: 'Tests Booked!' },
  'ambulance':  { emoji: '🚑', label: 'Ambulance',    tagline: "We're coming!" },
  'rocket':     { emoji: '🚀', label: 'Rocket',       tagline: 'Booking Done!' },
  'dna':        { emoji: '🧬', label: 'DNA',          tagline: 'Science saves!' },
  'doctor':     { emoji: '👨‍⚕️', label: 'Doctor',      tagline: 'See you soon!' },
  'stethoscope':{ emoji: '🩺', label: 'Stethoscope',  tagline: 'All set!' },
};

export default function BookingAnimation({ config, onDone }) {
  // phase: 'hidden' → 'visible' → 'exit'
  const [phase, setPhase] = useState('hidden');

  const duration  = Math.max(1500, Math.min(config?.duration || 2400, 5000));
  const presetKey = config?.preset || 'lab-hero';
  const preset    = ANIMATION_PRESETS[presetKey] || ANIMATION_PRESETS['lab-hero'];
  const hasGif    = !!config?.customGif;

  useEffect(() => {
    // One frame delay so CSS transition fires
    const t0 = requestAnimationFrame(() => setPhase('visible'));
    const t1 = setTimeout(() => setPhase('exit'), duration - 500);
    const t2 = setTimeout(() => onDone?.(), duration);
    return () => { cancelAnimationFrame(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // character transform per phase
  const charStyle = (() => {
    if (phase === 'hidden') return { opacity: 0, transform: 'translateY(120%) scale(0.6)' };
    if (phase === 'visible') return { opacity: 1, transform: 'translateY(0%) scale(1)' };
    // exit — slide back down
    return { opacity: 0, transform: 'translateY(60%) scale(0.8)' };
  })();

  const overlayOpacity = phase === 'hidden' ? 0 : phase === 'visible' ? 1 : 0;

  return (
    <>
      <style>{`
        @keyframes labelPop {
          0%   { opacity:0; transform:scale(0.5) translateY(10px); }
          60%  { transform:scale(1.08) translateY(-2px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes pulse {
          0%,100% { transform:scale(1); }
          50%     { transform:scale(1.06); }
        }
      `}</style>

      {/* Page dim — subtle, just like BookMyShow */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          opacity: overlayOpacity,
          transition: phase === 'exit' ? 'opacity 500ms ease' : 'opacity 250ms ease',
          pointerEvents: 'all',
        }}
      />

      {/* Character — comes from bottom, NO background box */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          paddingBottom: '5vh',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            ...charStyle,
            transition: phase === 'hidden'
              ? 'none'
              : phase === 'visible'
                ? 'opacity 350ms ease, transform 500ms cubic-bezier(0.34,1.56,0.64,1)'
                : 'opacity 500ms ease, transform 450ms ease',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          }}
        >
          {/* Character image or emoji */}
          {hasGif ? (
            <img
              src={config.customGif}
              alt="character"
              style={{
                height: 'min(60vh, 420px)',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
                animation: phase === 'visible' ? 'pulse 1.2s ease-in-out infinite' : 'none',
              }}
            />
          ) : (
            <div style={{
              fontSize: 'min(35vw, 220px)',
              lineHeight: 1,
              filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.4))',
              animation: phase === 'visible' ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }}>
              {preset.emoji}
            </div>
          )}

          {/* Label below character */}
          {phase === 'visible' && (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '2rem',
              padding: '0.5rem 1.6rem',
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#1e40af',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              animation: 'labelPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
              letterSpacing: '-0.01em',
            }}>
              ✅ {preset.tagline}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
