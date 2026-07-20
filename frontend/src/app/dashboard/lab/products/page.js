'use client';
import { useState, useEffect, useRef } from 'react';
import { labApi, productApi, categoryApi, testMasterApi } from '@/lib/api';
import { formatCurrency, getErrorMessage } from '@/utils/helpers';
import toast from 'react-hot-toast';
import Spinner, { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiPackage, FiDollarSign, FiLock, FiSearch, FiZap, FiUploadCloud, FiDownload, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

const EMPTY_PRODUCT = {
  name: '', price: '', salePrice: '',
  description: '', reportTime: '', sampleType: '',
  fastingRequired: false, homeCollection: false, isActive: true,
  category: '', subcategory: '', tags: '',
};

// Price-only modal for admin-added tests
function SetPriceModal({ product, onSave, onClose }) {
  const [price, setPrice] = useState(product.price || '');
  const [salePrice, setSalePrice] = useState(product.salePrice || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!price || Number(price) <= 0) return toast.error('Price is required');
    setLoading(true);
    try {
      await productApi.setPrice(product._id, {
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : undefined,
      });
      toast.success('Price updated!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-3 mb-2">
        <p className="font-medium text-gray-800">{product.name}</p>
        {product.category?.name && <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">MRP / Price (₹) *</label>
          <input type="number" min="1" required value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="500" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (₹)</label>
          <input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="input" placeholder="399" />
        </div>
      </div>
      {salePrice && Number(salePrice) >= Number(price) && (
        <p className="text-xs text-red-500">Sale price should be less than MRP</p>
      )}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Set Price'}</button>
      </div>
    </form>
  );
}

// ── Bulk Upload Section ──────────────────────────────────────────────────────
function BulkUploadSection({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const downloadDemo = async () => {
    try {
      const res = await productApi.labDemoCsv();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'lab-tests-template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not download template'); }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setResult(null);
    try {
      const res = await productApi.labBulkCsv(file);
      setResult(res.data);
      if (res.data.created > 0) {
        toast.success(`${res.data.created} test(s) uploaded!`);
        onSuccess();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
        <span className="flex items-center gap-2"><FiUploadCloud className="text-primary-500" /> Bulk Upload Tests via CSV</span>
        <span className="text-xs text-gray-400">{open ? '▲ Hide' : '▼ Expand'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 mt-3">
            <p className="font-semibold mb-1">CSV Columns:</p>
            <p className="font-mono text-[11px] bg-blue-100 px-2 py-1 rounded">
              name, price, salePrice, reportTime, sampleType, fastingRequired, homeCollection, description, category, tags
            </p>
            <p className="mt-1.5 text-blue-600">Tags use semicolons: <code>cbc;blood;anemia</code></p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={downloadDemo}
              className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 bg-white rounded-lg hover:border-primary-300 transition-colors text-gray-700">
              <FiDownload size={13} className="text-primary-500" /> Download Template
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60">
              <FiUploadCloud size={13} /> {uploading ? 'Uploading…' : 'Upload CSV File'}
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.created > 0 ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                <FiCheckCircle className="text-green-500" size={14} />
                {result.created} test(s) created out of {result.total} rows
              </div>
              {result.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-1">
                    <FiAlertTriangle size={11} /> {result.errors.length} error(s):
                  </p>
                  <ul className="space-y-0.5">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-600">Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabProductsPage() {
  const [lab, setLab] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [priceModal, setPriceModal] = useState(null); // admin-added product
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'admin' | 'mine'
  const [masterSuggestions, setMasterSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [masterPicked, setMasterPicked] = useState(false);
  const masterTimer = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const labRes = await labApi.getMine();
        if (!labRes.data) { setLoading(false); return; }
        setLab(labRes.data);
        const [prodRes, catRes] = await Promise.all([
          productApi.getAll({ lab: labRes.data._id, limit: 200 }),
          categoryApi.getTopLevel(),
        ]);
        setProducts(prodRes.data.items || []);
        setCategories(catRes.data.items || []);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, name: val }));
    setMasterPicked(false); // user is typing freely — not from master list
    clearTimeout(masterTimer.current);
    if (val.length < 2) { setMasterSuggestions([]); setShowSuggestions(false); return; }
    masterTimer.current = setTimeout(async () => {
      try {
        const res = await testMasterApi.search(val);
        const items = res.data.items || res.data || [];
        setMasterSuggestions(items.slice(0, 8));
        setShowSuggestions(items.length > 0);
      } catch { setMasterSuggestions([]); }
    }, 250);
  };

  const pickMasterTest = (test) => {
    setForm((f) => ({
      ...f,
      name: test.name,
      description: test.description || f.description,
      sampleType: test.sampleType || f.sampleType,
      reportTime: test.reportTime || f.reportTime,
      fastingRequired: test.fastingRequired ?? f.fastingRequired,
      homeCollection: test.homeCollection ?? f.homeCollection,
      category: test.category?._id || test.category || f.category,
      subcategory: test.subcategory?._id || test.subcategory || f.subcategory,
    }));
    setMasterPicked(true);
    setShowSuggestions(false);
    setMasterSuggestions([]);
  };

  const openAdd = () => { setForm(EMPTY_PRODUCT); setEditing(null); setMasterPicked(false); setShowForm(true); };
  const openEdit = (p) => {
    const catId = p.category?._id || p.category || '';
    if (catId) categoryApi.getSubcategories(catId).then((r) => setSubcategories(r.data.items || []));
    setForm({
      name: p.name || '', price: p.price || '', salePrice: p.salePrice || '',
      description: p.description || '', reportTime: p.reportTime || '',
      sampleType: p.sampleType || '', fastingRequired: p.fastingRequired || false,
      homeCollection: p.homeCollection || false, isActive: p.isActive !== false,
      category: catId, subcategory: p.subcategory?._id || p.subcategory || '',
      tags: (p.tags || []).join(', '),
    });
    setMasterPicked(true);
    setEditing(p);
    setShowForm(true);
    // Auto-populate from test master on open
    if (p.name) {
      testMasterApi.search(p.name)
        .then((r) => {
          const items = r.data.items || r.data || [];
          const match = items.find((t) => t.name.toLowerCase() === p.name.toLowerCase()) || items[0];
          if (!match) return;
          setForm((f) => ({
            ...f,
            sampleType: match.sampleType || f.sampleType,
            reportTime: match.reportTime || f.reportTime,
            fastingRequired: match.fastingRequired ?? f.fastingRequired,
            homeCollection: match.homeCollection ?? f.homeCollection,
            description: match.description || f.description,
            category: match.category?._id || match.category || f.category,
            subcategory: match.subcategory?._id || match.subcategory || f.subcategory,
          }));
        })
        .catch(() => {});
    }
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setMasterPicked(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lab) { toast.error('Set up your lab profile first'); return; }
    if (!masterPicked) {
      toast.error('Please select a test from the master list — custom names are not allowed');
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form, lab: lab._id,
        price: Number(form.price),
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        category: form.category || undefined,
        subcategory: form.subcategory || null,
      };
      let res;
      if (editing) {
        res = await productApi.update(editing._id, payload);
        setProducts((prev) => prev.map((p) => p._id === editing._id ? res.data : p));
        toast.success('Updated!');
      } else {
        res = await productApi.create(payload);
        setProducts((prev) => [res.data, ...prev]);
        toast.success('Test/Package added!');
      }
      closeForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this test/package?')) return;
    setDeleting(id);
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const afterPriceSet = async () => {
    const labRes = await labApi.getMine();
    const prodRes = await productApi.getAll({ lab: labRes.data._id, limit: 200 });
    setProducts(prodRes.data.items || []);
    setPriceModal(null);
  };

  if (loading) return <PageLoader />;
  if (!lab) return (
    <div className="card text-center py-16">
      <FiPackage className="text-4xl text-gray-300 mx-auto mb-3" />
      <p className="font-semibold text-gray-700">Set up your lab profile first</p>
    </div>
  );

  const adminTests = products.filter((p) => p.addedByAdmin);
  const myTests = products.filter((p) => !p.addedByAdmin);
  const displayedProducts = activeTab === 'admin' ? adminTests : activeTab === 'mine' ? myTests : products;
  const unpricedAdminTests = adminTests.filter((p) => !p.price || p.price === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tests & Packages</h1>
          <p className="text-sm text-gray-400 mt-0.5">{lab.name} &bull; {products.length} total</p>
        </div>
        {!showForm && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus /> Add New
          </button>
        )}
      </div>

      {/* Bulk Upload section */}
      <BulkUploadSection onSuccess={async () => {
        const [labRes, prodRes] = await Promise.all([labApi.getMine(), productApi.getAll({ lab: lab._id, limit: 200 })]);
        setLab(labRes.data);
        setProducts(prodRes.data.items || []);
      }} />

      {/* Alert for unpriced admin tests */}
      {unpricedAdminTests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <FiDollarSign className="text-amber-600 mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-800">{unpricedAdminTests.length} tests need pricing</p>
            <p className="text-xs text-amber-700 mt-0.5">Admin has added tests to your lab. Please set prices for them.</p>
            <button onClick={() => setActiveTab('admin')} className="text-xs text-amber-700 underline mt-1">View admin-added tests →</button>
          </div>
        </div>
      )}

      {/* Tab filter */}
      <div className="flex gap-2">
        {[
          { val: 'all', label: `All (${products.length})` },
          { val: 'admin', label: `Admin Added (${adminTests.length})` },
          { val: 'mine', label: `My Tests (${myTests.length})` },
        ].map(({ val, label }) => (
          <button key={val} onClick={() => setActiveTab(val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${activeTab === val ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card border-2 border-primary-100 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{editing ? 'Edit Test / Package' : 'Add New Test / Package'}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><FiX /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name with master test autocomplete — ONLY master list names allowed */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                {masterPicked ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <FiCheckCircle size={11} /> Selected from master list
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-primary-600">
                    <FiZap size={10} /> Must select from master list
                  </span>
                )}
              </div>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  ref={nameRef}
                  name="name"
                  required
                  value={form.name}
                  onChange={handleNameChange}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => masterSuggestions.length > 0 && setShowSuggestions(true)}
                  className={`input pl-9 pr-8 ${masterPicked ? 'border-green-400 focus:border-green-500 focus:ring-green-200' : form.name.length > 0 ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-200' : ''}`}
                  placeholder="Type test name — then pick from suggestions…"
                  autoComplete="off"
                />
                {masterPicked && (
                  <FiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={15} />
                )}
              </div>
              {!masterPicked && form.name.length > 0 && !showSuggestions && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <FiAlertTriangle size={11} /> Type more to see suggestions, then select one from the list
                </p>
              )}
              {showSuggestions && masterSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-primary-50 border-b border-gray-100">
                    <p className="text-[11px] text-primary-700 font-medium">Master Test List — click to auto-fill</p>
                  </div>
                  {masterSuggestions.map((t) => (
                    <button key={t._id} type="button" onMouseDown={() => pickMasterTest(t)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50 text-left transition-colors border-b border-gray-50 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                        <FiZap size={12} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {[t.category?.name, t.sampleType].filter(Boolean).join(' · ') || 'No category'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" value={form.category} onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, category: val, subcategory: '' }));
                  if (val) categoryApi.getSubcategories(val).then((r) => setSubcategories(r.data.items || []));
                  else setSubcategories([]);
                }} className="input">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <select name="subcategory" value={form.subcategory} onChange={handle} className="input" disabled={!form.category || subcategories.length === 0}>
                  <option value="">Select subcategory</option>
                  {subcategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                <input name="price" type="number" required min="0" value={form.price} onChange={handle} className="input" placeholder="500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (₹)</label>
                <input name="salePrice" type="number" min="0" value={form.salePrice} onChange={handle} className="input" placeholder="399" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Time</label>
              <div className="flex flex-wrap gap-2">
                {['Same day', '4 hours', '8 hours', '12 hours', '24 hours', '48 hours', '2–3 days'].map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, reportTime: f.reportTime === opt ? '' : opt }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${form.reportTime === opt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input name="tags" value={form.tags} onChange={handle} className="input" placeholder="cbc, hemoglobin, anemia" />
            </div>
            <div className="flex gap-6">
              <Toggle label="Fasting Required" name="fastingRequired" checked={form.fastingRequired} onChange={handle} />
              <Toggle label="Home Collection" name="homeCollection" checked={form.homeCollection} onChange={handle} />
              <Toggle label="Active" name="isActive" checked={form.isActive} onChange={handle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !masterPicked} className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Spinner size="sm" /> : <FiSave />}
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Test / Package'}
              </button>
              <button type="button" onClick={closeForm} className="btn-outline px-6">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Product list */}
      {displayedProducts.length === 0 ? (
        <div className="card text-center py-16">
          <FiPackage className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{activeTab === 'admin' ? 'No admin-added tests yet' : activeTab === 'mine' ? 'No tests added by you yet' : 'No tests or packages yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedProducts.map((p) => (
            <div key={p._id} className={`card flex items-center justify-between gap-4 ${p.addedByAdmin && (!p.price || p.price === 0) ? 'border-amber-200 bg-amber-50/30' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.addedByAdmin && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                      <FiLock size={10} /> Admin Added
                    </span>
                  )}
                  {p.category?.name && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.category.name}</span>}
                  {!p.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactive</span>}
                </div>
                <p className="font-semibold text-gray-900 mt-1 truncate">{p.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {p.price ? (
                    <>
                      <span className="text-primary-600 font-bold text-sm">{formatCurrency(p.salePrice || p.price)}</span>
                      {p.salePrice && <span className="text-gray-400 text-xs line-through">{formatCurrency(p.price)}</span>}
                    </>
                  ) : (
                    <span className="text-amber-600 text-xs font-medium">⚠ Price not set</span>
                  )}
                  {p.reportTime && <span className="text-xs text-gray-400">· {p.reportTime}</span>}
                  {p.sampleType && <span className="text-xs text-gray-400">· {p.sampleType}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {p.addedByAdmin ? (
                  // Admin tests: only price editing
                  <button
                    onClick={() => setPriceModal(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <FiDollarSign size={13} /> Set Price
                  </button>
                ) : (
                  // Lab's own tests: full edit + delete
                  <>
                    <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-primary-50">
                      <FiEdit2 className="text-sm" />
                    </button>
                    <button onClick={() => handleDelete(p._id)} disabled={deleting === p._id} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                      {deleting === p._id ? <Spinner size="sm" /> : <FiTrash2 className="text-sm" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set Price Modal for admin-added tests */}
      <Modal open={!!priceModal} onClose={() => setPriceModal(null)} title="Set Test Price" size="sm">
        {priceModal && (
          <SetPriceModal product={priceModal} onSave={afterPriceSet} onClose={() => setPriceModal(null)} />
        )}
      </Modal>
    </div>
  );
}

function Toggle({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
        <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-secondary-500' : 'bg-gray-300'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
