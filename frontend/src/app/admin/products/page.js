'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { productApi, categoryApi, labApi, testMasterApi } from '@/lib/api';
import { formatCurrency, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import CsvUploadSection from '@/components/ui/CsvUploadSection';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiDollarSign } from 'react-icons/fi';

function formatReportTime(val) {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^\d+$/.test(trimmed)) return `${trimmed} hours`;
  return trimmed;
}

function ProductForm({ initial, categories, labs, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category?._id || initial?.category || '',
    subcategory: initial?.subcategory?._id || initial?.subcategory || '',
    lab: initial?.lab?._id || initial?.lab || '',
    discountPercent: initial?.discountPercent || '',
    description: initial?.description || '',
    reportTime: initial?.reportTime || '',
    sampleType: initial?.sampleType || '',
    homeCollection: initial?.homeCollection || false,
    fastingRequired: initial?.fastingRequired || false,
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured || false,
  });
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // TestMaster autocomplete
  const [nameQuery, setNameQuery] = useState(initial?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const nameSearchTimer = useRef(null);

  useEffect(() => {
    if (form.category) {
      categoryApi.getSubcategories(form.category)
        .then((r) => setSubcategories(r.data.items || []))
        .catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
    }
  }, [form.category]);

  const fetchSuggestions = (q) => {
    setSuggestionsLoading(true);
    testMasterApi.search(q)
      .then((r) => { setSuggestions(r.data.items || []); setSuggestionsLoading(false); })
      .catch(() => { setSuggestions([]); setSuggestionsLoading(false); });
  };

  // Show all tests immediately when the field is focused
  const handleNameFocus = () => {
    setShowSuggestions(true);
    if (suggestions.length === 0) fetchSuggestions(nameQuery.trim());
  };

  const handleNameInput = (e) => {
    const val = e.target.value;
    setNameQuery(val);
    setForm((f) => ({ ...f, name: val }));
    setShowSuggestions(true);
    clearTimeout(nameSearchTimer.current);
    nameSearchTimer.current = setTimeout(() => fetchSuggestions(val.trim()), 300);
  };

  const handleSelectTest = (test) => {
    setNameQuery(test.name);
    setForm((f) => ({
      ...f,
      name: test.name,
      category: test.category?._id || test.category || f.category,
      subcategory: test.subcategory?._id || test.subcategory || '',
      sampleType: test.sampleType || f.sampleType,
      reportTime: test.reportTime || f.reportTime,
      fastingRequired: test.fastingRequired ?? f.fastingRequired,
      homeCollection: test.homeCollection ?? f.homeCollection,
      description: test.description || f.description,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        reportTime: formatReportTime(form.reportTime),
        subcategory: form.subcategory || null,
      };
      if (initial?._id) await productApi.update(initial._id, payload);
      else await productApi.create(payload);
      toast.success(initial ? 'Product updated!' : 'Product created!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Name with TestMaster autocomplete */}
        <div className="col-span-2 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Name *
            <span className="ml-2 text-xs font-normal text-primary-500">
              — Choose from Test Master List
            </span>
          </label>
          <input
            required
            autoComplete="off"
            value={nameQuery}
            onChange={handleNameInput}
            onFocus={handleNameFocus}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="input pr-10"
            placeholder="Click to see all tests or type to search…"
          />
          {/* dropdown arrow indicator */}
          <span className="pointer-events-none absolute right-3 top-9 text-gray-400 text-xs">▼</span>

          {showSuggestions && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {suggestionsLoading ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Loading tests…</div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm text-gray-500">No tests in master list yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Go to <span className="font-medium text-primary-600">Test Master List</span> to add tests first.
                  </p>
                </div>
              ) : (
                <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                  {suggestions.map((t) => (
                    <li
                      key={t._id}
                      onMouseDown={() => handleSelectTest(t)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {t.category?.name && (
                            <span className="text-xs text-primary-600 bg-primary-50 rounded px-1.5 py-0.5">{t.category.name}</span>
                          )}
                          {t.sampleType && (
                            <span className="text-xs text-gray-500">{t.sampleType}</span>
                          )}
                          {t.reportTime && (
                            <span className="text-xs text-gray-400">⏱ {t.reportTime}</span>
                          )}
                        </div>
                      </div>
                      {t.fastingRequired && (
                        <span className="text-xs text-orange-600 bg-orange-50 rounded px-1.5 py-0.5 shrink-0">Fasting</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })} className="input">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory {subcategories.length === 0 && form.category && <span className="text-xs text-gray-400">(none added yet)</span>}
          </label>
          <select
            value={form.subcategory}
            onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
            className="input"
            disabled={!form.category || subcategories.length === 0}
          >
            <option value="">Select subcategory</option>
            {subcategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab</label>
          <select value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} className="input">
            <option value="">Select lab</option>
            {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Time</label>
          <input
            value={form.reportTime}
            onChange={(e) => setForm({ ...form, reportTime: e.target.value })}
            onBlur={() => setForm((f) => ({ ...f, reportTime: formatReportTime(f.reportTime) }))}
            className="input"
            placeholder="Type number (e.g. 24) → auto becomes '24 hours'"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sample Type</label>
          <input value={form.sampleType} onChange={(e) => setForm({ ...form, sampleType: e.target.value })} className="input" placeholder="e.g. Blood" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} />
        </div>
        <div className="col-span-2 flex flex-wrap gap-4">
          {[
            { key: 'homeCollection', label: 'Home Collection' },
            { key: 'fastingRequired', label: 'Fasting Required' },
            { key: 'isActive', label: 'Active' },
            { key: 'isFeatured', label: 'Featured' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
        Price is set by the lab owner — no price needed here.
      </p>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

function BulkPriceModal({ count, onSave, onClose }) {
  const [salePrice, setSalePrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!salePrice && !discountPercent) { toast.error('Enter at least one value'); return; }
    setLoading(true);
    try {
      await onSave(salePrice || undefined, discountPercent || undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Update price for <span className="font-semibold">{count} product(s)</span>. Fill one or both fields.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (₹)</label>
        <input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="input" placeholder="e.g. 499" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
        <input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="input" placeholder="e.g. 20" />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Updating…' : 'Update Price'}</button>
      </div>
    </form>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const searchTimer = useRef(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    productApi.adminGetAll({ page, limit, q: q || undefined, category: typeFilter || undefined })
      .then((res) => {
        setProducts(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, q, typeFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    Promise.all([
      categoryApi.getTopLevel(),
      labApi.getAll({ limit: 100 }),
    ]).then(([cRes, lRes]) => {
      setCategories(cRes.data.items || []);
      setLabs(lRes.data.items || lRes.data.labs || []);
    });
  }, []);

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(selected.size === products.length ? new Set() : new Set(products.map((p) => p._id)));

  const handleSearchChange = (e) => {
    clearTimeout(searchTimer.current);
    const val = e.target.value;
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productApi.delete(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) return;
    try {
      await productApi.bulkDelete([...selected]);
      toast.success(`${selected.size} product(s) deleted`);
      setSelected(new Set());
      fetchProducts();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleBulkPrice = async (salePrice, discountPercent) => {
    try {
      await productApi.bulkPrice([...selected], salePrice ? Number(salePrice) : undefined, discountPercent ? Number(discountPercent) : undefined);
      toast.success(`Price updated for ${selected.size} product(s)`);
      setSelected(new Set());
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Product
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search by name…"
            onChange={handleSearchChange}
            className="input pl-9 py-2 text-sm w-full"
          />
        </div>
        {selected.size > 0 && (
          <>
            <button
              onClick={() => setModal({ type: 'bulkPrice' })}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <FiDollarSign className="text-sm" /> Update Price ({selected.size})
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
            >
              <FiTrash2 className="text-sm" /> Delete Selected ({selected.size})
            </button>
          </>
        )}
      </div>

      <CsvUploadSection
        title="Bulk Upload Products via CSV"
        description="Upload tests/packages for labs or brands. Download the demo CSV to see the required format."
        onDemoDownload={productApi.demoCsv}
        onUpload={productApi.bulkCsv}
        demoFileName="products-template.csv"
        onSuccess={fetchProducts}
      />

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {[{ val: '', label: 'All' }, ...categories.map((c) => ({ val: c._id, label: c.name }))].map(({ val, label }) => (
          <button key={val} onClick={() => { setTypeFilter(val); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              typeFilter === val ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header w-8">
                    <input type="checkbox" checked={products.length > 0 && selected.size === products.length} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Lab</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p._id} className={`hover:bg-gray-50 ${selected.has(p._id) ? 'bg-blue-50' : ''}`}>
                    <td className="table-cell">
                      <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)} className="rounded" />
                    </td>
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell capitalize">{p.type}</td>
                    <td className="table-cell">{p.lab?.name || '-'}</td>
                    <td className="table-cell">{formatCurrency(p.salePrice || p.price)}</td>
                    <td className="table-cell">
                      <span className={`badge text-xs ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => setModal({ type: 'edit', product: p })} className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                        <button onClick={() => handleDelete(p._id)} className="text-gray-400 hover:text-red-600"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); setSelected(new Set()); }} />

      <Modal open={!!modal && (modal.type === 'add' || modal.type === 'edit')} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'Add Product' : 'Edit Product'} size="lg">
        <ProductForm
          initial={modal?.product}
          categories={categories}
          labs={labs}
          onSave={() => { setModal(null); fetchProducts(); }}
          onClose={() => setModal(null)}
        />
      </Modal>

      <Modal open={modal?.type === 'bulkPrice'} onClose={() => setModal(null)} title="Bulk Update Price" size="sm">
        <BulkPriceModal count={selected.size} onSave={handleBulkPrice} onClose={() => setModal(null)} />
      </Modal>

    </div>
  );
}
