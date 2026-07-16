'use client';
import { useState, useEffect } from 'react';
import { labApi, productApi, categoryApi } from '@/lib/api';
import { formatCurrency, getErrorMessage } from '@/utils/helpers';
import toast from 'react-hot-toast';
import Spinner, { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiPackage, FiDollarSign, FiLock } from 'react-icons/fi';

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

  const openAdd = () => { setForm(EMPTY_PRODUCT); setEditing(null); setShowForm(true); };
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
    setEditing(p);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lab) { toast.error('Set up your lab profile first'); return; }
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input name="name" required value={form.name} onChange={handle} className="input" placeholder="e.g. Complete Blood Count (CBC)" />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handle} rows={2} className="input resize-none" />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Sample Type</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Blood', 'Urine', 'Stool', 'Saliva', 'Swab', 'Multiple'].map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, sampleType: f.sampleType === opt ? '' : opt }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${form.sampleType === opt ? 'bg-secondary-500 text-white border-secondary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-secondary-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <input name="sampleType" value={['Blood','Urine','Stool','Saliva','Swab','Multiple'].includes(form.sampleType) ? '' : form.sampleType} onChange={handle} className="input text-sm" placeholder="Or type custom..." />
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
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 flex-1 justify-center">
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
