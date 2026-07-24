'use client';
import { useState, useEffect, useCallback } from 'react';
import { corporatePackageApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi';

function PackageForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    items: initial?.items?.length ? initial.items.map((i) => ({ name: i.name, price: i.price })) : [{ name: '', price: '' }],
    basePrice: initial?.basePrice ?? '',
    active: initial?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addItem = () => set('items', [...form.items, { name: '', price: '' }]);
  const removeItem = (i) => set('items', form.items.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => set('items', form.items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  const itemsTotal = form.items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Package name is required');
    if (form.basePrice === '' || Number(form.basePrice) < 0) return toast.error('Base price is required');
    setLoading(true);
    try {
      const payload = {
        ...form,
        basePrice: Number(form.basePrice),
        items: form.items.filter((i) => i.name.trim()).map((i) => ({ name: i.name, price: Number(i.price) || 0 })),
      };
      if (initial?._id) await corporatePackageApi.update(initial._id, payload);
      else await corporatePackageApi.create(payload);
      toast.success(initial ? 'Package updated!' : 'Package created!');
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
        <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="e.g. Executive Health Checkup" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="input" rows={2} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Included Tests</label>
          <button type="button" onClick={addItem} className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
            <FiPlus size={10} /> Add Test
          </button>
        </div>
        <div className="space-y-2">
          {form.items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)} className="input flex-1" placeholder="Test name e.g. CBC" />
              <input type="number" value={item.price} onChange={(e) => updateItem(i, 'price', e.target.value)} className="input w-28" placeholder="Price" />
              <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-2"><FiX /></button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Sum of individual test prices: ₹{itemsTotal}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Package Base Price (₹) *</label>
        <input required type="number" value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} className="input" placeholder="Negotiated bundle price" />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
        Active (available to assign to corporates)
      </label>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Package'}</button>
      </div>
    </form>
  );
}

export default function CorporatePackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchPackages = useCallback(() => {
    setLoading(true);
    corporatePackageApi.getAll({ limit: 200 })
      .then((res) => setPackages(res.data.items || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const handleDelete = async (pkg) => {
    if (!confirm(`Delete package "${pkg.name}"?`)) return;
    try {
      await corporatePackageApi.delete(pkg._id);
      toast.success('Package deleted');
      fetchPackages();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Corporate Packages</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Package
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg._id} className="card p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pkg.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {pkg.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {pkg.description && <p className="text-xs text-gray-500">{pkg.description}</p>}
              <p className="text-xs text-gray-400">{(pkg.items || []).length} test(s) included</p>
              <p className="text-lg font-bold text-primary-600 mt-1">₹{pkg.basePrice}</p>
              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                <button onClick={() => setModal({ type: 'edit', pkg })} className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 flex items-center justify-center gap-1">
                  <FiEdit size={11} /> Edit
                </button>
                <button onClick={() => handleDelete(pkg)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50">
                  <FiTrash2 size={11} />
                </button>
              </div>
            </div>
          ))}
          {packages.length === 0 && (
            <p className="text-gray-400 text-sm col-span-full text-center py-10">No packages yet. Click &quot;Add Package&quot; to create one.</p>
          )}
        </div>
      )}

      <Modal open={modal?.type === 'add' || modal?.type === 'edit'} onClose={() => setModal(null)}
        title={modal?.type === 'add' ? 'Add Package' : 'Edit Package'} size="lg">
        <PackageForm
          initial={modal?.pkg}
          onSave={() => { setModal(null); fetchPackages(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
