export default function HealthOnTimeLogo({ dark = false, size = 'text-xl', showTagline = false }) {
  const textColor = dark ? '#ffffff' : '#1a2b6d';
  const taglineColor = dark ? '#9ca3af' : '#6b7280';
  const lineColor = dark ? '#4b5563' : '#d1d5db';
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span className={`inline-flex items-center font-bold tracking-tight leading-none ${size}`}>
        <span style={{ color: textColor }}>Health</span>
        <span
          className="inline-flex items-center justify-center rounded-full border-[2.5px] mx-[1px]"
          style={{ color: '#2d8c3e', borderColor: '#2d8c3e', width: '1.15em', height: '1.15em', fontSize: '0.65em', marginTop: '1px' }}
        >
          ✓
        </span>
        <span style={{ color: '#2d8c3e' }}>N</span>
        <span style={{ color: textColor }}>Time</span>
      </span>
      {showTagline && (
        <span className="inline-flex items-center gap-2 text-xs tracking-wide" style={{ color: taglineColor }}>
          <span className="inline-block w-6 h-px" style={{ backgroundColor: lineColor }} />
          Your Health. Our Priority. On Time.
          <span className="inline-block w-6 h-px" style={{ backgroundColor: lineColor }} />
        </span>
      )}
    </span>
  );
}
