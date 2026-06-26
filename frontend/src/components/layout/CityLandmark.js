'use client';

// Simple SVG landmark illustrations for Indian cities
// viewBox 0 0 80 72 — line-art style, color-switchable
export default function CityLandmark({ city, colored }) {
  const c = colored ? '#2A9D8F' : '#9CA3AF';      // teal when selected, gray otherwise
  const s = { stroke: c, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const f = { fill: c, stroke: 'none' };

  const map = {
    // ── Qutub Minar style (Delhi / Lucknow / Bhopal / Hyderabad) ──────────────
    'Delhi': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="20" y1="68" x2="60" y2="68" {...s} />
        <path d="M36 68 L34 52 L31 36 L32 20 L34 12 L40 6 L46 12 L48 20 L49 36 L46 52 L44 68" {...s} />
        <path d="M34 12 Q40 8 46 12" {...s} />
        <line x1="32" y1="42" x2="48" y2="42" {...s} strokeDasharray="3,2" />
        <line x1="31" y1="54" x2="49" y2="54" {...s} strokeDasharray="3,2" />
        <circle cx="26" cy="64" r="1.5" {...f} />
        <circle cx="58" cy="62" r="1" {...f} />
        <path d="M22 62 Q24 58 26 62" {...s} strokeWidth={1} />
      </svg>
    ),

    // ── Gateway of India (Mumbai) ──────────────────────────────────────────────
    'Mumbai': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="10" y1="68" x2="70" y2="68" {...s} />
        {/* Main arch */}
        <path d="M22 68 L22 50 Q40 22 58 50 L58 68" {...s} />
        {/* Inner arch */}
        <path d="M30 68 L30 54 Q40 38 50 54 L50 68" {...s} />
        {/* Towers left */}
        <path d="M14 68 L14 46 L19 46 L19 68" {...s} />
        <path d="M16 46 L16 40 M14 43 L19 43" {...s} />
        {/* Towers right */}
        <path d="M61 68 L61 46 L66 46 L66 68" {...s} />
        <path d="M63 46 L63 40 M61 43 L66 43" {...s} />
        {/* Water */}
        <path d="M10 70 Q20 72 30 70 Q40 68 50 70 Q60 72 70 70" {...s} strokeWidth={1} />
        <circle cx="24" cy="62" r="1" {...f} />
        <circle cx="56" cy="62" r="1" {...f} />
      </svg>
    ),

    // ── Vidhana Soudha / Two towers (Bangalore) ───────────────────────────────
    'Bangalore': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="8" y1="68" x2="72" y2="68" {...s} />
        {/* Left tower */}
        <rect x="14" y="30" width="18" height="38" {...s} />
        <path d="M14 30 L23 18 L32 30" {...s} />
        <rect x="19" y="22" width="8" height="6" {...s} strokeWidth={1} />
        {/* Right tower */}
        <rect x="48" y="30" width="18" height="38" {...s} />
        <path d="M48 30 L57 18 L66 30" {...s} />
        <rect x="53" y="22" width="8" height="6" {...s} strokeWidth={1} />
        {/* Windows */}
        <rect x="17" y="40" width="4" height="5" {...s} strokeWidth={1} />
        <rect x="25" y="40" width="4" height="5" {...s} strokeWidth={1} />
        <rect x="51" y="40" width="4" height="5" {...s} strokeWidth={1} />
        <rect x="59" y="40" width="4" height="5" {...s} strokeWidth={1} />
        {/* Center bridge */}
        <path d="M32 52 L48 52" {...s} />
        <path d="M32 58 L48 58" {...s} />
        {/* Clouds */}
        <path d="M35 10 Q38 6 42 10 Q46 6 49 10 Q49 14 35 14 Z" {...s} strokeWidth={1} />
        <circle cx="18" cy="14" r="1.5" {...f} />
        <circle cx="60" cy="10" r="1" {...f} />
      </svg>
    ),

    // ── Charminar (Hyderabad) ─────────────────────────────────────────────────
    'Hyderabad': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="10" y1="68" x2="70" y2="68" {...s} />
        {/* 4 minarets */}
        {[[18,68,14],[18,68,22],[62,68,58],[62,68,66]].map(([y1,,x],i) => (
          <g key={i}>
            <line x1={x+3} y1={68} x2={x+3} y2={30} {...s} />
            <path d={`M${x} 30 Q${x+3} 24 ${x+6} 30`} {...s} />
          </g>
        ))}
        {/* 4 tower tops */}
        <path d="M15 30 Q18 24 21 30" {...s} />
        <path d="M59 30 Q62 24 65 30" {...s} />
        {/* Center square */}
        <rect x="26" y="38" width="28" height="30" {...s} />
        {/* Center arch */}
        <path d="M33 68 L33 56 Q40 48 47 56 L47 68" {...s} />
        {/* Balcony ring */}
        <line x1="26" y1="46" x2="54" y2="46" {...s} strokeDasharray="2,2" />
        <line x1="16" y1="52" x2="24" y2="52" {...s} />
        <line x1="56" y1="52" x2="64" y2="52" {...s} />
        {/* Dome on center */}
        <path d="M32 38 Q40 28 48 38" {...s} />
        <line x1="40" y1="28" x2="40" y2="24" {...s} />
        <circle cx="40" cy="23" r="2" {...s} />
        <circle cx="25" cy="64" r="1" {...f} />
        <circle cx="56" cy="62" r="1" {...f} />
      </svg>
    ),

    // ── Howrah Bridge (Kolkata) ───────────────────────────────────────────────
    'Kolkata': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="5" y1="68" x2="75" y2="68" {...s} />
        {/* Road deck */}
        <line x1="5" y1="56" x2="75" y2="56" {...s} />
        {/* Main arch */}
        <path d="M8 56 Q40 14 72 56" {...s} />
        {/* Left tower */}
        <line x1="18" y1="68" x2="18" y2="30" {...s} strokeWidth={2.5} />
        <line x1="22" y1="68" x2="22" y2="30" {...s} strokeWidth={2.5} />
        <line x1="15" y1="32" x2="25" y2="32" {...s} />
        {/* Right tower */}
        <line x1="58" y1="68" x2="58" y2="30" {...s} strokeWidth={2.5} />
        <line x1="62" y1="68" x2="62" y2="30" {...s} strokeWidth={2.5} />
        <line x1="55" y1="32" x2="65" y2="32" {...s} />
        {/* Vertical cables */}
        {[28,34,40,46,52].map((x) => (
          <line key={x} x1={x} y1={56} x2={x} y2={56 - Math.round(12 * Math.sin(Math.PI * (x-8) / 64))} {...s} strokeWidth={0.8} />
        ))}
        {/* Water */}
        <path d="M5 70 Q20 72 35 70 Q50 68 65 70 Q70 71 75 70" {...s} strokeWidth={1} />
        <circle cx="35" cy="62" r="1.5" {...f} />
      </svg>
    ),

    // ── Hawa Mahal (Jaipur) ───────────────────────────────────────────────────
    'Jaipur': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="8" y1="68" x2="72" y2="68" {...s} />
        {/* Main facade with stepped arches */}
        {/* Row 1 (bottom) — 5 arches */}
        {[12,22,32,42,52,62].map((x,i)=>(
          <path key={i} d={`M${x} 68 L${x} 52 Q${x+5} 44 ${x+10} 52 L${x+10} 68`} {...s} />
        ))}
        {/* Row 2 — 4 arches, raised */}
        {[17,27,37,47,57].map((x,i)=>(
          <path key={i} d={`M${x} 52 L${x} 38 Q${x+5} 30 ${x+10} 38 L${x+10} 52`} {...s} />
        ))}
        {/* Row 3 — 3 arches */}
        {[22,32,42,52].map((x,i)=>(
          <path key={i} d={`M${x} 38 L${x} 26 Q${x+5} 18 ${x+10} 26 L${x+10} 38`} {...s} />
        ))}
        {/* Top arch */}
        <path d="M32 26 L32 16 Q40 8 48 16 L48 26" {...s} />
        <path d="M36 16 Q40 12 44 16" {...s} />
        <line x1="40" y1="12" x2="40" y2="8" {...s} />
        <circle cx="40" cy="7" r="2" {...s} />
        {/* Stars */}
        <circle cx="14" cy="62" r="1" {...f} />
        <circle cx="65" cy="62" r="1" {...f} />
        <circle cx="18" cy="46" r="1" {...f} />
        <circle cx="62" cy="46" r="1" {...f} />
      </svg>
    ),

    // ── Victoria Memorial dome (Chennai / Kolkata) ────────────────────────────
    'Chennai': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="8" y1="68" x2="72" y2="68" {...s} />
        {/* Base steps */}
        <rect x="16" y="60" width="48" height="8" {...s} />
        <rect x="20" y="54" width="40" height="6" {...s} />
        {/* Main body */}
        <rect x="24" y="38" width="32" height="16" {...s} />
        {/* Side columns */}
        <line x1="28" y1="54" x2="28" y2="38" {...s} />
        <line x1="36" y1="54" x2="36" y2="38" {...s} />
        <line x1="44" y1="54" x2="44" y2="38" {...s} />
        <line x1="52" y1="54" x2="52" y2="38" {...s} />
        {/* Dome */}
        <path d="M26 38 Q40 14 54 38" {...s} />
        <path d="M32 38 Q40 22 48 38" {...s} />
        {/* Finial */}
        <line x1="40" y1="14" x2="40" y2="8" {...s} />
        <circle cx="40" cy="7" r="2.5" {...s} />
        {/* Side towers */}
        <line x1="18" y1="60" x2="18" y2="44" {...s} />
        <path d="M15 44 Q18 40 21 44" {...s} />
        <line x1="62" y1="60" x2="62" y2="44" {...s} />
        <path d="M59 44 Q62 40 65 44" {...s} />
        <circle cx="15" cy="65" r="1" {...f} />
        <circle cx="64" cy="65" r="1" {...f} />
      </svg>
    ),

    // ── Shaniwar Wada fort (Pune) ─────────────────────────────────────────────
    'Pune': (
      <svg viewBox="0 0 80 72" className="w-full h-full">
        <line x1="8" y1="68" x2="72" y2="68" {...s} />
        {/* Wall */}
        <path d="M10 68 L10 50 L70 50 L70 68" {...s} />
        {/* Battlements */}
        {[10,18,26,34,42,50,58,66].map((x,i)=>(
          <rect key={i} x={x} y={44} width={6} height={6} {...s} />
        ))}
        {/* Main gate arch */}
        <path d="M32 68 L32 52 Q40 42 48 52 L48 68" {...s} />
        {/* Gate details */}
        <path d="M35 52 Q40 46 45 52" {...s} />
        <circle cx="40" cy="60" r="2" {...s} />
        {/* Side towers */}
        <rect x="10" y="34" width="12" height="16" {...s} />
        <path d="M10 34 Q16 26 22 34" {...s} />
        <rect x="58" y="34" width="12" height="16" {...s} />
        <path d="M58 34 Q64 26 70 34" {...s} />
        {/* Corner flags */}
        <line x1="16" y1="26" x2="16" y2="20" {...s} />
        <path d="M16 20 L22 22 L16 24" {...f} />
        <line x1="64" y1="26" x2="64" y2="20" {...s} />
        <path d="M64 20 L70 22 L64 24" {...f} />
        {/* Decoration dots */}
        <circle cx="16" cy="42" r="1" {...f} />
        <circle cx="64" cy="42" r="1" {...f} />
        <circle cx="22" cy="65" r="1" {...f} />
        <circle cx="57" cy="65" r="1" {...f} />
      </svg>
    ),
  };

  // Generic modern building for unlisted cities
  const Generic = ({ variant = 0 }) => {
    const configs = [
      // Tall single tower
      () => (
        <svg viewBox="0 0 80 72" className="w-full h-full">
          <line x1="10" y1="68" x2="70" y2="68" {...s} />
          <rect x="28" y="20" width="24" height="48" {...s} />
          {/* Windows */}
          {[28,36,44,52,60].map((y)=>[32,38,44].map((x)=>(
            <rect key={`${x}-${y}`} x={x} y={y} width={4} height={5} {...s} strokeWidth={0.8} />
          )))}
          <line x1="40" y1="20" x2="40" y2="12" {...s} />
          <rect x="36" y="8" width="8" height="4" {...s} />
          <rect x="16" y="48" width="12" height="20" {...s} />
          <rect x="52" y="42" width="12" height="26" {...s} />
          <circle cx="20" cy="64" r="1" {...f} />
          <circle cx="57" cy="60" r="1" {...f} />
          <path d="M12 66 Q16 62 20 66" {...s} strokeWidth={1} />
        </svg>
      ),
      // Two buildings
      () => (
        <svg viewBox="0 0 80 72" className="w-full h-full">
          <line x1="8" y1="68" x2="72" y2="68" {...s} />
          <rect x="12" y="28" width="22" height="40" {...s} />
          {[32,40,48,56].map((y)=>[16,22,28].map((x)=>(
            <rect key={`${x}-${y}`} x={x} y={y} width={4} height={5} {...s} strokeWidth={0.8} />
          )))}
          <rect x="46" y="18" width="22" height="50" {...s} />
          {[22,30,38,46,54].map((y)=>[50,56,62].map((x)=>(
            <rect key={`${x}-${y}`} x={x} y={y} width={4} height={5} {...s} strokeWidth={0.8} />
          )))}
          <line x1="57" y1="18" x2="57" y2="10" {...s} />
          <circle cx="57" cy="9" r="2" {...s} />
          <line x1="23" y1="28" x2="23" y2="22" {...s} />
          <circle cx="23" cy="21" r="1.5" {...s} />
          <circle cx="14" cy="65" r="1" {...f} />
          <circle cx="48" cy="65" r="1" {...f} />
        </svg>
      ),
    ];
    const Fn = configs[variant % configs.length];
    return <Fn />;
  };

  const GENERIC_VARIANT = {
    'Ahmedabad': 0, 'Chandigarh': 1, 'Lucknow': 0, 'Bhopal': 1,
    'Surat': 0, 'Noida': 1, 'Gurgaon': 1, 'Kochi': 0,
    'Indore': 1, 'Nagpur': 0, 'Patna': 1, 'Visakhapatnam': 0,
  };

  const Landmark = map[city];
  if (Landmark) return Landmark;
  return <Generic variant={GENERIC_VARIANT[city] ?? 0} />;
}
