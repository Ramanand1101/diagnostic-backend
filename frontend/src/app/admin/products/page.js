'use client';
import { useState, useEffect } from 'react';
import { productApi, categoryApi, labApi } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

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

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const limit = 15;

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      productApi.getAll({ page, limit }),
      categoryApi.getAll({ limit: 100 }),
      labApi.getAll({ limit: 100 }),
    ]).then(([pRes, cRes, lRes]) => {
      setProducts(pRes.data.items || pRes.data.products || []);
      setTotal(pRes.data.total || 0);
      setCategories(cRes.data.items || cRes.data.categories || []);
      setLabs(lRes.data.items || lRes.data.labs || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [page]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productApi.delete(id);
      toast.success('Product deleted');
      fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Product
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
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
                  <tr key={p._id} className="hover:bg-gray-50">
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
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'Add Product' : 'Edit Product'} size="lg">
        <ProductForm
          initial={modal?.product}
          categories={categories}
          labs={labs}
          onSave={() => { setModal(null); fetchAll(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
