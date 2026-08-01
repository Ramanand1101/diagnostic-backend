'use client';
import { useState, useEffect } from 'react';
import { settingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiFacebook, FiInstagram, FiSave } from 'react-icons/fi';
import { RiTwitterXFill } from 'react-icons/ri';

const DEFAULT_LINKS = { facebook: '', twitter: '', instagram: '' };

const FIELDS = [
  { key: 'facebook',  label: 'Facebook',      icon: FiFacebook,    placeholder: 'https://facebook.com/yourpage' },
  { key: 'twitter',   label: 'X (Twitter)',   icon: RiTwitterXFill, placeholder: 'https://x.com/yourhandle' },
  { key: 'instagram', label: 'Instagram',     icon: FiInstagram,   placeholder: 'https://instagram.com/yourhandle' },
];

export default function SocialLinksSettingsPage() {
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingApi.getAll()
      .then((res) => {
        const items = res.data.items || res.data || [];
        const s = items.find((x) => x.key === 'social_links');
        if (s?.value) setLinks({ ...DEFAULT_LINKS, ...s.value });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setLinks((l) => ({ ...l, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingApi.upsert('social_links', links);
      toast.success('Social links saved!');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Social Links</h1>
        <p className="text-sm text-gray-500 mt-1">
          Shown as icons in the site footer. Leave a field blank to hide that icon.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        {FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key}>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Icon className="text-gray-500" /> {label}
            </label>
            <input
              type="url"
              value={links[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="input"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary flex items-center gap-2 disabled:opacity-60"
      >
        <FiSave /> {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
