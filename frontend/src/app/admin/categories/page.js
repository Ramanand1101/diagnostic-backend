'use client';
import { useState, useEffect } from 'react';
import { categoryApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

function CategoryForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', type: 'pathology', seoTitle: '', seoDescription: '', isActive: true });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?._id) await categoryApi.update(initial._id, form);
      else await categoryApi.create(form);
      toast.success(initial ? 'Category updated!' : 'Category created!');
      onSave();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
          <option value="pathology">Pathology</option>
          <option value="radiology">Radiology</option>
          <option value="package">Packages</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
        <input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
        <textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className="input" rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="catActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
        <label htmlFor="catActive" className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchCategories = () => {
    setLoading(true);
    categoryApi.getAll({ limit: 100 })
      .then((res) => setCategories(res.data.items || res.data.categories || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await categoryApi.delete(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Category
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Type</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{cat.name}</td>
                  <td className="table-cell capitalize">{cat.type}</td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${cat.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{cat.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="table-cell">{formatDate(cat.createdAt)}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ type: 'edit', category: cat })} className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                      <button onClick={() => handleDelete(cat._id)} className="text-gray-400 hover:text-red-600"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'Add Category' : 'Edit Category'}>
        <CategoryForm
          initial={modal?.category}
          onSave={() => { setModal(null); fetchCategories(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
