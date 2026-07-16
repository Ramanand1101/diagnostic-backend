'use client';
import { useState, useEffect, useCallback } from 'react';
import { followUpApi, labApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiCheck, FiClock } from 'react-icons/fi';

const STATUS_OPTIONS = ['pending', 'done', 'missed', 'rescheduled'];
const TYPE_OPTIONS = ['call', 'whatsapp', 'email', 'visit'];

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  done: 'bg-green-50 text-green-700 border-green-200',
  missed: 'bg-red-50 text-red-700 border-red-200',
  rescheduled: 'bg-blue-50 text-blue-700 border-blue-200',
};

const TYPE_ICONS = { call: '📞', whatsapp: '💬', email: '📧', visit: '🏥' };

function FollowUpForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    type: initial?.type || 'call',
    scheduledAt: initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : '',
    status: initial?.status || 'pending',
    notes: initial?.notes || '',
    outcome: initial?.outcome || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scheduledAt) return toast.error('Date/time is required');
    setLoading(true);
    try {
      if (initial?._id) await followUpApi.update(initial._id, form);
      else await followUpApi.create(form);
      toast.success(initial ? 'Updated!' : 'Follow-up scheduled!');
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="input" required />
        </div>
        {initial && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={2} placeholder="What to discuss..." />
      </div>
      {initial && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
          <textarea value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} className="input" rows={2} placeholder="What happened after the follow-up..." />
        </div>
      )}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function CRMFollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [todayOnly, setTodayOnly] = useState(false);
  const [modal, setModal] = useState(null);

  const fetchFollowUps = useCallback(() => {
    setLoading(true);
    followUpApi.getAll({
      page, limit,
      status: statusFilter || undefined,
      today: todayOnly ? 'true' : undefined,
    })
      .then((res) => {
        setFollowUps(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter, todayOnly]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const markDone = async (fu) => {
    try {
      await followUpApi.update(fu._id, { status: 'done' });
      toast.success('Marked as done!');
      fetchFollowUps();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this follow-up?')) return;
    try {
      await followUpApi.delete(id);
      toast.success('Deleted');
      fetchFollowUps();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const isOverdue = (fu) => fu.status === 'pending' && new Date(fu.scheduledAt) < new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and track patient/lead follow-ups</p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Schedule Follow-up
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {[{ val: '', label: 'All' }, ...STATUS_OPTIONS.map((s) => ({ val: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))].map(({ val, label }) => (
            <button key={val} onClick={() => { setStatusFilter(val); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === val ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-2">
          <input type="checkbox" checked={todayOnly} onChange={(e) => { setTodayOnly(e.target.checked); setPage(1); }} className="w-4 h-4 rounded text-primary-600" />
          Today only
        </label>
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="space-y-3">
          {followUps.length === 0 ? (
            <div className="card text-center py-12">
              <FiClock className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500">No follow-ups found</p>
            </div>
          ) : followUps.map((fu) => (
            <div key={fu._id} className={`card flex items-start gap-4 ${isOverdue(fu) ? 'border-red-200 bg-red-50/30' : ''}`}>
              <div className="text-2xl">{TYPE_ICONS[fu.type] || '📞'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {fu.patient?.name || fu.lead?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">{fu.patient?.mobile || fu.lead?.mobile}</p>
                    {fu.lead && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-1 inline-block">Lead</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_COLORS[fu.status]}`}>
                    {fu.status}
                  </span>
                </div>
                <p className={`text-xs mt-2 flex items-center gap-1 ${isOverdue(fu) ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  <FiClock size={11} />
                  {isOverdue(fu) ? 'OVERDUE · ' : ''}{formatDate(fu.scheduledAt)}
                </p>
                {fu.notes && <p className="text-sm text-gray-600 mt-1">{fu.notes}</p>}
                {fu.outcome && <p className="text-sm text-green-700 mt-1 font-medium">→ {fu.outcome}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {fu.status === 'pending' && (
                  <button title="Mark done" onClick={() => markDone(fu)} className="text-green-500 hover:text-green-700 p-1.5 hover:bg-green-50 rounded-lg">
                    <FiCheck size={15} />
                  </button>
                )}
                <button onClick={() => setModal({ type: 'edit', followUp: fu })} className="text-gray-400 hover:text-primary-600 p-1.5 hover:bg-gray-100 rounded-lg">
                  <FiEdit size={14} />
                </button>
                <button onClick={() => handleDelete(fu._id)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      <Modal open={modal?.type === 'add'} onClose={() => setModal(null)} title="Schedule Follow-up">
        <FollowUpForm onSave={() => { setModal(null); fetchFollowUps(); }} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edit Follow-up">
        <FollowUpForm initial={modal?.followUp} onSave={() => { setModal(null); fetchFollowUps(); }} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
