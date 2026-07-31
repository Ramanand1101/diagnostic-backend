'use client';
import { useState } from 'react';
import { patientApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const RELATIONS = ['spouse', 'child', 'parent', 'sibling', 'other'];

// Add/edit a family member's Patient profile — shared between the "My Family" dashboard
// page and the cart's per-item "Booking for" picker (so a new family member can be
// added without leaving checkout).
export default function PatientFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || '',
    age: initial?.age || '',
    gender: initial?.gender || 'male',
    relation: initial?.relation || 'spouse',
    phone: initial?.phone || '',
    email: initial?.email || '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required.');
    setSaving(true);
    try {
      if (isEdit) {
        const res = await patientApi.update(initial._id, form);
        onSaved(res.data);
        toast.success('Family member updated.');
      } else {
        const res = await patientApi.create(form);
        onSaved(res.data);
        toast.success(`${form.name} added — Patient ID ${res.data.patientId}`);
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-900">{isEdit ? 'Edit Family Member' : 'Add Family Member'}</h2>
          <button type="button" onClick={onClose}><FiX className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
              <input type="number" min="0" max="120" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="input">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Relation</label>
            <select value={form.relation} onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))} className="input">
              {RELATIONS.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Family Member'}
          </button>
        </form>
      </div>
    </div>
  );
}
