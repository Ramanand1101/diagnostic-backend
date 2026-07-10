export default function HealthOnTimeLogo({ dark = false, size = 'text-xl' }) {
  const textColor = dark ? '#ffffff' : '#1a2b6d';
  return (
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
  );
}
