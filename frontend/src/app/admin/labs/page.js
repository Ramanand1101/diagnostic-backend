'use client';
import { useState, useEffect } from 'react';
import { labApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiCheckCircle, FiXCircle, FiEdit, FiStar } from 'react-icons/fi';

function LabForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', city: '', state: '', address: '', phone: '', email: '',
    homeCollection: false, featured: false, description: '',
  });
  const [loading, setLoading] = useState(false);

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab Name *</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input value={form.state} onChange={(e) => set('state', e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="input" rows={3} />
        </div>
        <div className="col-span-2 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.homeCollection}
              onChange={(e) => set('homeCollection', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded" />
            Home Collection Available
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.featured}
              onChange={(e) => set('featured', e.target.checked)}
              className="w-4 h-4 text-yellow-500 rounded" />
            <FiStar className="text-yellow-500" />
            Mark as Top Lab (shows on homepage)
          </label>
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Lab'}
        </button>
      </div>
    </form>
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
  const limit = 15;

  const fetchLabs = () => {
    setLoading(true);
    const params = { page, limit };
    if (filterStatus) params.approved = filterStatus === 'approved';
    if (filterFeatured) params.featured = 'true';
    labApi.getAll(params)
      .then((res) => {
        setLabs(res.data.items || res.data.labs || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLabs(); }, [page, filterStatus, filterFeatured]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Labs Management</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Lab
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {['', 'pending', 'approved'].map((s) => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterStatus === s && !filterFeatured ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
            {s === '' ? 'All' : s === 'pending' ? 'Pending Approval' : 'Approved'}
          </button>
        ))}
        <button
          onClick={() => { setFilterFeatured((v) => !v); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
            filterFeatured ? 'bg-yellow-400 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-300'
          }`}>
          <FiStar /> Top Labs Only
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Name</th>
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
                  <tr key={lab._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">{lab.name}</td>
                    <td className="table-cell">{lab.city}</td>
                    <td className="table-cell"><Badge status={lab.verificationStatus} /></td>
                    <td className="table-cell">{lab.homeCollection ? 'Yes' : 'No'}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleToggleFeatured(lab)}
                        title={lab.featured ? 'Remove from Top Labs' : 'Add to Top Labs'}
                        className={`text-xl transition-colors ${lab.featured ? 'text-yellow-400 hover:text-gray-300' : 'text-gray-200 hover:text-yellow-400'}`}>
                        <FiStar />
                      </button>
                    </td>
                    <td className="table-cell">{formatDate(lab.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {lab.verificationStatus !== 'verified' && (
                          <button onClick={() => handleApprove(lab._id)} title="Approve" className="text-green-500 hover:text-green-700">
                            <FiCheckCircle />
                          </button>
                        )}
                        {lab.verificationStatus !== 'rejected' && (
                          <button onClick={() => handleReject(lab._id)} title="Reject" className="text-red-500 hover:text-red-700">
                            <FiXCircle />
                          </button>
                        )}
                        <button onClick={() => setModal({ type: 'edit', lab })} title="Edit" className="text-gray-400 hover:text-primary-600">
                          <FiEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {labs.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No labs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

      <Modal open={!!modal} onClose={() => setModal(null)}
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
