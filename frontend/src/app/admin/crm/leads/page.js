'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { leadApi, referralDoctorApi, labApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiCheck } from 'react-icons/fi';

const STATUS_OPTIONS = ['new', 'contacted', 'interested', 'converted', 'lost'];
const SOURCE_OPTIONS = ['walk-in', 'call', 'whatsapp', 'online', 'referral', 'other'];

const STATUS_COLORS = {
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-yellow-50 text-yellow-700',
  interested: 'bg-purple-50 text-purple-700',
  converted: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-700',
};

const EMPTY = { name: '', mobile: '', email: '', source: 'call', interestedIn: '', status: 'new', notes: '', followUpDate: '', lab: '', referredBy: '' };

function LeadForm({ initial, labs, doctors, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    mobile: initial.mobile || '',
    email: initial.email || '',
    source: initial.source || 'call',
    interestedIn: initial.interestedIn || '',
    status: initial.status || 'new',
    notes: initial.notes || '',
    followUpDate: initial.followUpDate ? initial.followUpDate.slice(0, 16) : '',
    lab: initial.lab?._id || initial.lab || '',
    referredBy: initial.referredBy?._id || initial.referredBy || '',
  } : { ...EMPTY });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) return toast.error('Name and mobile are required');
    setLoading(true);
    try {
      const payload = { ...form, lab: form.lab || null, referredBy: form.referredBy || null, followUpDate: form.followUpDate || null };
      if (initial?._id) await leadApi.update(initial._id, payload);
      else await leadApi.create(payload);
      toast.success(initial ? 'Lead updated!' : 'Lead added!');
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Patient name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
          <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="input" placeholder="Mobile number" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="input">
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Interested In</label>
          <input value={form.interestedIn} onChange={(e) => setForm({ ...form, interestedIn: e.target.value })} className="input" placeholder="Which test/service?" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
          <input type="datetime-local" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab</label>
          <select value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} className="input">
            <option value="">Select lab</option>
            {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referred By Doctor</label>
          <select value={form.referredBy} onChange={(e) => setForm({ ...form, referredBy: e.target.value })} className="input">
            <option value="">None</option>
            {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}{d.specialization ? ` (${d.specialization})` : ''}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} placeholder="Any notes about this lead..." />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function CRMLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [labs, setLabs] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const searchTimer = useRef(null);

  const fetchLeads = useCallback(() => {
    setLoading(true);
    leadApi.getAll({ page, limit, status: statusFilter || undefined, q: q || undefined })
      .then((res) => {
        setLeads(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter, q]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => {
    Promise.all([labApi.getAll({ limit: 200 }), referralDoctorApi.getAll({ limit: 200 })])
      .then(([lRes, dRes]) => {
        setLabs(lRes.data.items || lRes.data.labs || []);
        setDoctors(dRes.data.items || []);
      });
  }, []);

  const handleSearch = (e) => {
    clearTimeout(searchTimer.current);
    const val = e.target.value;
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await leadApi.delete(id);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleConvert = async (lead) => {
    if (!confirm(`Mark "${lead.name}" as converted?`)) return;
    try {
      await leadApi.convert(lead._id, {});
      toast.success('Lead marked as converted!');
      fetchLeads();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const counts = STATUS_OPTIONS.reduce((acc, s) => { acc[s] = leads.filter((l) => l.status === s).length; return acc; }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track patient inquiries and convert them to bookings</p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Lead
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ val: '', label: 'All' }, ...STATUS_OPTIONS.map((s) => ({ val: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))].map(({ val, label }) => (
          <button key={val} onClick={() => { setStatusFilter(val); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === val ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{total} total</span>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input type="text" placeholder="Search name, mobile…" onChange={handleSearch} className="input pl-9 py-2 text-sm w-full" />
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Source</th>
                  <th className="table-header">Interested In</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Follow-up</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-800">{lead.name}</td>
                    <td className="table-cell">
                      <p className="text-sm">{lead.mobile}</p>
                      {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                    </td>
                    <td className="table-cell capitalize text-sm text-gray-600">{lead.source}</td>
                    <td className="table-cell text-sm text-gray-600 max-w-[160px] truncate">{lead.interestedIn || '—'}</td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-500">
                      {lead.followUpDate ? formatDate(lead.followUpDate) : '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        {lead.status !== 'converted' && (
                          <button title="Mark converted" onClick={() => handleConvert(lead)} className="text-green-500 hover:text-green-700 p-1.5 hover:bg-green-50 rounded-lg">
                            <FiCheck size={14} />
                          </button>
                        )}
                        <button onClick={() => setModal({ type: 'edit', lead })} className="text-gray-400 hover:text-primary-600 p-1.5 hover:bg-gray-100 rounded-lg">
                          <FiEdit size={14} />
                        </button>
                        <button onClick={() => handleDelete(lead._id)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No leads found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      <Modal open={modal?.type === 'add'} onClose={() => setModal(null)} title="Add Lead" size="lg">
        <LeadForm labs={labs} doctors={doctors} onSave={() => { setModal(null); fetchLeads(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edit Lead" size="lg">
        <LeadForm initial={modal?.lead} labs={labs} doctors={doctors} onSave={() => { setModal(null); fetchLeads(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
