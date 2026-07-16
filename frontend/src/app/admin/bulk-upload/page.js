'use client';
import { useState, useEffect } from 'react';
import { labApi, productApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

// Default multipliers matching the seed script
const DEFAULT_MULTIPLIERS = {
  'pathcare@lucknow.in':   0.85,
  'apollo@lucknow.in':     1.00,
  'lalpathlab@lucknow.in': 0.92,
  'metropolis@lucknow.in': 1.08,
  'srl@lucknow.in':        0.88,
  'thyrocare@lucknow.in':  0.78,
  'aggarwal@lucknow.in':   0.72,
  'medanta@lucknow.in':    1.18,
  'redcliffe@lucknow.in':  0.82,
  'vijay@lucknow.in':      0.76,
};

function LabRow({ lab, checked, multiplier, onToggle, onMultiplierChange }) {
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
      checked ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(lab._id)}
        className="w-4 h-4 rounded text-primary-600 cursor-pointer"
        id={`lab-${lab._id}`}
      />
      <label htmlFor={`lab-${lab._id}`} className="flex-1 cursor-pointer">
        <p className="text-sm font-medium text-gray-900">{lab.name}</p>
        <p className="text-xs text-gray-500">{lab.address || lab.city}</p>
      </label>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-500">Multiplier</span>
        <input
          type="number"
          step="0.01"
          min="0.1"
          max="5"
          value={multiplier}
          disabled={!checked}
          onChange={(e) => onMultiplierChange(lab._id, parseFloat(e.target.value) || 1)}
          className="w-20 text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-40 disabled:bg-gray-50 text-center"
        />
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          multiplier < 0.9 ? 'bg-green-100 text-green-700' :
          multiplier > 1.05 ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {multiplier < 0.9 ? 'Budget' : multiplier > 1.05 ? 'Premium' : 'Standard'}
        </span>
      </div>
    </div>
  );
}

export default function BulkUploadPage() {
  const [labs, setLabs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState({});      // { labId: true/false }
  const [multipliers, setMultipliers] = useState({});      // { labId: number }
  const [uploading, setUploading]     = useState(false);
  const [result, setResult]           = useState(null);    // { created, skipped, total, labs }
  const [skipExisting, setSkipExisting] = useState(true);

  useEffect(() => {
    labApi.getAll({ limit: 100, city: 'Lucknow' })
      .then((res) => {
        const lucknowLabs = res.data.items || res.data.labs || [];
        setLabs(lucknowLabs);

        // Pre-select all, set default multipliers
        const sel = {}, mults = {};
        lucknowLabs.forEach((lab) => {
          sel[lab._id]   = true;
          mults[lab._id] = DEFAULT_MULTIPLIERS[lab.email] ?? 1.0;
        });
        setSelected(sel);
        setMultipliers(mults);
      })
      .catch(() => toast.error('Failed to load labs'))
      .finally(() => setLoading(false));
  }, []);

  const toggleAll = (val) => {
    const next = {};
    labs.forEach((l) => { next[l._id] = val; });
    setSelected(next);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const TEST_COUNT    = 420; // approximate catalogue size

  const handleUpload = async () => {
    const labIds = labs.filter((l) => selected[l._id]).map((l) => l._id);
    if (!labIds.length) { toast.error('Select at least one lab'); return; }

    setUploading(true);
    setResult(null);
    try {
      const mults = {};
      labIds.forEach((id) => { mults[id] = multipliers[id] ?? 1.0; });

      const res = await productApi.bulkUploadTests({ labIds, multipliers: mults, skipExisting });
      setResult(res.data);
      toast.success(`Done! ${res.data.created} tests created across ${labIds.length} labs.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Tests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload the full Lucknow test catalogue ({TEST_COUNT}+ tests) to selected labs with custom pricing.
        </p>
      </div>

      {/* Explanation card */}
      <div className="card border-l-4 border-l-primary-400 bg-primary-50 space-y-2">
        <h2 className="font-semibold text-primary-800">What does Bulk Upload do?</h2>
        <ul className="text-sm text-primary-700 space-y-1 list-disc list-inside">
          <li>Takes a fixed catalogue of <strong>{TEST_COUNT}+ common diagnostic tests</strong> (CBC, LFT, KFT, Thyroid, etc.)</li>
          <li>Creates one product record per test for each lab you select</li>
          <li>Applies a <strong>price multiplier</strong> per lab — e.g. 0.85 = 15% cheaper than the reference price</li>
          <li>Syncs every new product to <strong>Algolia</strong> so it appears instantly in search</li>
          <li>"Skip existing" mode avoids duplicates — safe to run multiple times</li>
        </ul>
        <p className="text-xs text-primary-600 pt-1">Use this once after adding new labs, or to refresh pricing across all labs at once.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tests in catalogue', value: `${TEST_COUNT}+` },
          { label: 'Labs selected',      value: selectedCount },
          { label: 'Products to create', value: selectedCount ? `~${(TEST_COUNT * selectedCount).toLocaleString()}` : '0' },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center py-4">
            <p className="text-2xl font-bold text-primary-600">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-900">Options</h2>
        <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.target.checked)}
            className="w-4 h-4 rounded text-primary-600"
          />
          <span>
            <strong>Skip existing</strong> — don't overwrite products that are already in the database
          </span>
        </label>
      </div>

      {/* Lab selection */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Select Labs &amp; Set Multipliers</h2>
          <div className="flex gap-2">
            <button onClick={() => toggleAll(true)}  className="text-xs text-primary-600 hover:underline">Select all</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:underline">Clear</button>
          </div>
        </div>

        {labs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No Lucknow labs found. Run <code className="bg-gray-100 px-1 rounded">npm run seed:lucknow-10labs</code> first.
          </p>
        ) : (
          <div className="space-y-2">
            {labs.map((lab) => (
              <LabRow
                key={lab._id}
                lab={lab}
                checked={!!selected[lab._id]}
                multiplier={multipliers[lab._id] ?? 1.0}
                onToggle={(id) => setSelected((s) => ({ ...s, [id]: !s[id] }))}
                onMultiplierChange={(id, val) => setMultipliers((m) => ({ ...m, [id]: val }))}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          Multiplier × base price = lab price. 0.85 = 15% cheaper than reference. 1.18 = 18% premium.
        </p>
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={uploading || selectedCount === 0}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-60"
      >
        {uploading ? (
          <>
            <FiRefreshCw className="animate-spin" />
            Uploading… this may take a minute
          </>
        ) : (
          <>
            <FiUploadCloud />
            Upload Tests to {selectedCount} Lab{selectedCount !== 1 ? 's' : ''}
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className={`card border-l-4 ${result.created > 0 ? 'border-l-green-500' : 'border-l-yellow-400'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.created > 0
              ? <FiCheckCircle className="text-green-500 text-xl shrink-0" />
              : <FiAlertCircle className="text-yellow-500 text-xl shrink-0" />
            }
            <h3 className="font-semibold text-gray-900">Upload Complete</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-green-600">{result.created.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Created</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-400">{result.skipped.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-700">{result.total.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total processed</p>
            </div>
          </div>
          {result.labs?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Labs updated:</p>
              <div className="flex flex-wrap gap-1">
                {result.labs.map((l) => (
                  <span key={l._id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
