'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { labApi, brandApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import CsvUploadSection from '@/components/ui/CsvUploadSection';
import toast from 'react-hot-toast';
import {
  FiPlus, FiCheckCircle, FiXCircle, FiEdit, FiStar,
  FiSearch, FiUploadCloud, FiDownload, FiEye, FiMail, FiPhone, FiMapPin, FiLayers,
} from 'react-icons/fi';

function LabForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    brand: initial?.brand?._id || initial?.brand || '',
    address: initial?.address || '',
    area: initial?.area || '',
    city: initial?.city || '',
    state: initial?.state || '',
    pincode: initial?.pincode || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    homeCollection: initial?.homeCollection || false,
    featured: initial?.featured || false,
    description: initial?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [cityBrands, setCityBrands] = useState([]);

  useEffect(() => {
    brandApi.getAll({ limit: 200 }).then((r) => setBrands(r.data.items || []));
  }, []);

  useEffect(() => {
    if (form.city && form.city.length >= 2) {
      brandApi.getByCity(form.city).then((r) => setCityBrands(r.data.items || []));
    } else {
      setCityBrands([]);
    }
  }, [form.city]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?._id) await labApi.update(initial._id, form);
      else await labApi.create(form);
      toast.success(initial ? 'Lab updated!' : 'Lab created!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab Name *</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="e.g. Apollo Gomti Nagar" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand / Chain
            <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <select value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} className="input">
            <option value="">Choose brand name</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}{b.labCount > 0 ? ` (${b.labCount} branches)` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* City-brand hint — shows after city is typed */}
      {cityBrands.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
          <FiLayers className="shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Brands already in {form.city}:</span>{' '}
            {cityBrands.map((b) => (
              <span key={b._id} className="inline-flex items-center gap-1 mr-2">
                <button
                  type="button"
                  onClick={() => set('brand', b._id)}
                  className="underline hover:text-amber-900 font-medium"
                >
                  {b.name}
                </button>
                <span className="text-amber-600">({b.cityBranchCount} branch{b.cityBranchCount > 1 ? 'es' : ''})</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Street / Building No.</label>
        <input value={form.address} onChange={(e) => set('address', e.target.value)} className="input" placeholder="e.g. Shop 12, Civil Lines Road" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality</label>
        <input value={form.area || ''} onChange={(e) => set('area', e.target.value)} className="input" placeholder="e.g. Gomti Nagar, Hazratganj" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input" placeholder="Lucknow" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input value={form.state} onChange={(e) => set('state', e.target.value)} className="input" placeholder="Uttar Pradesh" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
          <input value={form.pincode || ''} onChange={(e) => set('pincode', e.target.value)} className="input" placeholder="226010" maxLength={6} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="9876543210" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="text" value={form.email} onChange={(e) => set('email', e.target.value)} className="input" placeholder="lab@example.com" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="input" rows={2} />
      </div>
      <div className="flex flex-wrap gap-5 pt-1">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.homeCollection} onChange={(e) => set('homeCollection', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
          Home Collection Available
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="w-4 h-4 text-yellow-500 rounded" />
          <FiStar className="text-yellow-500" /> Mark as Top Lab
        </label>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Lab'}</button>
      </div>
    </form>
  );
}

function LabViewModal({ lab, onClose, onEdit }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{lab.name}</h2>
          {lab.verificationStatus && (
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              lab.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' :
              lab.verificationStatus === 'rejected' ? 'bg-red-100 text-red-600' :
              'bg-yellow-100 text-yellow-700'
            }`}>{lab.verificationStatus}</span>
          )}
        </div>
        {lab.featured && <span className="text-yellow-400 text-xl">⭐</span>}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm">
        {/* Address block */}
        {(lab.address || lab.area || lab.city) && (
          <div className="flex gap-2 items-start">
            <FiMapPin className="text-primary-500 mt-0.5 shrink-0" />
            <div className="text-gray-700">
              {lab.address && <div>{lab.address}</div>}
              {lab.area && <div>{lab.area}</div>}
              <div className="flex gap-1 flex-wrap">
                {lab.city && <span>{lab.city}</span>}
                {lab.state && <span>{lab.state}</span>}
                {lab.pincode && <span className="text-gray-500">– {lab.pincode}</span>}
              </div>
            </div>
          </div>
        )}
        {lab.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <FiPhone className="text-primary-500 shrink-0" />
            <a href={`tel:${lab.phone}`} className="hover:text-primary-600">{lab.phone}</a>
          </div>
        )}
        {lab.email && (
          <div className="flex items-center gap-2 text-gray-700">
            <FiMail className="text-primary-500 shrink-0" />
            <a href={`mailto:${lab.email}`} className="hover:text-primary-600 break-all">{lab.email}</a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400 mb-0.5">Home Collection</p>
          <p className="font-medium">{lab.homeCollection ? 'Available' : 'Not available'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400 mb-0.5">Rating</p>
          <p className="font-medium">{lab.ratingAvg ? `${lab.ratingAvg} ★` : '—'}</p>
        </div>
      </div>

      {lab.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{lab.description}</p>
      )}

      <div className="flex gap-3 justify-end pt-1 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary text-sm">Close</button>
        <button onClick={onEdit} className="btn-primary text-sm flex items-center gap-1.5"><FiEdit /> Edit Lab</button>
      </div>
    </div>
  );
}

export default function AdminLabsPage() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [filterBrand, setFilterBrand] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const searchTimer = useRef(null);

  const fetchLabs = useCallback(() => {
    setLoading(true);
    const params = { page, limit, q: q || undefined };
    if (filterStatus) params.approved = filterStatus === 'approved';
    if (filterFeatured) params.featured = 'true';
    if (filterBrand) params.brand = filterBrand;
    labApi.getAll(params)
      .then((res) => {
        setLabs(res.data.items || res.data.labs || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, filterStatus, filterFeatured, filterBrand, q]);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setQ(val);
      setPage(1);
    }, 400);
  };

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(selected.size === labs.length ? new Set() : new Set(labs.map((l) => l._id)));

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} lab(s)? This cannot be undone.`)) return;
    try {
      await labApi.bulkDelete([...selected]);
      toast.success(`${selected.size} lab(s) deleted`);
      setSelected(new Set());
      fetchLabs();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleApprove = async (id) => {
    try { await labApi.approve(id); toast.success('Lab approved!'); fetchLabs(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleReject = async (id) => {
    try { await labApi.reject(id); toast.success('Lab rejected'); fetchLabs(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleToggleFeatured = async (lab) => {
    try {
      await labApi.update(lab._id, { featured: !lab.featured });
      toast.success(lab.featured ? 'Removed from Top Labs' : 'Added to Top Labs ⭐');
      fetchLabs();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Labs Management</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Lab
        </button>
      </div>

      {/* CSV Upload */}
      <CsvUploadSection
        title="Bulk Upload Labs via CSV"
        description="Upload multiple labs at once. Include brand name column to auto-assign brand."
        onDemoDownload={labApi.demoCsv}
        onUpload={labApi.bulkCsv}
        demoFileName="labs-template.csv"
        onSuccess={fetchLabs}
      />

      {/* Toolbar: search + CSV buttons */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search by name or city…"
            onChange={handleSearchChange}
            className="input pl-9 py-2 text-sm w-full"
          />
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
          >
            Delete Selected ({selected.size})
          </button>
        )}
        <div className="ml-auto" />
      </div>

      {/* Tab filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {['', 'pending', 'approved'].map((s) => (
          <button key={s} onClick={() => { setFilterStatus(s); setFilterFeatured(false); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterStatus === s && !filterFeatured ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
            {s === '' ? 'All' : s === 'pending' ? 'Pending Approval' : 'Approved'}
          </button>
        ))}
        <button
          onClick={() => { setFilterFeatured((v) => !v); setFilterStatus(''); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
            filterFeatured ? 'bg-yellow-400 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-300'
          }`}>
          <FiStar /> Top Labs Only
        </button>
        {/* Brand filter */}
        <div className="flex items-center gap-2 ml-2">
          <input
            type="text"
            placeholder="Filter by brand..."
            value={filterBrand}
            onChange={(e) => { setFilterBrand(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 w-44"
          />
          {filterBrand && (
            <button onClick={() => { setFilterBrand(''); setPage(1); }} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header w-8">
                    <input type="checkbox" checked={labs.length > 0 && selected.size === labs.length} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Brand / Chain</th>
                  <th className="table-header">City</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Home Collection</th>
                  <th className="table-header">Top Lab</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {labs.map((lab) => (
                  <tr key={lab._id} className={`hover:bg-gray-50 transition-colors ${selected.has(lab._id) ? 'bg-red-50' : ''}`}>
                    <td className="table-cell">
                      <input type="checkbox" checked={selected.has(lab._id)} onChange={() => toggleSelect(lab._id)} className="rounded" />
                    </td>
                    <td className="table-cell font-medium">
                      <div>{lab.name}</div>
                    </td>
                    <td className="table-cell">
                      {lab.brand ? (
                        <button
                          onClick={() => { setFilterBrand(lab.brand._id || lab.brand); setPage(1); }}
                          className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full hover:bg-primary-100 transition-colors"
                        >
                          {lab.brand.name || lab.brand}
                        </button>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="table-cell">{lab.city}</td>
                    <td className="table-cell"><Badge status={lab.verificationStatus} /></td>
                    <td className="table-cell">{lab.homeCollection ? 'Yes' : 'No'}</td>
                    <td className="table-cell">
                      <button onClick={() => handleToggleFeatured(lab)}
                        className={`text-xl transition-colors ${lab.featured ? 'text-yellow-400 hover:text-gray-300' : 'text-gray-200 hover:text-yellow-400'}`}>
                        <FiStar />
                      </button>
                    </td>
                    <td className="table-cell">{formatDate(lab.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {lab.verificationStatus !== 'verified' && (
                          <button onClick={() => handleApprove(lab._id)} title="Approve" className="text-green-500 hover:text-green-700"><FiCheckCircle /></button>
                        )}
                        {lab.verificationStatus !== 'rejected' && (
                          <button onClick={() => handleReject(lab._id)} title="Reject" className="text-red-500 hover:text-red-700"><FiXCircle /></button>
                        )}
                        <button onClick={() => setModal({ type: 'view', lab })} title="View" className="text-gray-400 hover:text-primary-600"><FiEye /></button>
                        <button onClick={() => setModal({ type: 'edit', lab })} title="Edit" className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {labs.length === 0 && (
                  <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-10">No labs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); setSelected(new Set()); }} />

      <Modal open={modal?.type === 'view'} onClose={() => setModal(null)} title="Lab Details" size="md">
        {modal?.lab && (
          <LabViewModal
            lab={modal.lab}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: 'edit', lab: modal.lab })}
          />
        )}
      </Modal>

      <Modal open={modal?.type === 'add' || modal?.type === 'edit'} onClose={() => setModal(null)}
        title={modal?.type === 'add' ? 'Add New Lab' : 'Edit Lab'} size="lg">
        <LabForm
          initial={modal?.lab}
          onSave={() => { setModal(null); fetchLabs(); }}
          onClose={() => setModal(null)}
        />
      </Modal>

    </div>
  );
}
