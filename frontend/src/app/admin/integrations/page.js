'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { integrationApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiMessageSquare, FiCreditCard, FiCheckCircle, FiXCircle, FiSave, FiTrash2 } from 'react-icons/fi';

const ICONS = { email: FiMail, whatsapp: FiMessageSquare, sms: FiPhone, payment: FiCreditCard };

function IntegrationCard({ item, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(item.fields.map((f) => [f.key, item.config[f.key] || ''])));
  const [enabled, setEnabled] = useState(item.enabled);
  const [saving, setSaving] = useState(false);
  const Icon = ICONS[item.key] || FiMail;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await integrationApi.upsert(item.key, { config: form, enabled });
      toast.success(`${item.label} settings saved`);
      onSaved(item.key, res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove stored credentials for ${item.label}? The app will fall back to server .env values.`)) return;
    try {
      await integrationApi.delete(item.key);
      toast.success('Removed');
      onSaved(item.key, null);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600"><Icon size={16} /></div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
            <p className="text-[11px] text-gray-400">{item.provider}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {item.configured ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
          {item.configured ? 'Configured' : 'Not configured (using .env)'}
        </span>
      </div>

      <div className="space-y-2">
        {item.fields.map((f) => (
          <div key={f.key}>
            <label className="block text-[11px] text-gray-500 mb-0.5">{f.label}</label>
            <input
              type={f.sensitive ? 'password' : 'text'}
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.sensitive && item.config[f.key] ? item.config[f.key] : ''}
              className="input text-sm py-1.5"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <div onClick={() => setEnabled((v) => !v)} className={`w-9 h-5 rounded-full transition-colors flex items-center ${enabled ? 'bg-primary-600' : 'bg-gray-200'}`}>
            <span className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-1 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          Enabled
        </label>
        <div className="flex gap-2">
          {item.configured && (
            <button onClick={handleRemove} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1">
              <FiTrash2 size={11} />
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <FiSave size={11} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = () => {
    setLoading(true);
    integrationApi.getAll().then((r) => setItems(r.data.items || [])).finally(() => setLoading(false));
  };

  useEffect(() => { if (isSuperAdmin) fetchIntegrations(); else setLoading(false); }, [isSuperAdmin]);

  const handleSaved = () => fetchIntegrations();

  if (authLoading || loading) return <PageLoader />;

  if (!isSuperAdmin) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-600 font-medium">Only Super Admin can manage integration credentials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Credentials are encrypted before being stored. Leaving a field blank keeps its current value. If nothing is configured here, the app falls back to the server&apos;s <code className="text-xs bg-gray-100 px-1 rounded">.env</code> values.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <IntegrationCard key={item.key} item={item} onSaved={handleSaved} />
        ))}
      </div>
    </div>
  );
}
