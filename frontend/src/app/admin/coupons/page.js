'use client';
import { useState, useEffect } from 'react';
import { couponApi } from '@/lib/api';
import { formatDate, formatCurrency, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

function CouponForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    code: '', type: 'percent', value: '', minOrderAmount: '', maxDiscount: '',
    validFrom: '', validTo: '', usageLimit: '', active: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?._id) await couponApi.update(initial._id, form);
      else await couponApi.create(form);
      toast.success(initial ? 'Coupon updated!' : 'Coupon created!');
      onSave();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input font-mono" placeholder="SAVE20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
          <input required type="number" min="1" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
          <input type="number" min="0" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
          <input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
          <input type="number" min="1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
          <input type="date" value={form.validFrom?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
          <input type="date" value={form.validTo?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className="input" />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="couponActive" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
          <label htmlFor="couponActive" className="text-sm text-gray-700">Active</label>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchCoupons = () => {
    setLoading(true);
    couponApi.getAll({ limit: 100 })
      .then((res) => setCoupons(res.data.items || res.data.coupons || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await couponApi.delete(id);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Coupon
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Code</th>
                <th className="table-header">Type</th>
                <th className="table-header">Value</th>
                <th className="table-header">Used</th>
                <th className="table-header">Valid To</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono font-semibold text-primary-700">{c.code}</td>
                  <td className="table-cell capitalize">{c.type}</td>
                  <td className="table-cell">{c.type === 'percent' ? `${c.value}%` : formatCurrency(c.value)}</td>
                  <td className="table-cell">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                  <td className="table-cell">{c.validTo ? formatDate(c.validTo) : 'No limit'}</td>
                  <td className="table-cell"><span className={`badge text-xs ${c.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ type: 'edit', coupon: c })} className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                      <button onClick={() => handleDelete(c._id)} className="text-gray-400 hover:text-red-600"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'Add Coupon' : 'Edit Coupon'} size="lg">
        <CouponForm
          initial={modal?.coupon}
          onSave={() => { setModal(null); fetchCoupons(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
