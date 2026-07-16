'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { productApi, categoryApi, labApi } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiUploadCloud, FiDownload, FiDollarSign } from 'react-icons/fi';

function CsvResultModal({ result, onClose }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600">{result.created}</p>
          <p className="text-xs text-green-700 mt-1">Created</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-500">{result.errors?.length || 0}</p>
          <p className="text-xs text-red-600 mt-1">Errors</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-700">{result.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Rows</p>
        </div>
      </div>
      {result.errors?.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <p className="text-sm font-medium text-gray-700 mb-2">Row errors:</p>
          {result.errors.map((e, i) => (
            <div key={i} className="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5 mb-1">
              Row {e.row}: {e.error}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={onClose} className="btn-primary text-sm">Done</button>
      </div>
    </div>
  );
}

function ProductForm({ initial, categories, labs, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', type: 'test', category: '', lab: '', price: '', salePrice: '',
    discountPercent: '', description: '', reportTime: '', sampleType: '',
    homeCollection: false, fastingRequired: false, isActive: true, isFeatured: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?._id) await productApi.update(initial._id, form);
      else await productApi.create(form);
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
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
            <option value="test">Test</option>
            <option value="package">Package</option>
            <option value="medicine">Medicine</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
          <input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (₹)</label>
          <input type="number" min="0" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Time</label>
          <input value={form.reportTime} onChange={(e) => setForm({ ...form, reportTime: e.target.value })} className="input" placeholder="e.g. 24 hours" />
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
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const csvInputRef = useRef(null);
  const searchTimer = useRef(null);
  const limit = 20;

  const fetchProducts = useCallback(() => {
    setLoading(true);
    productApi.adminGetAll({ page, limit, q: q || undefined, type: typeFilter || undefined })
      .then((res) => {
        setProducts(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, q, typeFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    Promise.all([
      categoryApi.getAll({ limit: 100 }),
      labApi.getAll({ limit: 100 }),
    ]).then(([cRes, lRes]) => {
      setCategories(cRes.data.items || cRes.data.categories || []);
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

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please select a .csv file'); return; }
    const fd = new FormData();
    fd.append('file', file);
    setCsvUploading(true);
    try {
      const res = await productApi.bulkCsv(fd);
      setCsvResult(res.data);
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCsvUploading(false);
      e.target.value = '';
    }
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
        <div className="flex items-center gap-2 ml-auto">
          <a
            href={productApi.demoCsvUrl()}
            download="products-template.csv"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
          >
            <FiDownload className="text-sm" /> Demo CSV
          </a>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={csvUploading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-60"
          >
            <FiUploadCloud className="text-sm" />
            {csvUploading ? 'Uploading…' : 'Upload CSV'}
          </button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {['', 'test', 'package', 'medicine'].map((t) => (
          <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
              typeFilter === t ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
            {t || 'All Types'}
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
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

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

      <Modal open={!!csvResult} onClose={() => setCsvResult(null)} title="CSV Upload Result" size="sm">
        {csvResult && <CsvResultModal result={csvResult} onClose={() => setCsvResult(null)} />}
      </Modal>
    </div>
  );
}
