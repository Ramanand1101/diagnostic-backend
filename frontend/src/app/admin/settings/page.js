'use client';
import { useState, useEffect } from 'react';
import { settingApi, searchApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiPlus } from 'react-icons/fi';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSettings = () => {
    setLoading(true);
    settingApi.getAll()
      .then((res) => setSettings(res.data.items || res.data.settings || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleReindex = async (type) => {
    setReindexing(type);
    try {
      if (type === 'labs') await searchApi.reindexLabs();
      else if (type === 'products') await searchApi.reindexProducts();
      toast.success(`${type} reindexed in Algolia!`);
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setReindexing(''); }
  };

  const handleAddSetting = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingApi.create({ key: newKey, value: newValue });
      toast.success('Setting added!');
      setNewKey('');
      setNewValue('');
      fetchSettings();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const handleUpdate = async (id, value) => {
    try {
      await settingApi.update(id, { value });
      toast.success('Setting updated!');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Algolia reindex */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Search Indexing (Algolia)</h2>
        <div className="flex flex-wrap gap-3">
          {['labs', 'products', 'pages'].map((type) => (
            <button
              key={type}
              onClick={() => handleReindex(type)}
              disabled={!!reindexing}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FiRefreshCw className={reindexing === type ? 'animate-spin' : ''} />
              Reindex {type}
            </button>
          ))}
        </div>
      </div>

      {/* Add setting */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Add Setting</h2>
        <form onSubmit={handleAddSetting} className="flex gap-3">
          <input required value={newKey} onChange={(e) => setNewKey(e.target.value)} className="input flex-1" placeholder="Key (e.g. site_name)" />
          <input required value={newValue} onChange={(e) => setNewValue(e.target.value)} className="input flex-1" placeholder="Value" />
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add
          </button>
        </form>
      </div>

      {/* Settings list */}
      {loading ? <PageLoader /> : settings.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">All Settings ({settings.length})</h2>
          <div className="space-y-3">
            {settings.map((s) => (
              <div key={s._id} className="flex items-center gap-3">
                <span className="text-sm font-mono text-gray-500 w-48 flex-shrink-0">{s.key}</span>
                <input
                  defaultValue={typeof s.value === 'object' ? JSON.stringify(s.value) : s.value}
                  onBlur={(e) => handleUpdate(s._id, e.target.value)}
                  className="input flex-1 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
