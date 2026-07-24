'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { corporateApi, labApi, userApi, corporatePackageApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { DateSelectPicker } from '@/components/booking/DateTimePicker';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit, FiEye, FiTrash2, FiSearch, FiMapPin, FiPhone, FiMail,
  FiUserPlus, FiKey, FiX, FiCheckCircle, FiXCircle, FiChevronDown,
} from 'react-icons/fi';

// ── Dynamic list editor for extra phones/emails ───────────────────────────────
function MultiField({ label, values, onChange, placeholder, type = 'text' }) {
  const add = () => onChange([...values, '']);
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  const update = (i, v) => onChange(values.map((x, idx) => idx === i ? v : x));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-700">{label}</label>
        <button type="button" onClick={add} className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
          <FiPlus size={10} /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input type={type} value={v} onChange={(e) => update(i, e.target.value)}
              className="input flex-1 text-sm" placeholder={placeholder} />
            <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 px-2">✕</button>
          </div>
        ))}
        {values.length === 0 && <p className="text-xs text-gray-400">None added</p>}
      </div>
    </div>
  );
}

// ── Searchable multi-select (used for assigning labs) ─────────────────────────
function MultiSelectDropdown({ placeholder, items, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = items.filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const remove = (id, e) => { e.stopPropagation(); onChange(selected.filter((x) => x !== id)); };
  const selectedItems = items.filter((i) => selected.includes(i.id));

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((v) => !v)}
        className="min-h-[40px] input flex items-center flex-wrap gap-1.5 cursor-pointer pr-8 relative bg-white">
        {selectedItems.length === 0 && <span className="text-gray-400 text-sm">{placeholder}</span>}
        {selectedItems.map((i) => (
          <span key={i.id} className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full font-medium">
            {i.label}
            <button type="button" onClick={(e) => remove(i.id, e)} className="ml-0.5 hover:text-red-600"><FiX size={10} /></button>
          </span>
        ))}
        <FiChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400"
                onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No matches</p>
            ) : filtered.map((i) => {
              const checked = selected.includes(i.id);
              return (
                <div key={i.id} onClick={() => toggle(i.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                    {checked && <span className="text-white text-[9px] font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-gray-800 truncate">{i.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create / Edit form ─────────────────────────────────────────────────────────
function CorporateForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    companyName: initial?.companyName || '',
    spocName: initial?.spocName || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    phones: initial?.phones || [],
    emails: initial?.emails || [],
    address: initial?.address || '',
    city: initial?.city || '',
    state: initial?.state || '',
    pincode: initial?.pincode || '',
    gstNumber: initial?.gstNumber || '',
    creditLimit: initial?.creditLimit ?? 0,
    agreementStartDate: initial?.agreementStartDate ? initial.agreementStartDate.slice(0, 10) : '',
    agreementExpiryDate: initial?.agreementExpiryDate ? initial.agreementExpiryDate.slice(0, 10) : '',
    hr: {
      name: initial?.hr?.name || '',
      department: initial?.hr?.department || '',
      email: initial?.hr?.email || '',
      phone: initial?.hr?.phone || '',
      phones: initial?.hr?.phones || [],
      emails: initial?.hr?.emails || [],
      address: initial?.hr?.address || '',
      city: initial?.hr?.city || '',
      state: initial?.hr?.state || '',
      pincode: initial?.hr?.pincode || '',
    },
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setHr = (k, v) => setForm((f) => ({ ...f, hr: { ...f.hr, [k]: v } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const PHONE_RE = /^[+\d][\d\s\-().]{6,19}$/;

    if (!form.companyName.trim()) return toast.error('Company name is required');
    if (!form.email.trim()) return toast.error('Company email is required');
    if (!EMAIL_RE.test(form.email.trim())) return toast.error('Enter a valid company email address');
    if (!form.phone.trim()) return toast.error('Company phone is required');
    if (!PHONE_RE.test(form.phone.trim())) return toast.error('Enter a valid company phone number');
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) return toast.error('Company pincode must be exactly 6 digits');
    for (const e of form.emails) { if (e && !EMAIL_RE.test(e.trim())) return toast.error(`Extra company email "${e}" is not valid`); }
    for (const p of form.phones) { if (p && !PHONE_RE.test(p.trim())) return toast.error(`Extra company phone "${p}" is not valid`); }

    if (form.hr.email && !EMAIL_RE.test(form.hr.email.trim())) return toast.error('Enter a valid HR email address');
    if (form.hr.phone && !PHONE_RE.test(form.hr.phone.trim())) return toast.error('Enter a valid HR phone number');
    if (form.hr.pincode && !/^\d{6}$/.test(form.hr.pincode)) return toast.error('HR pincode must be exactly 6 digits');
    for (const e of form.hr.emails) { if (e && !EMAIL_RE.test(e.trim())) return toast.error(`Extra HR email "${e}" is not valid`); }
    for (const p of form.hr.phones) { if (p && !PHONE_RE.test(p.trim())) return toast.error(`Extra HR phone "${p}" is not valid`); }

    setLoading(true);
    try {
      if (initial?._id) await corporateApi.update(initial._id, form);
      else await corporateApi.create(form);
      toast.success(initial ? 'Corporate updated!' : 'Corporate created!');
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
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Company Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input required value={form.companyName} onChange={(e) => set('companyName', e.target.value)} className="input" placeholder="e.g. Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SPOC Name</label>
            <input value={form.spocName} onChange={(e) => set('spocName', e.target.value)} className="input" placeholder="Single Point of Contact" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input" placeholder="contact@acme.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="9876543210" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <MultiField label="Extra Phone Numbers" values={form.phones} onChange={(v) => set('phones', v)} placeholder="+91 98765 43210" type="tel" />
          <MultiField label="Extra Emails" values={form.emails} onChange={(v) => set('emails', v)} placeholder="alt@acme.com" type="email" />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} className="input" placeholder="Street / building" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input value={form.state} onChange={(e) => set('state', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
            <input value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className="input" maxLength={6} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value.toUpperCase())} className="input" placeholder="22AAAAA0000A1Z5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (₹)</label>
            <input type="number" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} className="input" placeholder="0" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agreement Start Date</label>
            <DateSelectPicker value={form.agreementStartDate} onChange={(v) => set('agreementStartDate', v)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agreement Expiry Date</label>
            <DateSelectPicker value={form.agreementExpiryDate} onChange={(v) => set('agreementExpiryDate', v)} />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">HR Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HR Name</label>
            <input value={form.hr.name} onChange={(e) => setHr('name', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input value={form.hr.department} onChange={(e) => setHr('department', e.target.value)} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.hr.email} onChange={(e) => setHr('email', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.hr.phone} onChange={(e) => setHr('phone', e.target.value)} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <MultiField label="Extra Phone Numbers" values={form.hr.phones} onChange={(v) => setHr('phones', v)} placeholder="+91 98765 43210" type="tel" />
          <MultiField label="Extra Emails" values={form.hr.emails} onChange={(v) => setHr('emails', v)} placeholder="alt@acme.com" type="email" />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input value={form.hr.address} onChange={(e) => setHr('address', e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input value={form.hr.city} onChange={(e) => setHr('city', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input value={form.hr.state} onChange={(e) => setHr('state', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
            <input value={form.hr.pincode} onChange={(e) => setHr('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className="input" maxLength={6} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Corporate'}</button>
      </div>
    </form>
  );
}

// ── Detail / management modal ──────────────────────────────────────────────────
function CorporateDetail({ corporate, onClose, onEdit, onChanged }) {
  const [labs, setLabs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [catalogPackages, setCatalogPackages] = useState([]);
  const [selectedLabs, setSelectedLabs] = useState((corporate.assignedLabs || []).map((l) => l._id || l));
  const [rmId, setRmId] = useState(corporate.relationshipManager?._id || corporate.relationshipManager || '');
  const [selectedPackages, setSelectedPackages] = useState(
    (corporate.packages || []).map((p) => ({ packageId: p.package?._id || p.package, price: p.price }))
  );
  const [savingLabs, setSavingLabs] = useState(false);
  const [savingRm, setSavingRm] = useState(false);
  const [savingPkgs, setSavingPkgs] = useState(false);
  const [amForm, setAmForm] = useState({ name: '', email: '', mobile: '' });
  const [addingAm, setAddingAm] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    reminderDaysBefore: (corporate.settings?.reminderDaysBefore?.length ? corporate.settings.reminderDaysBefore : [60, 30]).join(', '),
    notifyEmail: corporate.settings?.defaultNotifyChannels?.includes('email') ?? true,
    notifyWhatsapp: corporate.settings?.defaultNotifyChannels?.includes('whatsapp') ?? false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    labApi.getAll({ limit: 500 }).then((r) => setLabs(r.data.items || []));
    userApi.getAll({ limit: 500 }).then((r) => {
      const all = r.data.items || r.data.users || [];
      setStaff(all.filter((u) => u.role === 'superadmin' || u.role === 'subadmin'));
    });
    corporatePackageApi.getAll({ limit: 200, active: 'true' }).then((r) => setCatalogPackages(r.data.items || []));
  }, []);

  const labItems = labs.map((l) => ({ id: l._id, label: `${l.name}${l.city ? ` (${l.city})` : ''}` }));

  const saveLabs = async () => {
    setSavingLabs(true);
    try {
      await corporateApi.assignLabs(corporate._id, selectedLabs);
      toast.success('Assigned labs updated');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingLabs(false); }
  };

  const saveRm = async () => {
    setSavingRm(true);
    try {
      await corporateApi.assignRelationshipManager(corporate._id, rmId || null);
      toast.success('Relationship manager updated');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingRm(false); }
  };

  const togglePackage = (pkg) => {
    setSelectedPackages((prev) => {
      const exists = prev.find((p) => p.packageId === pkg._id);
      if (exists) return prev.filter((p) => p.packageId !== pkg._id);
      return [...prev, { packageId: pkg._id, price: pkg.basePrice }];
    });
  };
  const updatePackagePrice = (packageId, price) => {
    setSelectedPackages((prev) => prev.map((p) => p.packageId === packageId ? { ...p, price } : p));
  };

  const savePackages = async () => {
    setSavingPkgs(true);
    try {
      await corporateApi.assignPackages(corporate._id, selectedPackages.map((p) => ({ package: p.packageId, price: Number(p.price) || 0 })));
      toast.success('Assigned packages updated');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingPkgs(false); }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const channels = [];
      if (settingsForm.notifyEmail) channels.push('email');
      if (settingsForm.notifyWhatsapp) channels.push('whatsapp');
      const reminderDaysBefore = settingsForm.reminderDaysBefore.split(',').map((s) => Number(s.trim())).filter((n) => n > 0);
      await corporateApi.updateSettings(corporate._id, { reminderDaysBefore, defaultNotifyChannels: channels });
      toast.success('Settings updated');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingSettings(false); }
  };

  const handleAddAm = async (e) => {
    e.preventDefault();
    if (!amForm.name.trim() || !amForm.email.trim()) return toast.error('Name and email are required');
    setAddingAm(true);
    try {
      const res = await corporateApi.addAccountManager(corporate._id, amForm);
      toast.success(`Account manager added! Temp password: ${res.data.tempPassword}`, { duration: 8000 });
      setAmForm({ name: '', email: '', mobile: '' });
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setAddingAm(false); }
  };

  const handleResetPassword = async (userId) => {
    try {
      const res = await userApi.resetPassword(userId);
      toast.success(`Password reset! New password: ${res.data.tempPassword}`, { duration: 8000 });
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleRemoveAm = async (userId) => {
    if (!confirm('Remove this account manager from the corporate account?')) return;
    try {
      await corporateApi.removeAccountManager(corporate._id, userId);
      toast.success('Account manager removed');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const toggleStatus = async () => {
    try {
      await corporateApi.setStatus(corporate._id, !corporate.active);
      toast.success(corporate.active ? 'Corporate suspended' : 'Corporate activated');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{corporate.companyName}</h2>
          <span className={`inline-flex items-center gap-1 mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            corporate.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {corporate.active ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
            {corporate.active ? 'Active' : 'Suspended'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleStatus} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            corporate.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
          }`}>
            {corporate.active ? 'Suspend' : 'Activate'}
          </button>
          <button onClick={onEdit} className="btn-primary text-sm flex items-center gap-1.5"><FiEdit /> Edit</button>
        </div>
      </div>

      {/* Contact summary */}
      <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-700"><FiMail className="text-primary-500 shrink-0" />{corporate.email}</div>
        <div className="flex items-center gap-2 text-gray-700"><FiPhone className="text-primary-500 shrink-0" />{corporate.phone}</div>
        {(corporate.address || corporate.city) && (
          <div className="col-span-2 flex items-start gap-2 text-gray-700">
            <FiMapPin className="text-primary-500 shrink-0 mt-0.5" />
            <span>{[corporate.address, corporate.city, corporate.state, corporate.pincode].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {corporate.gstNumber && <div className="col-span-2 text-xs text-gray-500">GST: {corporate.gstNumber}</div>}
      </div>

      {corporate.hr?.name && (
        <div className="text-sm bg-blue-50 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">HR Contact</p>
          <p className="font-medium text-gray-800">{corporate.hr.name} {corporate.hr.department ? `— ${corporate.hr.department}` : ''}</p>
          <p className="text-xs text-gray-500 mt-0.5">{[corporate.hr.email, corporate.hr.phone].filter(Boolean).join(' · ')}</p>
        </div>
      )}

      {/* Assigned Labs */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Assigned Labs</p>
        <p className="text-xs text-gray-400 mb-2">Corporate account managers can only schedule appointments at these labs.</p>
        <MultiSelectDropdown placeholder="Select labs…" items={labItems} selected={selectedLabs} onChange={setSelectedLabs} />
        <button onClick={saveLabs} disabled={savingLabs} className="btn-primary text-xs mt-2 px-3 py-1.5">
          {savingLabs ? 'Saving...' : 'Save Assigned Labs'}
        </button>
      </div>

      {/* Assigned Packages */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Assigned Packages</p>
        <p className="text-xs text-gray-400 mb-2">Tick a package and set the negotiated price for this corporate.</p>
        <div className="space-y-1.5">
          {catalogPackages.length === 0 && <p className="text-xs text-gray-400">No packages in catalog yet — create one under Corporate Packages.</p>}
          {catalogPackages.map((pkg) => {
            const sel = selectedPackages.find((p) => p.packageId === pkg._id);
            return (
              <div key={pkg._id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${sel ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-100'}`}>
                <input type="checkbox" checked={!!sel} onChange={() => togglePackage(pkg)} className="w-4 h-4 text-primary-600 rounded shrink-0" />
                <span className="text-sm text-gray-800 flex-1">{pkg.name} <span className="text-xs text-gray-400">(list ₹{pkg.basePrice})</span></span>
                {sel && (
                  <input type="number" value={sel.price} onChange={(e) => updatePackagePrice(pkg._id, e.target.value)}
                    className="input w-24 text-sm py-1" placeholder="Price" />
                )}
              </div>
            );
          })}
        </div>
        <button onClick={savePackages} disabled={savingPkgs} className="btn-primary text-xs mt-2 px-3 py-1.5">
          {savingPkgs ? 'Saving...' : 'Save Assigned Packages'}
        </button>
      </div>

      {/* Relationship Manager */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">HealthOnTime Relationship Manager</p>
        <div className="flex gap-2">
          <select value={rmId} onChange={(e) => setRmId(e.target.value)} className="input flex-1 text-sm">
            <option value="">— Unassigned —</option>
            {staff.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
          </select>
          <button onClick={saveRm} disabled={savingRm} className="btn-primary text-xs px-3">
            {savingRm ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Corporate Settings */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Corporate Settings</p>
        <div className="bg-gray-50 rounded-lg p-3 space-y-2.5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Agreement reminder — days before expiry (comma separated)</label>
            <input value={settingsForm.reminderDaysBefore}
              onChange={(e) => setSettingsForm((f) => ({ ...f, reminderDaysBefore: e.target.value }))}
              className="input text-sm" placeholder="60, 30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Default employee notification channels</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={settingsForm.notifyEmail} onChange={(e) => setSettingsForm((f) => ({ ...f, notifyEmail: e.target.checked }))} className="w-4 h-4 text-primary-600 rounded" />
                Email
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={settingsForm.notifyWhatsapp} onChange={(e) => setSettingsForm((f) => ({ ...f, notifyWhatsapp: e.target.checked }))} className="w-4 h-4 text-primary-600 rounded" />
                WhatsApp
              </label>
            </div>
          </div>
          <button onClick={saveSettings} disabled={savingSettings} className="btn-primary text-xs px-3 py-1.5">
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Account Managers */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Account Managers (Corporate Login Users)</p>
        <div className="space-y-2 mb-3">
          {(corporate.owners || []).length === 0 && <p className="text-xs text-gray-400">No account managers added yet.</p>}
          {(corporate.owners || []).map((u) => (
            <div key={u._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email}{u.mobile ? ` · ${u.mobile}` : ''}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleResetPassword(u._id)} title="Reset password"
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-600">
                  <FiKey size={11} /> Reset
                </button>
                <button onClick={() => handleRemoveAm(u._id)} title="Remove"
                  className="text-red-400 hover:text-red-600 p-1"><FiX size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddAm} className="flex gap-2 items-end flex-wrap bg-gray-50 rounded-lg p-3">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[11px] text-gray-500 mb-1">Name</label>
            <input value={amForm.name} onChange={(e) => setAmForm((f) => ({ ...f, name: e.target.value }))} className="input text-sm py-1.5" placeholder="Full name" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] text-gray-500 mb-1">Email</label>
            <input type="email" value={amForm.email} onChange={(e) => setAmForm((f) => ({ ...f, email: e.target.value }))} className="input text-sm py-1.5" placeholder="email@acme.com" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[11px] text-gray-500 mb-1">Mobile</label>
            <input type="tel" value={amForm.mobile} onChange={(e) => setAmForm((f) => ({ ...f, mobile: e.target.value }))} className="input text-sm py-1.5" placeholder="Optional" />
          </div>
          <button type="submit" disabled={addingAm} className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 whitespace-nowrap">
            <FiUserPlus size={12} /> {addingAm ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary text-sm">Close</button>
      </div>
    </div>
  );
}

export default function AdminCorporatePage() {
  const [corporates, setCorporates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [modal, setModal] = useState(null);
  const searchTimer = useRef(null);

  const fetchCorporates = useCallback(() => {
    setLoading(true);
    const params = { page, limit, q: q || undefined };
    if (filterActive) params.active = filterActive;
    if (mineOnly) params.mine = 'true';
    corporateApi.getAll(params)
      .then((res) => { setCorporates(res.data.items || []); setTotal(res.data.total || 0); })
      .finally(() => setLoading(false));
  }, [page, limit, q, filterActive, mineOnly]);

  useEffect(() => { fetchCorporates(); }, [fetchCorporates]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const handleDelete = async (corp) => {
    if (!confirm(`Delete "${corp.companyName}"? This cannot be undone.`)) return;
    try {
      await corporateApi.delete(corp._id);
      toast.success('Corporate deleted');
      fetchCorporates();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // Keep the detail modal's data fresh after any mutation inside it
  const refreshModal = async () => {
    if (!modal?.corporate?._id) return;
    const res = await corporateApi.getOne(modal.corporate._id);
    setModal((m) => ({ ...m, corporate: res.data }));
    fetchCorporates();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Corporate Accounts</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Corporate
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input type="text" placeholder="Search by company or city…" onChange={handleSearchChange}
            className="input pl-9 py-2 text-sm w-full" />
        </div>
        <div className="flex gap-2">
          {[['', 'All'], ['true', 'Active'], ['false', 'Suspended']].map(([val, label]) => (
            <button key={val} onClick={() => { setFilterActive(val); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterActive === val ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}>{label}</button>
          ))}
        </div>
        <button onClick={() => { setMineOnly((v) => !v); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            mineOnly ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
          }`}>
          My Corporates
        </button>
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Company</th>
                  <th className="table-header">City</th>
                  <th className="table-header">SPOC / Phone</th>
                  <th className="table-header">Assigned Labs</th>
                  <th className="table-header">Account Managers</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {corporates.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">{c.companyName}</td>
                    <td className="table-cell">{c.city || '—'}</td>
                    <td className="table-cell">
                      <p className="text-sm">{c.spocName || '—'}</p>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                    </td>
                    <td className="table-cell">{(c.assignedLabs || []).length}</td>
                    <td className="table-cell">{(c.owners || []).length}</td>
                    <td className="table-cell">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>{c.active ? 'Active' : 'Suspended'}</span>
                    </td>
                    <td className="table-cell">{formatDate(c.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal({ type: 'view', corporate: c })} title="View" className="text-gray-400 hover:text-primary-600"><FiEye /></button>
                        <button onClick={() => setModal({ type: 'edit', corporate: c })} title="Edit" className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                        <button onClick={() => handleDelete(c)} title="Delete" className="text-gray-400 hover:text-red-600"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {corporates.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-10">No corporate accounts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      <Modal open={modal?.type === 'view'} onClose={() => setModal(null)} title="Corporate Details" size="lg">
        {modal?.corporate && (
          <CorporateDetail
            corporate={modal.corporate}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: 'edit', corporate: modal.corporate })}
            onChanged={refreshModal}
          />
        )}
      </Modal>

      <Modal open={modal?.type === 'add' || modal?.type === 'edit'} onClose={() => setModal(null)}
        title={modal?.type === 'add' ? 'Add Corporate' : 'Edit Corporate'} size="lg">
        <CorporateForm
          initial={modal?.corporate}
          onSave={() => { setModal(null); fetchCorporates(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
