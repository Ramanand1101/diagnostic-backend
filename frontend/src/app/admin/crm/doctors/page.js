'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { referralDoctorApi, labApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiUserCheck, FiPhone } from 'react-icons/fi';

const EMPTY = { name: '', specialization: '', hospital: '', mobile: '', email: '', city: '', commissionPercent: 0, notes: '', isActive: true, lab: '' };

function DoctorForm({ initial, labs, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    specialization: initial.specialization || '',
    hospital: initial.hospital || '',
    mobile: initial.mobile || '',
    email: initial.email || '',
    city: initial.city || '',
    commissionPercent: initial.commissionPercent || 0,
    notes: initial.notes || '',
    isActive: initial.isActive ?? true,
    lab: initial.lab?._id || initial.lab || '',
  } : { ...EMPTY });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      const payload = { ...form, lab: form.lab || null };
      if (initial?._id) await referralDoctorApi.update(initial._id, payload);
      else await referralDoctorApi.create(payload);
      toast.success(initial ? 'Doctor updated!' : 'Doctor added!');
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name *</label>
          <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Dr. Sharma" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
          <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="input" placeholder="Cardiologist, GP..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital / Clinic</label>
          <input value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} className="input" placeholder="Hospital name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
          <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="input" placeholder="Mobile number" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" placeholder="City" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
          <input type="number" min="0" max="100" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Associated Lab</label>
          <select value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} className="input">
            <option value="">Any / All Labs</option>
            {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={2} placeholder="Any notes..." />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
          Active
        </label>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Doctor'}</button>
      </div>
    </form>
  );
}

export default function CRMDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [labs, setLabs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const searchTimer = useRef(null);

  const fetchDoctors = useCallback(() => {
    setLoading(true);
    referralDoctorApi.getAll({ q: q || undefined, limit: 100 })
      .then((res) => {
        setDoctors(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);
  useEffect(() => {
    labApi.getAll({ limit: 200 }).then((r) => setLabs(r.data.items || r.data.labs || []));
  }, []);

  const handleSearch = (e) => {
    clearTimeout(searchTimer.current);
    const val = e.target.value;
    searchTimer.current = setTimeout(() => setQ(val), 400);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this doctor?')) return;
    try {
      await referralDoctorApi.delete(id);
      toast.success('Deleted');
      fetchDoctors();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Doctors</h1>
          <p className="text-sm text-gray-500 mt-0.5">Doctors who refer patients to your labs</p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Doctor
        </button>
      </div>

      <div className="relative max-w-xs">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input type="text" placeholder="Search name, hospital…" onChange={handleSearch} className="input pl-9 py-2 text-sm w-full" />
      </div>

      {loading ? <PageLoader /> : doctors.length === 0 ? (
        <div className="card p-12 text-center">
          <FiUserCheck className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No referral doctors added yet</p>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Add First Doctor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{doc.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${doc.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {doc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {doc.specialization && <p className="text-xs text-gray-500 mt-0.5">{doc.specialization}</p>}
                  {doc.hospital && <p className="text-xs text-gray-400">{doc.hospital}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setModal({ type: 'edit', doctor: doc })} className="text-gray-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-gray-100">
                    <FiEdit size={13} />
                  </button>
                  <button onClick={() => handleDelete(doc._id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                {doc.mobile && (
                  <a href={`tel:${doc.mobile}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                    <FiPhone size={13} className="text-gray-400" /> {doc.mobile}
                  </a>
                )}
                {doc.city && <p className="text-xs text-gray-400">{doc.city}</p>}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900">{doc.referralCount || 0}</p>
                  <p className="text-xs text-gray-400">Referrals</p>
                </div>
                {doc.commissionPercent > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">{doc.commissionPercent}%</p>
                    <p className="text-xs text-gray-400">Commission</p>
                  </div>
                )}
              </div>

              {doc.notes && <p className="text-xs text-gray-400 mt-2 italic">{doc.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal?.type === 'add'} onClose={() => setModal(null)} title="Add Referral Doctor" size="lg">
        <DoctorForm labs={labs} onSave={() => { setModal(null); fetchDoctors(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edit Doctor" size="lg">
        <DoctorForm initial={modal?.doctor} labs={labs} onSave={() => { setModal(null); fetchDoctors(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
