'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { testMasterApi, categoryApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import CsvUploadSection from '@/components/ui/CsvUploadSection';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiList, FiDownload } from 'react-icons/fi';

const REPORT_PRESETS = ['Same day', '4 hours', '8 hours', '12 hours', '24 hours', '48 hours', '2-3 days'];
const SAMPLE_PRESETS = ['Blood', 'Urine', 'Stool', 'Saliva', 'Swab', 'Multiple'];

// Auto-format report time: "24" → "24 hours", "Same day" → unchanged
function formatReportTime(val) {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^\d+$/.test(trimmed)) return `${trimmed} hours`;
  return trimmed;
}

function TestMasterForm({ initial, categories, onSave, onClose }) {
  const [subcategories, setSubcategories] = useState([]);
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category?._id || initial?.category || '',
    subcategory: initial?.subcategory?._id || initial?.subcategory || '',
    sampleType: initial?.sampleType || '',
    reportTime: initial?.reportTime || '',
    description: initial?.description || '',
    fastingRequired: initial?.fastingRequired || false,
    homeCollection: initial?.homeCollection || false,
    isActive: initial?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.category) {
      categoryApi.getSubcategories(form.category)
        .then((r) => setSubcategories(r.data.items || []))
        .catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
    }
  }, [form.category]);

  const handleReportTimeBlur = () => {
    setForm((f) => ({ ...f, reportTime: formatReportTime(f.reportTime) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Test name is required');
    setLoading(true);
    const payload = { ...form, reportTime: formatReportTime(form.reportTime), subcategory: form.subcategory || null };
    try {
      if (initial?._id) await testMasterApi.update(initial._id, payload);
      else await testMasterApi.create(payload);
      toast.success(initial ? 'Updated!' : 'Test added to master list!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
        <input
          required autoFocus
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
          placeholder="e.g. Complete Blood Count (CBC)"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })} className="input">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
          <select value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className="input" disabled={!form.category || subcategories.length === 0}>
            <option value="">Select subcategory</option>
            {subcategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Sample Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sample Type</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {SAMPLE_PRESETS.map((opt) => (
            <button key={opt} type="button"
              onClick={() => setForm((f) => ({ ...f, sampleType: f.sampleType === opt ? '' : opt }))}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${form.sampleType === opt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
              {opt}
            </button>
          ))}
        </div>
        <input
          value={SAMPLE_PRESETS.includes(form.sampleType) ? '' : form.sampleType}
          onChange={(e) => setForm({ ...form, sampleType: e.target.value })}
          className="input text-sm"
          placeholder="Or type custom (e.g. Sputum, CSF...)"
        />
      </div>

      {/* Report Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Report Time</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {REPORT_PRESETS.map((opt) => (
            <button key={opt} type="button"
              onClick={() => setForm((f) => ({ ...f, reportTime: f.reportTime === opt ? '' : opt }))}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${form.reportTime === opt ? 'bg-secondary-500 text-white border-secondary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-secondary-300'}`}>
              {opt}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={REPORT_PRESETS.includes(form.reportTime) ? '' : form.reportTime}
            onChange={(e) => setForm({ ...form, reportTime: e.target.value })}
            onBlur={handleReportTimeBlur}
            className="input text-sm flex-1"
            placeholder="Type number (e.g. 24) → auto becomes '24 hours'"
          />
          {form.reportTime && !REPORT_PRESETS.includes(form.reportTime) && (
            <span className="text-xs text-primary-600 font-medium shrink-0">→ {formatReportTime(form.reportTime)}</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} placeholder="What this test checks..." />
      </div>

      <div className="flex flex-wrap gap-4">
        {[
          { key: 'fastingRequired', label: 'Fasting Required' },
          { key: 'homeCollection', label: 'Home Collection' },
          { key: 'isActive', label: 'Active' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
            {label}
          </label>
        ))}
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Test'}</button>
      </div>
    </form>
  );
}

export default function TestMasterPage() {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null);
  const searchTimer = useRef(null);

  const fetchTests = useCallback(() => {
    setLoading(true);
    testMasterApi.list({ page, limit, q: q || undefined, category: catFilter || undefined })
      .then((res) => { setTests(res.data.items || []); setTotal(res.data.total || 0); })
      .finally(() => setLoading(false));
  }, [page, limit, q, catFilter]);

  useEffect(() => { fetchTests(); }, [fetchTests]);
  useEffect(() => { categoryApi.getTopLevel().then((r) => setCategories(r.data.items || [])); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this test from master list?')) return;
    try { await testMasterApi.delete(id); toast.success('Deleted'); fetchTests(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Master List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Central library of test names. Use these when adding products — lab sets the price.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await testMasterApi.exportCsv();
                const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
                const a = document.createElement('a'); a.href = url; a.download = 'test-master-export.csv'; a.click();
                URL.revokeObjectURL(url);
              } catch { toast.error('Export failed'); }
            }}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FiDownload size={14} /> Download CSV
          </button>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus /> Add Test
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      <CsvUploadSection
        title="Bulk Upload Tests via CSV"
        description="Upload test names with category, sample type, report time. Existing names are updated."
        onDemoDownload={testMasterApi.demoCsv}
        onUpload={testMasterApi.bulkCsv}
        demoFileName="test-master-template.csv"
        onSuccess={fetchTests}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input type="text" placeholder="Search test name…" onChange={(e) => {
            clearTimeout(searchTimer.current);
            const v = e.target.value;
            searchTimer.current = setTimeout(() => { setQ(v); setPage(1); }, 400);
          }} className="input pl-9 py-2 text-sm w-full" />
        </div>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} className="input max-w-[180px] text-sm">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{total} tests</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Test Name</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Sample</th>
                  <th className="table-header">Report Time</th>
                  <th className="table-header">Flags</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tests.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">{t.name}</td>
                    <td className="table-cell">
                      <p className="text-sm text-gray-700">{t.category?.name || '—'}</p>
                      {t.subcategory?.name && <p className="text-xs text-gray-400">{t.subcategory.name}</p>}
                    </td>
                    <td className="table-cell text-sm text-gray-600">{t.sampleType || '—'}</td>
                    <td className="table-cell text-sm text-gray-600">{t.reportTime || '—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {t.fastingRequired && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">Fasting</span>}
                        {t.homeCollection && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Home</span>}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => setModal({ type: 'edit', test: t })} className="text-gray-400 hover:text-primary-600 p-1.5 hover:bg-gray-100 rounded-lg"><FiEdit size={14} /></button>
                        <button onClick={() => handleDelete(t._id)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-16">
                      <FiList className="mx-auto text-4xl text-gray-300 mb-3" />
                      <p className="text-gray-500">No tests in master list yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add tests here or bulk upload via CSV</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      <Modal open={modal?.type === 'add'} onClose={() => setModal(null)} title="Add Test to Master List" size="lg">
        <TestMasterForm categories={categories} onSave={() => { setModal(null); fetchTests(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edit Test" size="lg">
        <TestMasterForm initial={modal?.test} categories={categories} onSave={() => { setModal(null); fetchTests(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
