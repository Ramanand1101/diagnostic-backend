'use client';
import { useState, useEffect, useCallback } from 'react';
import { testAvailabilityApi, labApi, brandApi, testMasterApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import CsvUploadSection from '@/components/ui/CsvUploadSection';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight, FiLayers } from 'react-icons/fi';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SCHEDULE_TYPES = [
  { v: 'everyday', l: 'Available Every Day' },
  { v: 'selectedDays', l: 'Selected Days' },
  { v: 'alternateDays', l: 'Alternate Days' },
  { v: 'specificDates', l: 'Specific Dates' },
  { v: 'dateRange', l: 'Date Range' },
  { v: 'customRecurring', l: 'Custom Recurring' },
  { v: 'temporaryDisable', l: 'Temporary Disable' },
  { v: 'permanentDisable', l: 'Permanent Disable' },
];
const UNAVAILABLE_TYPES = ['temporaryDisable', 'permanentDisable'];

function scopeLabel(r) {
  if (r.scope === 'lab') return r.lab?.name || 'Lab';
  if (r.scope === 'city') return `City: ${r.city}`;
  if (r.scope === 'state') return `State: ${r.state}`;
  return `Brand: ${r.brand?.name || ''}`;
}

function whenLabel(r) {
  switch (r.scheduleType) {
    case 'everyday': return 'Every day';
    case 'selectedDays': return (r.daysOfWeek || []).map((d) => DAY_NAMES[d].slice(0, 3)).join(', ');
    case 'alternateDays': return `Alternate days from ${formatDate(r.alternateAnchorDate)}`;
    case 'specificDates': return (r.specificDates || []).map((d) => formatDate(d)).join(', ');
    case 'dateRange': return `${formatDate(r.effectiveFrom)} – ${formatDate(r.effectiveTo)}`;
    case 'customRecurring': return `Every ${r.customIntervalDays} days from ${formatDate(r.alternateAnchorDate)}`;
    case 'temporaryDisable': return `Disabled ${formatDate(r.effectiveFrom)} – ${formatDate(r.effectiveTo)}`;
    case 'permanentDisable': return `Disabled from ${formatDate(r.effectiveFrom)}`;
    default: return '—';
  }
}

// ── Add/Edit form ──────────────────────────────────────────────────────────────
function RuleForm({ initial, labs, brands, tests, onSave, onClose }) {
  const [form, setForm] = useState({
    testMaster: initial?.testMaster?._id || initial?.testMaster || '',
    scope: initial?.scope || 'lab',
    lab: initial?.lab?._id || initial?.lab || '',
    city: initial?.city || '',
    state: initial?.state || '',
    brand: initial?.brand?._id || initial?.brand || '',
    scheduleType: initial?.scheduleType || 'everyday',
    daysOfWeek: initial?.daysOfWeek || [],
    alternateAnchorDate: initial?.alternateAnchorDate ? initial.alternateAnchorDate.slice(0, 10) : '',
    specificDates: (initial?.specificDates || []).map((d) => d.slice(0, 10)).join(', '),
    customIntervalDays: initial?.customIntervalDays || '',
    effectiveFrom: initial?.effectiveFrom ? initial.effectiveFrom.slice(0, 10) : '',
    effectiveTo: initial?.effectiveTo ? initial.effectiveTo.slice(0, 10) : '',
    reason: initial?.reason || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleDay = (d) => setForm((f) => ({ ...f, daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.scope === 'lab' && !form.lab) return toast.error('Select a lab');
    if (form.scope === 'city' && !form.city.trim()) return toast.error('Enter a city');
    if (form.scope === 'state' && !form.state.trim()) return toast.error('Enter a state');
    if (form.scope === 'brand' && !form.brand) return toast.error('Select a brand');
    if (form.scheduleType === 'selectedDays' && !form.daysOfWeek.length) return toast.error('Select at least one day');
    if (form.scheduleType === 'specificDates' && !form.specificDates.trim()) return toast.error('Provide at least one date');
    if (['dateRange', 'temporaryDisable'].includes(form.scheduleType) && (!form.effectiveFrom || !form.effectiveTo)) return toast.error('Select both start and end dates');
    if (['alternateDays', 'customRecurring'].includes(form.scheduleType) && !form.alternateAnchorDate) return toast.error('Select an anchor date');
    if (form.scheduleType === 'customRecurring' && !form.customIntervalDays) return toast.error('Enter the interval in days');

    const payload = {
      ...form,
      testMaster: form.testMaster || null,
      brand: form.scope === 'brand' ? form.brand : null,
      specificDates: form.scheduleType === 'specificDates' ? form.specificDates.split(',').map((d) => d.trim()).filter(Boolean) : [],
    };

    setSaving(true);
    try {
      if (initial?._id) await testAvailabilityApi.update(initial._id, payload);
      else await testAvailabilityApi.create(payload);
      toast.success(initial ? 'Rule updated!' : 'Rule added!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Test / Package</label>
        <select value={form.testMaster} onChange={(e) => set('testMaster', e.target.value)} className="input">
          <option value="">All tests (blanket rule)</option>
          {tests.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Scope (higher specificity always wins)</label>
        <div className="grid grid-cols-4 gap-2">
          {[{ v: 'brand', l: 'Brand' }, { v: 'state', l: 'State' }, { v: 'city', l: 'City' }, { v: 'lab', l: 'Lab' }].map((o) => (
            <button key={o.v} type="button" onClick={() => set('scope', o.v)}
              className={`py-2 text-xs font-medium rounded-lg border transition-colors ${form.scope === o.v ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {form.scope === 'brand' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
          <select value={form.brand} onChange={(e) => set('brand', e.target.value)} className="input" required>
            <option value="">Select brand</option>
            {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      )}
      {form.scope === 'state' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input value={form.state} onChange={(e) => set('state', e.target.value)} className="input" placeholder="e.g. Uttar Pradesh" required />
        </div>
      )}
      {form.scope === 'city' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input" placeholder="e.g. Lucknow" required />
        </div>
      )}
      {form.scope === 'lab' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab</label>
          <select value={form.lab} onChange={(e) => set('lab', e.target.value)} className="input" required>
            <option value="">Select lab</option>
            {labs.map((l) => <option key={l._id} value={l._id}>{l.name} — {l.city}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Availability Pattern</label>
        <select value={form.scheduleType} onChange={(e) => set('scheduleType', e.target.value)} className="input">
          {SCHEDULE_TYPES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      {form.scheduleType === 'selectedDays' && (
        <div className="flex flex-wrap gap-1.5">
          {DAY_NAMES.map((d, i) => (
            <button key={d} type="button" onClick={() => toggleDay(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border ${form.daysOfWeek.includes(i) ? 'bg-secondary-600 text-white border-secondary-600' : 'border-gray-200 text-gray-600'}`}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {['alternateDays', 'customRecurring'].includes(form.scheduleType) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anchor Date</label>
            <input type="date" value={form.alternateAnchorDate} onChange={(e) => set('alternateAnchorDate', e.target.value)} className="input" required />
          </div>
          {form.scheduleType === 'customRecurring' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interval (days)</label>
              <input type="number" min="1" value={form.customIntervalDays} onChange={(e) => set('customIntervalDays', e.target.value)} className="input" required />
            </div>
          )}
        </div>
      )}

      {form.scheduleType === 'specificDates' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dates (comma-separated, YYYY-MM-DD)</label>
          <input value={form.specificDates} onChange={(e) => set('specificDates', e.target.value)} className="input" placeholder="2026-08-15, 2026-08-20" required />
        </div>
      )}

      {['dateRange', 'temporaryDisable', 'permanentDisable'].includes(form.scheduleType) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{form.scheduleType === 'permanentDisable' ? 'Effective From' : 'Start Date'}</label>
            <input type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} className="input" required />
          </div>
          {form.scheduleType !== 'permanentDisable' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.effectiveTo} onChange={(e) => set('effectiveTo', e.target.value)} className="input" required />
            </div>
          )}
        </div>
      )}

      {UNAVAILABLE_TYPES.includes(form.scheduleType) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Unavailability</label>
          <select value={form.reason} onChange={(e) => set('reason', e.target.value)} className="input">
            <option value="">Select reason</option>
            <option value="Machine Maintenance">Machine Maintenance</option>
            <option value="Technician Not Available">Technician Not Available</option>
            <option value="Reagent Out of Stock">Reagent Out of Stock</option>
            <option value="Other">Other</option>
          </select>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Rule'}</button>
      </div>
    </form>
  );
}

// ── Bulk-apply-to-many-labs form ──────────────────────────────────────────────
function BulkApplyForm({ labs, tests, onSave, onClose }) {
  const [labIds, setLabIds] = useState([]);
  const [testMaster, setTestMaster] = useState('');
  const [scheduleType, setScheduleType] = useState('everyday');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleLab = (id) => setLabIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!labIds.length) return toast.error('Select at least one lab');
    setSaving(true);
    try {
      const res = await testAvailabilityApi.bulkApply(labIds, { testMaster: testMaster || null, scheduleType, reason });
      toast.success(`Applied to ${res.data.created} lab(s)`);
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Test / Package</label>
        <select value={testMaster} onChange={(e) => setTestMaster(e.target.value)} className="input">
          <option value="">All tests (blanket rule)</option>
          {tests.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
        <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)} className="input">
          <option value="everyday">Available Every Day</option>
          <option value="permanentDisable">Permanent Disable</option>
        </select>
      </div>
      {scheduleType === 'permanentDisable' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder="e.g. Machine Maintenance" />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Apply to Labs</label>
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
          {labs.map((l) => (
            <label key={l._id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={labIds.includes(l._id)} onChange={() => toggleLab(l._id)} />
              {l.name} — {l.city}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{labIds.length} lab(s) selected</p>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Applying…' : 'Apply to Selected Labs'}</button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TestAvailabilityPage() {
  const [rules, setRules] = useState([]);
  const [labs, setLabs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ scope: '', active: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchRules = useCallback(() => {
    setLoading(true);
    const params = { limit: 500 };
    if (filters.scope) params.scope = filters.scope;
    if (filters.active) params.active = filters.active;
    testAvailabilityApi.getAll(params)
      .then((res) => setRules(res.data.items || []))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchRules(); }, [fetchRules]);
  useEffect(() => {
    labApi.getAll({ limit: 500, approved: true }).then((r) => setLabs(r.data.items || []));
    brandApi.getAll({ limit: 500 }).then((r) => setBrands(r.data.items || []));
    testMasterApi.list({ limit: 1000 }).then((r) => setTests(r.data.items || []));
  }, []);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (r) => { setEditing(r); setModalOpen(true); };

  const handleToggle = async (r) => {
    try {
      await testAvailabilityApi.toggleActive(r._id);
      toast.success(r.active ? 'Rule deactivated' : 'Rule activated');
      fetchRules();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (r) => {
    if (!confirm('Delete this availability rule?')) return;
    try {
      await testAvailabilityApi.remove(r._id);
      toast.success('Rule deleted');
      fetchRules();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Availability Rule' : 'Add Availability Rule'} size="md">
        <RuleForm initial={editing} labs={labs} brands={brands} tests={tests}
          onSave={() => { setModalOpen(false); fetchRules(); }} onClose={() => setModalOpen(false)} />
      </Modal>
      <Modal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Bulk Apply Rule to Multiple Labs" size="md">
        <BulkApplyForm labs={labs} tests={tests}
          onSave={() => { setBulkModalOpen(false); fetchRules(); }} onClose={() => setBulkModalOpen(false)} />
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Availability Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control which tests/packages are bookable, at Brand → State → City → Lab → Date-Override priority.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkModalOpen(true)} className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 hover:border-primary-300 text-gray-700 rounded-xl font-medium">
            <FiLayers size={14} /> Bulk Apply
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 text-sm px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium">
            <FiPlus size={14} /> Add Rule
          </button>
        </div>
      </div>

      <CsvUploadSection
        title="Bulk Import Availability via CSV"
        description="Add many availability rules at once — one row per rule (test, scope, schedule type)."
        onDemoDownload={testAvailabilityApi.demoCsv}
        onUpload={testAvailabilityApi.bulkCsv}
        demoFileName="test-availability-template.csv"
        onSuccess={fetchRules}
      />

      <div className="flex flex-wrap gap-2">
        {['', 'brand', 'state', 'city', 'lab'].map((s) => (
          <button key={s} onClick={() => setFilters((f) => ({ ...f, scope: s }))}
            className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize ${filters.scope === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {s || 'All Scopes'}
          </button>
        ))}
        <span className="w-px bg-gray-200 mx-1" />
        {[{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }].map((o) => (
          <button key={o.v} onClick={() => setFilters((f) => ({ ...f, active: o.v }))}
            className={`px-3 py-1.5 text-xs font-medium rounded-full ${filters.active === o.v ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {o.l}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Test / Package</th>
                  <th className="table-header">Scope</th>
                  <th className="table-header">Pattern</th>
                  <th className="table-header">Reason</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-sm text-gray-800">{r.testMaster?.name || 'All tests'}</td>
                    <td className="table-cell text-sm text-gray-600">{scopeLabel(r)}</td>
                    <td className="table-cell text-sm text-gray-600">{whenLabel(r)}</td>
                    <td className="table-cell text-sm text-gray-500">{r.reason || '—'}</td>
                    <td className="table-cell">
                      <button onClick={() => handleToggle(r)} className={`flex items-center gap-1 text-xs font-semibold ${r.active ? 'text-green-600' : 'text-gray-400'}`}>
                        {r.active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                        {r.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} title="Edit" className="text-gray-400 hover:text-primary-600"><FiEdit size={14} /></button>
                        <button onClick={() => handleDelete(r)} title="Delete" className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-10">No availability rules configured — all tests are bookable everywhere by default</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
