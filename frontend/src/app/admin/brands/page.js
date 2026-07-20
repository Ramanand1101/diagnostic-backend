'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { brandApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import CsvUploadSection from '@/components/ui/CsvUploadSection';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit, FiTrash2, FiMapPin, FiGlobe, FiLayers,
  FiUploadCloud, FiX, FiHome, FiGrid, FiList, FiFolder,
  FiPhone, FiMail, FiCheckSquare, FiSquare, FiDownload,
} from 'react-icons/fi';

// ── Multi-value field (phones / emails) ──────────────────────────────────────

function MultiField({ label, values, onChange, placeholder, type = 'text' }) {
  const add = () => onChange([...values, '']);
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  const update = (i, v) => onChange(values.map((x, idx) => idx === i ? v : x));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <button type="button" onClick={add} className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
          <FiPlus size={10} /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <input type={type} value={v} onChange={(e) => update(i, e.target.value)}
              className="input flex-1 text-sm py-1.5" placeholder={placeholder} />
            <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 px-1.5 text-sm">✕</button>
          </div>
        ))}
        {values.length === 0 && (
          <p className="text-xs text-gray-400 italic">None — click Add to add one</p>
        )}
      </div>
    </div>
  );
}

// ── Brand Form ───────────────────────────────────────────────────────────────

function BrandForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    logo: initial?.logo || '',
    website: initial?.website || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    phones: initial?.phones || [],
    emails: initial?.emails || [],
    description: initial?.description || '',
    isActive: initial?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await brandApi.uploadLogo(fd);
      set('logo', res.data.url);
      toast.success('Logo uploaded!');
    } catch {
      toast.error('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Brand name is required');
    if (!form.phone.trim()) return toast.error('Primary phone is required');
    if (!form.email.trim()) return toast.error('Primary email is required');
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
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <div onClick={() => !logoUploading && logoRef.current?.click()}
          className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary-400 transition-colors bg-gray-50 group">
          {logoUploading ? (
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
              <p className="text-xs text-gray-400">Uploading…</p>
            </div>
          ) : form.logo ? (
            <>
              <img src={form.logo} alt="Logo" className="w-full h-full object-contain p-3" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <FiUploadCloud className="text-white text-2xl" />
              </div>
            </>
          ) : (
            <div className="text-center px-2">
              <FiUploadCloud className="mx-auto text-gray-300 text-2xl mb-1" />
              <p className="text-xs text-gray-400">Upload Logo</p>
            </div>
          )}
        </div>
        <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
        {form.logo && (
          <button type="button" onClick={() => set('logo', '')} className="text-xs text-red-500 hover:underline flex items-center gap-1">
            <FiX size={11} /> Remove
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Chain Name *</label>
        <input required autoFocus value={form.name} onChange={(e) => set('name', e.target.value)}
          className="input" placeholder="e.g. Apollo Diagnostics" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
        <input value={form.website} onChange={(e) => set('website', e.target.value)}
          className="input" placeholder="https://www.apollodiagnostics.in" />
      </div>

      {/* Primary contact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone *</label>
          <input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
            className="input" placeholder="1800-xxx-xxxx" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email *</label>
          <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            className="input" placeholder="contact@brand.com" />
        </div>
      </div>

      {/* Extra contacts */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
        <MultiField label="Extra Phone Numbers" values={form.phones}
          onChange={(v) => set('phones', v)} placeholder="+91 98765 43210" type="tel" />
        <MultiField label="Extra Emails" values={form.emails}
          onChange={(v) => set('emails', v)} placeholder="support@brand.com" type="email" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
          className="input" rows={2} placeholder="Short description about this chain..." />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)}
          className="w-4 h-4 rounded text-primary-600" />
        Active
      </label>

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading || logoUploading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Brand'}
        </button>
      </div>
    </form>
  );
}

// ── Brand card — Tiles view ──────────────────────────────────────────────────

function TileCard({ brand, selected, onSelect, onEdit, onDelete, onToggleHome }) {
  const [homeBusy, setHomeBusy] = useState(false);

  const handleHomeToggle = async (e) => {
    e.stopPropagation();
    setHomeBusy(true);
    try {
      await brandApi.setHomeCollection(brand._id, !brand.homeCollection);
      toast.success(brand.homeCollection ? 'Home visit disabled for all labs' : 'Home visit enabled for all labs');
      onToggleHome();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setHomeBusy(false);
    }
  };

  return (
    <div className={`card hover:shadow-md transition-all relative ${selected ? 'ring-2 ring-primary-400 border-primary-200' : ''}`}>
      {/* Checkbox */}
      <button onClick={() => onSelect(brand._id)} className="absolute top-3 left-3 text-gray-300 hover:text-primary-500">
        {selected ? <FiCheckSquare className="text-primary-500 text-lg" /> : <FiSquare className="text-lg" />}
      </button>

      <div className="flex items-start justify-between gap-3 pl-6">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl border border-gray-100 bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {brand.logo
              ? <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-1" />
              : <span className="text-lg font-bold text-primary-600">{brand.name[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{brand.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${brand.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {brand.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {brand.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{brand.description}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(brand)} className="text-gray-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-gray-100"><FiEdit size={13} /></button>
          <button onClick={() => onDelete(brand)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><FiTrash2 size={13} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-sm">
          <FiLayers className="text-primary-500" size={13} />
          <span className="font-semibold text-gray-800">{brand.labCount || 0}</span>
          <span className="text-gray-500 text-xs">branches</span>
        </div>
        {brand.cities?.length > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <FiMapPin className="text-secondary-500" size={13} />
            <span className="font-semibold text-gray-800">{brand.cities.length}</span>
            <span className="text-gray-500 text-xs">cities</span>
          </div>
        )}
        {/* Home visit toggle */}
        <button
          onClick={handleHomeToggle}
          disabled={homeBusy}
          title={brand.homeCollection ? 'Home visit ON — click to disable for all labs' : 'Home visit OFF — click to enable for all labs'}
          className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors ${
            brand.homeCollection
              ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
              : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
          }`}
        >
          <FiHome size={11} />
          {homeBusy ? '…' : brand.homeCollection ? 'Home ON' : 'Home OFF'}
        </button>
        {brand.website && (
          <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-600">
            <FiGlobe size={13} />
          </a>
        )}
      </div>

      {brand.cities?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {brand.cities.slice(0, 4).map((city) => (
            <span key={city} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{city}</span>
          ))}
          {brand.cities.length > 4 && <span className="text-xs text-gray-400">+{brand.cities.length - 4}</span>}
        </div>
      )}
    </div>
  );
}

// ── Details view (table) ─────────────────────────────────────────────────────

function DetailsView({ brands, selected, onSelect, onSelectAll, onEdit, onDelete, onToggleHome }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="table-header w-8">
              <input type="checkbox"
                checked={brands.length > 0 && selected.size === brands.length}
                onChange={onSelectAll} className="rounded" />
            </th>
            <th className="table-header">Brand</th>
            <th className="table-header">Branches</th>
            <th className="table-header">Cities</th>
            <th className="table-header">Phone</th>
            <th className="table-header">Email</th>
            <th className="table-header">Home Visit</th>
            <th className="table-header">Status</th>
            <th className="table-header">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {brands.map((brand) => (
            <tr key={brand._id} className={`hover:bg-gray-50 ${selected.has(brand._id) ? 'bg-primary-50' : ''}`}>
              <td className="table-cell">
                <input type="checkbox" checked={selected.has(brand._id)} onChange={() => onSelect(brand._id)} className="rounded" />
              </td>
              <td className="table-cell">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-gray-100 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {brand.logo
                      ? <img src={brand.logo} alt="" className="w-full h-full object-contain p-0.5" />
                      : <span className="text-xs font-bold text-primary-600">{brand.name[0]?.toUpperCase()}</span>}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{brand.name}</p>
                    {brand.description && <p className="text-xs text-gray-400 truncate max-w-[160px]">{brand.description}</p>}
                  </div>
                </div>
              </td>
              <td className="table-cell font-semibold text-gray-800">{brand.labCount || 0}</td>
              <td className="table-cell">
                <div className="flex flex-wrap gap-1">
                  {(brand.cities || []).slice(0, 2).map((c) => (
                    <span key={c} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{c}</span>
                  ))}
                  {(brand.cities || []).length > 2 && <span className="text-xs text-gray-400">+{brand.cities.length - 2}</span>}
                </div>
              </td>
              <td className="table-cell text-xs text-gray-600">{brand.phone || (brand.phones?.[0]) || '—'}</td>
              <td className="table-cell text-xs text-gray-600">{brand.email || (brand.emails?.[0]) || '—'}</td>
              <td className="table-cell">
                <button onClick={() => onToggleHome(brand)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${brand.homeCollection ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'}`}>
                  <FiHome className="inline mr-1" size={10} />{brand.homeCollection ? 'ON' : 'OFF'}
                </button>
              </td>
              <td className="table-cell">
                <span className={`text-xs px-2 py-0.5 rounded-full ${brand.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {brand.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="table-cell">
                <div className="flex items-center gap-2">
                  <button onClick={() => onEdit(brand)} className="text-gray-400 hover:text-primary-600"><FiEdit size={13} /></button>
                  <button onClick={() => onDelete(brand)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Folder view (compact list) ────────────────────────────────────────────────

function FolderView({ brands, selected, onSelect, onEdit, onDelete, onToggleHome }) {
  return (
    <div className="space-y-1">
      {brands.map((brand) => (
        <div key={brand._id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:bg-gray-50 ${selected.has(brand._id) ? 'border-primary-200 bg-primary-50' : 'border-gray-100 bg-white'}`}>
          <input type="checkbox" checked={selected.has(brand._id)} onChange={() => onSelect(brand._id)} className="rounded shrink-0" />
          <div className="w-9 h-9 rounded-lg border border-gray-100 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {brand.logo
              ? <img src={brand.logo} alt="" className="w-full h-full object-contain p-0.5" />
              : <span className="text-sm font-bold text-primary-600">{brand.name[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">{brand.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{brand.labCount || 0} branches · {brand.cities?.length || 0} cities</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {brand.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><FiPhone size={10} />{brand.phone}</span>}
              {brand.email && <span className="text-xs text-gray-500 flex items-center gap-1"><FiMail size={10} />{brand.email}</span>}
            </div>
          </div>
          <button onClick={() => onToggleHome(brand)}
            className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${brand.homeCollection ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            <FiHome className="inline mr-1" size={10} />{brand.homeCollection ? 'Home ON' : 'Home OFF'}
          </button>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(brand)} className="text-gray-400 hover:text-primary-600 p-1 rounded"><FiEdit size={13} /></button>
            <button onClick={() => onDelete(brand)} className="text-gray-400 hover:text-red-500 p-1 rounded"><FiTrash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [view, setView] = useState('tiles'); // 'tiles' | 'details' | 'folder'
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchBrands = useCallback(() => {
    setLoading(true);
    brandApi.getAll({ q: q || undefined })
      .then((res) => { setBrands(res.data.items || []); setSelected(new Set()); })
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(selected.size === brands.length ? new Set() : new Set(brands.map((b) => b._id)));

  const handleDelete = async (brand) => {
    if (!confirm(`Delete brand "${brand.name}"? Labs won't be deleted, just unlinked.`)) return;
    try { await brandApi.delete(brand._id); toast.success('Brand deleted'); fetchBrands(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} brand(s)? Labs won't be deleted.`)) return;
    setBulkDeleting(true);
    try { await brandApi.bulkDelete([...selected]); toast.success(`${selected.size} brand(s) deleted`); fetchBrands(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBulkDeleting(false); }
  };

  const handleToggleHome = async (brand) => {
    try {
      await brandApi.setHomeCollection(brand._id, !brand.homeCollection);
      toast.success(brand.homeCollection ? 'Home visit disabled for all labs' : 'Home visit enabled for all labs');
      fetchBrands();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const VIEWS = [
    { id: 'tiles',   icon: FiGrid,   label: 'Grid' },
    { id: 'details', icon: FiList,   label: 'Table' },
    { id: 'folder',  icon: FiFolder, label: 'Compact' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands / Chains</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage lab chains and their home visit settings.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher — labeled buttons */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            {VIEWS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setView(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === id
                    ? 'bg-white shadow-sm text-primary-600 border border-gray-200'
                    : 'text-gray-400 hover:text-gray-700'
                }`}>
                <Icon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              try {
                const res = await brandApi.exportCsv();
                const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
                const a = document.createElement('a'); a.href = url; a.download = 'brands-export.csv'; a.click();
                URL.revokeObjectURL(url);
              } catch { toast.error('Export failed'); }
            }}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FiDownload size={14} /> Download CSV
          </button>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus /> Add Brand
          </button>
        </div>
      </div>

      {/* Bulk delete bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">{selected.size} brand(s) selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 text-sm px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
            <FiTrash2 size={13} /> {bulkDeleting ? 'Deleting…' : 'Delete Selected'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Clear</button>
        </div>
      )}

      {/* CSV Upload */}
      <CsvUploadSection
        title="Bulk Upload Brands via CSV"
        description="Upload multiple brands at once. Existing brands (matched by name) will be updated."
        onDemoDownload={brandApi.demoCsv}
        onUpload={brandApi.bulkCsv}
        demoFileName="brands-template.csv"
        onSuccess={fetchBrands}
      />

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How Brands work:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Create a brand here (e.g. <strong>Apollo Diagnostics</strong>)</li>
          <li>When adding a lab, select this brand from the dropdown</li>
          <li>Toggle <strong>Home Visit</strong> on a brand to enable/disable it on all its labs at once</li>
          <li>When uploading products CSV, put the brand name in the <code className="bg-blue-100 px-1 rounded">brand</code> column</li>
        </ol>
      </div>

      {/* Search + select all */}
      <div className="flex items-center gap-3">
        <input type="text" placeholder="Search brands..." value={q} onChange={(e) => setQ(e.target.value)} className="input max-w-xs" />
        {brands.length > 0 && (
          <button onClick={toggleAll} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            {selected.size === brands.length ? <FiCheckSquare className="text-primary-500" /> : <FiSquare />}
            {selected.size === brands.length ? 'Deselect all' : 'Select all'}
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{brands.length} brands</span>
      </div>

      {loading ? <PageLoader /> : brands.length === 0 ? (
        <div className="card p-12 text-center">
          <FiLayers className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No brands yet</p>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Add First Brand
          </button>
        </div>
      ) : (
        <>
          {view === 'tiles' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <TileCard key={brand._id} brand={brand} selected={selected.has(brand._id)}
                  onSelect={toggleSelect} onEdit={(b) => setModal({ type: 'edit', brand: b })}
                  onDelete={handleDelete} onToggleHome={fetchBrands} />
              ))}
            </div>
          )}
          {view === 'details' && (
            <div className="card p-0 overflow-hidden">
              <DetailsView brands={brands} selected={selected} onSelect={toggleSelect}
                onSelectAll={toggleAll}
                onEdit={(b) => setModal({ type: 'edit', brand: b })}
                onDelete={handleDelete} onToggleHome={handleToggleHome} />
            </div>
          )}
          {view === 'folder' && (
            <FolderView brands={brands} selected={selected} onSelect={toggleSelect}
              onEdit={(b) => setModal({ type: 'edit', brand: b })}
              onDelete={handleDelete} onToggleHome={handleToggleHome} />
          )}
        </>
      )}

      <Modal open={modal?.type === 'add'} onClose={() => setModal(null)} title="Add Brand / Chain">
        <BrandForm onSave={() => { setModal(null); fetchBrands(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edit Brand">
        <BrandForm initial={modal?.brand}
          onSave={() => { setModal(null); fetchBrands(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
