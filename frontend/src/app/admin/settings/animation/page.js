'use client';
import { useState, useEffect } from 'react';
import { settingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import BookingAnimation, { ANIMATION_PRESETS } from '@/components/booking/BookingAnimation';

const DEFAULT_CONFIG = {
  enabled: true,
  preset: 'lab-hero',
  customGif: '',
  duration: 2200,
};

export default function BookingAnimationSettingsPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingApi.getAll()
      .then((res) => {
        const items = res.data.items || res.data || [];
        const s = items.find((x) => x.key === 'booking_animation');
        if (s?.value) setConfig({ ...DEFAULT_CONFIG, ...s.value });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingApi.upsert('booking_animation', config);
      toast.success('Animation settings saved!');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {previewing && (
        <BookingAnimation config={config} onDone={() => setPreviewing(false)} />
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900">Booking Animation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Full-screen animation that plays when a user clicks &quot;Proceed to Payment&quot;.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800">Enable animation</p>
          <p className="text-xs text-gray-500 mt-0.5">Turn off to skip the animation entirely</p>
        </div>
        <button
          onClick={() => set('enabled', !config.enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Preset picker */}
          <div className="card p-5 space-y-3">
            <p className="font-medium text-gray-800">Choose character / style</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(ANIMATION_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => set('preset', key)}
                  className={`rounded-xl p-4 flex flex-col items-center gap-2 border-2 transition-all ${
                    config.preset === key
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span style={{ fontSize: '2.5rem' }}>{p.emoji}</span>
                  <span className="text-xs font-medium text-gray-700">{p.label}</span>
                  {config.preset === key && (
                    <span className="text-[10px] text-primary-600 font-semibold">Selected ✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom GIF */}
          <div className="card p-5 space-y-3">
            <div>
              <p className="font-medium text-gray-800">Custom GIF URL <span className="text-gray-400 font-normal text-xs">(optional)</span></p>
              <p className="text-xs text-gray-500 mt-0.5">
                Paste a GIF URL to use your own character instead of the preset emoji. Leave blank to use preset.
              </p>
            </div>
            <input
              type="url"
              value={config.customGif}
              onChange={(e) => set('customGif', e.target.value)}
              placeholder="https://example.com/character.gif"
              className="input text-sm"
            />
            {config.customGif && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <img src={config.customGif} alt="preview" className="h-16 w-auto object-contain rounded" onError={(e) => { e.target.style.display = 'none'; }} />
                <div className="text-xs text-gray-500">Preview of your custom GIF</div>
                <button onClick={() => set('customGif', '')} className="ml-auto text-xs text-red-500 hover:underline">Remove</button>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="card p-5 space-y-3">
            <p className="font-medium text-gray-800">
              Animation duration &nbsp;
              <span className="text-primary-600 font-bold">{(config.duration / 1000).toFixed(1)}s</span>
            </p>
            <input
              type="range"
              min={1500}
              max={5000}
              step={100}
              value={config.duration}
              onChange={(e) => set('duration', Number(e.target.value))}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1.5s (quick)</span>
              <span>5s (long)</span>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {config.enabled && (
          <button
            onClick={() => setPreviewing(true)}
            className="btn-secondary"
          >
            Preview Animation ▶
          </button>
        )}
      </div>
    </div>
  );
}
