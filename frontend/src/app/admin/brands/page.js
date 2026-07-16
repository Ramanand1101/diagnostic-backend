'use client';
import { useState, useEffect, useCallback } from 'react';
import { brandApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiMapPin, FiGlobe, FiLayers } from 'react-icons/fi';

function BrandForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    website: initial?.website || '',
    description: initial?.description || '',
    isActive: initial?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Brand name is required');
    setLoading(true);
    try {
      if (initial?._id) await brandApi.update(initial._id, form);
      else await brandApi.create(form);
      toast.success(initial ? 'Brand updated!' : 'Brand created!');
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Chain Name *</label>
        <input
          required
          autoFocus
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
          placeholder="e.g. Apollo Diagnostics, Dr Lal PathLabs, SRL Diagnostics"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
        <input
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="input"
          placeholder="https://www.apollodiagnostics.in"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          rows={2}
          placeholder="Short description about this chain..."
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 rounded text-primary-600"
        />
        Active
      </label>
      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Brand'}
        </button>
      </div>
    </form>
  );
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');

  const fetchBrands = useCallback(() => {
    setLoading(true);
    brandApi.getAll({ q: q || undefined })
      .then((res) => setBrands(res.data.items || []))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const handleDelete = async (brand) => {
    if (!confirm(`Delete brand "${brand.name}"? This will remove the brand tag from all its labs (labs won't be deleted).`)) return;
    try {
      await brandApi.delete(brand._id);
      toast.success('Brand deleted');
      fetchBrands();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands / Chains</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage lab chains. Assign a brand to labs to enable bulk product upload for all branches at once.
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'add' })}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <FiPlus /> Add Brand
        </button>
      </div>

      {/* How it works card */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How Brands work:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Create a brand here (e.g. <strong>Apollo Diagnostics</strong>)</li>
          <li>When adding a lab, select this brand from the dropdown</li>
          <li>When uploading products CSV, put the brand name in the <code className="bg-blue-100 px-1 rounded">brand</code> column</li>
          <li>All labs of that brand automatically get the tests — no repetition needed</li>
        </ol>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search brands..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="input max-w-xs"
      />

      {loading ? <PageLoader /> : brands.length === 0 ? (
        <div className="card p-12 text-center">
          <FiLayers className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No brands yet</p>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Add First Brand
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div key={brand._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{brand.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${brand.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {brand.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{brand.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setModal({ type: 'edit', brand })} className="text-gray-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-gray-100">
                    <FiEdit size={14} />
                  </button>
                  <button onClick={() => handleDelete(brand)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-sm">
                  <FiLayers className="text-primary-500" size={14} />
                  <span className="font-semibold text-gray-800">{brand.labCount || 0}</span>
                  <span className="text-gray-500">branches</span>
                </div>
                {brand.cities?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <FiMapPin className="text-secondary-500" size={14} />
                    <span className="font-semibold text-gray-800">{brand.cities.length}</span>
                    <span className="text-gray-500">cities</span>
                  </div>
                )}
                {brand.website && (
                  <a href={brand.website} target="_blank" rel="noopener noreferrer" className="ml-auto text-gray-400 hover:text-primary-600">
                    <FiGlobe size={14} />
                  </a>
                )}
              </div>

              {/* Cities preview */}
              {brand.cities?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {brand.cities.slice(0, 5).map((city) => (
                    <span key={city} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{city}</span>
                  ))}
                  {brand.cities.length > 5 && (
                    <span className="text-xs text-gray-400">+{brand.cities.length - 5} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal?.type === 'add'} onClose={() => setModal(null)} title="Add Brand / Chain">
        <BrandForm onSave={() => { setModal(null); fetchBrands(); }} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edit Brand">
        <BrandForm
          initial={modal?.brand}
          onSave={() => { setModal(null); fetchBrands(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
