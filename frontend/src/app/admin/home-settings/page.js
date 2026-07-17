'use client';
import { useState, useEffect } from 'react';
import { homeContentApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import toast from 'react-hot-toast';
import {
  FiSave, FiEye, FiPlus, FiTrash2, FiBarChart2,
  FiAward, FiList, FiZap, FiFlag,
} from 'react-icons/fi';

const DEFAULT_CONTENT = {
  stats: [
    { value: '2000+', label: 'Tests & Packages' },
    { value: '1000+', label: 'Partner Labs' },
    { value: '100+', label: 'Cities Covered' },
    { value: '30K+', label: 'Happy Patients' },
  ],
  whyUs: { title: 'Why HealthOnTime?', subtitle: 'Everything you need for hassle-free lab testing' },
  features: [
    { icon: 'FiShield', title: 'NABL Certified Labs', desc: 'All partner labs are NABL / CAP accredited and rigorously verified.', color: 'text-primary-600', bg: 'bg-primary-50' },
    { icon: 'FiClock', title: 'Fast Digital Reports', desc: 'Receive your test report digitally within hours, not days.', color: 'text-secondary-600', bg: 'bg-secondary-50' },
    { icon: 'FiActivity', title: 'Home Collection', desc: 'Our trained phlebotomists collect samples at your doorstep.', color: 'text-accent-600', bg: 'bg-accent-50' },
    { icon: 'FiAward', title: 'Best Prices', desc: 'Transparent pricing with no hidden fees and exclusive discounts.', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ],
  howItWorks: { title: 'How It Works', subtitle: 'Book your lab test in 3 simple steps' },
  steps: [
    { title: 'Search & Compare', desc: 'Browse 500+ tests and packages. Compare prices across certified labs in your city.' },
    { title: 'Book Your Slot', desc: 'Choose home collection or walk-in. Pick a time that fits your schedule.' },
    { title: 'Get Your Report', desc: 'Receive your digital report securely in your dashboard within hours.' },
  ],
  popularTests: [
    { name: 'CBC Test', slug: 'cbc' },
    { name: 'Thyroid Panel', slug: 'thyroid' },
    { name: 'Vitamin D', slug: 'vitamin-d' },
    { name: 'HbA1c', slug: 'hba1c' },
    { name: 'Lipid Profile', slug: 'lipid' },
    { name: 'Liver Function', slug: 'liver' },
  ],
  trustBanner: {
    title: "India's Most Trusted Lab Booking Platform",
    subtitle: 'We partner only with NABL & CAP certified labs to ensure accurate, reliable results every time.',
    btn1Text: 'Book a Test',
    btn1Href: '/products?type=test',
    btn2Text: 'Find a Lab',
    btn2Href: '/labs',
  },
};

const ICON_OPTIONS = [
  'FiShield', 'FiClock', 'FiActivity', 'FiAward', 'FiSearch',
  'FiCalendar', 'FiFileText', 'FiHeart', 'FiStar', 'FiDroplet', 'FiEye',
];

const COLOR_OPTIONS = [
  { label: 'Primary', value: 'text-primary-600', bg: 'bg-primary-50' },
  { label: 'Secondary', value: 'text-secondary-600', bg: 'bg-secondary-50' },
  { label: 'Accent', value: 'text-accent-600', bg: 'bg-accent-50' },
  { label: 'Yellow', value: 'text-yellow-600', bg: 'bg-yellow-50' },
  { label: 'Green', value: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Red', value: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Blue', value: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Purple', value: 'text-purple-600', bg: 'bg-purple-50' },
];

const TABS = [
  { id: 'stats', label: 'Stats', icon: FiBarChart2 },
  { id: 'whyus', label: 'Why Us', icon: FiAward },
  { id: 'howitworks', label: 'How It Works', icon: FiList },
  { id: 'tests', label: 'Popular Tests', icon: FiZap },
  { id: 'trust', label: 'Trust Banner', icon: FiFlag },
];

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
      />
    </div>
  );
}

// ── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ stats, onChange }) {
  const update = (idx, field, val) => {
    const next = stats.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    onChange(next);
  };
  const add = () => onChange([...stats, { value: '', label: '' }]);
  const remove = (idx) => onChange(stats.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">Edit the number stats shown below the hero section.</p>
        <button onClick={add} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
          <FiPlus className="text-xs" /> Add Stat
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Stat #{idx + 1}</span>
              <button onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                <FiTrash2 className="text-sm" />
              </button>
            </div>
            <InputField label="Value (e.g. 2000+)" value={stat.value} onChange={(v) => update(idx, 'value', v)} placeholder="2000+" />
            <InputField label="Label" value={stat.label} onChange={(v) => update(idx, 'label', v)} placeholder="Tests & Packages" />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ value, label }, idx) => (
            <div key={idx} className="rounded-2xl p-[1.5px] bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-300">
              <div className="rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 px-4 py-6 text-center">
                <p className="text-2xl font-extrabold text-indigo-900">{value || '—'}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{label || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Why Us Tab ───────────────────────────────────────────────────────────────

function WhyUsTab({ whyUs, features, onWhyUsChange, onFeaturesChange }) {
  const updateHeading = (field, val) => onWhyUsChange({ ...whyUs, [field]: val });
  const updateFeature = (idx, field, val) => {
    const next = features.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    onFeaturesChange(next);
  };
  const addFeature = () => onFeaturesChange([...features, { icon: 'FiShield', title: '', desc: '', color: 'text-primary-600', bg: 'bg-primary-50' }]);
  const removeFeature = (idx) => onFeaturesChange(features.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-3">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Section Heading</p>
        <InputField label="Title" value={whyUs.title} onChange={(v) => updateHeading('title', v)} placeholder="Why HealthOnTime?" />
        <InputField label="Subtitle" value={whyUs.subtitle} onChange={(v) => updateHeading('subtitle', v)} placeholder="Everything you need..." />
      </div>

      {/* Feature cards */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Feature Cards</p>
        <button onClick={addFeature} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
          <FiPlus className="text-xs" /> Add Card
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {features.map((f, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Card #{idx + 1}</span>
              <button onClick={() => removeFeature(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                <FiTrash2 className="text-sm" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                <select value={f.icon} onChange={(e) => updateFeature(idx, 'icon', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Color Theme</label>
                <select value={f.color} onChange={(e) => {
                  const opt = COLOR_OPTIONS.find((c) => c.value === e.target.value);
                  updateFeature(idx, 'color', e.target.value);
                  if (opt) updateFeature(idx, 'bg', opt.bg);
                }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <InputField label="Title" value={f.title} onChange={(v) => updateFeature(idx, 'title', v)} placeholder="Card title" />
            <TextareaField label="Description" value={f.desc} onChange={(v) => updateFeature(idx, 'desc', v)} placeholder="Card description" />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="text-center mb-4">
          <p className="text-lg font-bold text-gray-900">{whyUs.title}</p>
          <p className="text-xs text-gray-500">{whyUs.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map((f, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-white">
              <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-3`}>
                <span className={`text-sm font-bold ${f.color}`}>{f.icon?.replace('Fi', '')}</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">{f.title || '—'}</p>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{f.desc || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── How It Works Tab ─────────────────────────────────────────────────────────

function HowItWorksTab({ howItWorks, steps, onHowItWorksChange, onStepsChange }) {
  const updateHeading = (field, val) => onHowItWorksChange({ ...howItWorks, [field]: val });
  const updateStep = (idx, field, val) => {
    const next = steps.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    onStepsChange(next);
  };
  const addStep = () => onStepsChange([...steps, { title: '', desc: '' }]);
  const removeStep = (idx) => onStepsChange(steps.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-3">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Section Heading</p>
        <InputField label="Title" value={howItWorks.title} onChange={(v) => updateHeading('title', v)} placeholder="How It Works" />
        <InputField label="Subtitle" value={howItWorks.subtitle} onChange={(v) => updateHeading('subtitle', v)} placeholder="Book your lab test in 3 simple steps" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Steps</p>
        <button onClick={addStep} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
          <FiPlus className="text-xs" /> Add Step
        </button>
      </div>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                <FiTrash2 className="text-sm" />
              </button>
            </div>
            <InputField label="Step Title" value={step.title} onChange={(v) => updateStep(idx, 'title', v)} placeholder="Search & Compare" />
            <TextareaField label="Description" value={step.desc} onChange={(v) => updateStep(idx, 'desc', v)} placeholder="Step description..." />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="text-center mb-4">
          <p className="text-lg font-bold text-gray-900">{howItWorks.title}</p>
          <p className="text-xs text-gray-500">{howItWorks.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center text-center p-4 bg-white rounded-xl border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white text-lg font-bold flex items-center justify-center mb-3 shadow">
                {idx + 1}
              </div>
              <p className="font-semibold text-gray-900 mb-1">{step.title || '—'}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{step.desc || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Popular Tests Tab ────────────────────────────────────────────────────────

function PopularTestsTab({ tests, onChange }) {
  const update = (idx, field, val) => {
    const next = tests.map((t, i) => i === idx ? { ...t, [field]: val } : t);
    onChange(next);
  };
  const add = () => onChange([...tests, { name: '', slug: '' }]);
  const remove = (idx) => onChange(tests.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">Quick-access test links shown on the home page.</p>
        <button onClick={add} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
          <FiPlus className="text-xs" /> Add Test
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Test #{idx + 1}</span>
              <button onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                <FiTrash2 className="text-sm" />
              </button>
            </div>
            <InputField label="Name" value={test.name} onChange={(v) => update(idx, 'name', v)} placeholder="CBC Test" />
            <InputField label="Slug (URL key)" value={test.slug} onChange={(v) => update(idx, 'slug', v.toLowerCase().replace(/\s+/g, '-'))} placeholder="cbc" />
            <p className="text-[10px] text-gray-400">Known slugs get a custom icon: cbc, thyroid, vitamin-d, hba1c, lipid, liver</p>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="flex flex-wrap gap-2">
          {tests.map(({ name, slug }, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 bg-white w-24 text-center">
              <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                <span className="text-xs text-primary-600 font-bold">{slug?.slice(0, 3).toUpperCase() || '—'}</span>
              </div>
              <span className="text-xs font-medium text-gray-700 leading-tight">{name || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Trust Banner Tab ─────────────────────────────────────────────────────────

function TrustBannerTab({ banner, onChange }) {
  const update = (field, val) => onChange({ ...banner, [field]: val });

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Edit the full-width CTA banner at the bottom of the home page.</p>
      <div className="space-y-4">
        <InputField label="Heading" value={banner.title} onChange={(v) => update('title', v)} placeholder="India's Most Trusted Lab Booking Platform" />
        <TextareaField label="Subtitle" value={banner.subtitle} onChange={(v) => update('subtitle', v)} placeholder="Supporting text..." rows={2} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Button 1 (Primary)</p>
          <InputField label="Button Text" value={banner.btn1Text} onChange={(v) => update('btn1Text', v)} placeholder="Book a Test" />
          <InputField label="Button Link" value={banner.btn1Href} onChange={(v) => update('btn1Href', v)} placeholder="/products?type=test" />
        </div>
        <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Button 2 (Outline)</p>
          <InputField label="Button Text" value={banner.btn2Text} onChange={(v) => update('btn2Text', v)} placeholder="Find a Lab" />
          <InputField label="Button Link" value={banner.btn2Href} onChange={(v) => update('btn2Href', v)} placeholder="/labs" />
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 rounded-2xl py-10 px-6 text-center text-white">
          <h2 className="text-xl font-bold mb-2">{banner.title || '—'}</h2>
          <p className="text-primary-200 text-sm mb-6">{banner.subtitle || '—'}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="bg-white text-primary-700 font-semibold px-6 py-2 rounded-xl text-sm shadow">
              {banner.btn1Text || 'Button 1'}
            </span>
            <span className="border-2 border-white/40 text-white font-semibold px-6 py-2 rounded-xl text-sm">
              {banner.btn2Text || 'Button 2'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function HomeSettingsPage() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    homeContentApi.get()
      .then((res) => setContent({ ...DEFAULT_CONTENT, ...res.data }))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await homeContentApi.update(content);
      // Immediately clear the home page cache so changes appear instantly
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/' }),
      }).catch(() => {});
      toast.success('Home page updated! Changes are live now.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Home Page Editor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Edit every section of the home page. Changes go live immediately after saving.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <FiEye /> Preview Site
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            <FiSave /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === id
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="text-sm" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {activeTab === 'stats' && (
          <StatsTab
            stats={content.stats}
            onChange={(stats) => setContent((c) => ({ ...c, stats }))}
          />
        )}
        {activeTab === 'whyus' && (
          <WhyUsTab
            whyUs={content.whyUs}
            features={content.features}
            onWhyUsChange={(whyUs) => setContent((c) => ({ ...c, whyUs }))}
            onFeaturesChange={(features) => setContent((c) => ({ ...c, features }))}
          />
        )}
        {activeTab === 'howitworks' && (
          <HowItWorksTab
            howItWorks={content.howItWorks}
            steps={content.steps}
            onHowItWorksChange={(howItWorks) => setContent((c) => ({ ...c, howItWorks }))}
            onStepsChange={(steps) => setContent((c) => ({ ...c, steps }))}
          />
        )}
        {activeTab === 'tests' && (
          <PopularTestsTab
            tests={content.popularTests}
            onChange={(popularTests) => setContent((c) => ({ ...c, popularTests }))}
          />
        )}
        {activeTab === 'trust' && (
          <TrustBannerTab
            banner={content.trustBanner}
            onChange={(trustBanner) => setContent((c) => ({ ...c, trustBanner }))}
          />
        )}
      </div>

      {/* Sticky save bar */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60 shadow-sm"
        >
          <FiSave /> {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
