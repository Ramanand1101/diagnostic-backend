'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { crmApi, followUpApi } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiUser, FiPhone, FiMail, FiMapPin,
  FiCalendar, FiFileText, FiPlus, FiPhoneCall,
} from 'react-icons/fi';

const STATUS_BADGE = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  collected: 'bg-purple-50 text-purple-700',
  processing: 'bg-indigo-50 text-indigo-700',
};

function AddFollowUpForm({ patientId, onSave, onClose }) {
  const [form, setForm] = useState({
    type: 'call',
    scheduledAt: '',
    notes: '',
    patient: patientId,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scheduledAt) return toast.error('Schedule date/time is required');
    setLoading(true);
    try {
      await followUpApi.create(form);
      toast.success('Follow-up scheduled');
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
            <option value="call">Call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="visit">Visit</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            className="input"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input"
          rows={3}
          placeholder="What to discuss, patient concern, etc."
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Schedule'}</button>
      </div>
    </form>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const fetchData = () => {
    setLoading(true);
    crmApi.patientDetail(id)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) return <PageLoader />;
  if (!data) return <div className="text-center py-20 text-gray-400">Patient not found</div>;

  const { user, bookings, reports, followUps, totalSpend } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/crm/patients" className="text-gray-400 hover:text-gray-700 transition-colors">
          <FiArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500">Patient 360° View</p>
        </div>
        <button
          onClick={() => setShowFollowUp(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <FiPlus /> Schedule Follow-up
        </button>
      </div>

      {/* Patient info + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <FiUser className="text-primary-600 text-xl" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400">Joined {formatDate(user.createdAt)}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {user.mobile && (
              <div className="flex items-center gap-2 text-gray-600">
                <FiPhone className="text-gray-400 shrink-0" size={14} />
                <a href={`tel:${user.mobile}`} className="hover:text-primary-600">{user.mobile}</a>
              </div>
            )}
            {user.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <FiMail className="text-gray-400 shrink-0" size={14} />
                <a href={`mailto:${user.email}`} className="hover:text-primary-600 truncate">{user.email}</a>
              </div>
            )}
          </div>
        </div>

        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Bookings</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-gray-400">Lifetime Spend</p>
          </div>
        </div>

        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
          <p className="text-sm text-gray-500 mt-1">Reports</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-2xl font-bold text-purple-600">{followUps.length}</p>
            <p className="text-xs text-gray-400">Follow-ups</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking history */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiCalendar className="text-primary-500" /> Booking History
          </h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No bookings yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {bookings.map((b) => (
                <div key={b._id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {b.lab?.name || 'Unknown Lab'}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {b.items?.map((i) => i.name).join(', ').slice(0, 60) || 'No items'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">{formatDate(b.createdAt)}</p>
                    <p className="text-sm font-semibold text-green-700">{formatCurrency(b.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-ups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiPhoneCall className="text-primary-500" /> Follow-up History
            </h2>
            <button onClick={() => setShowFollowUp(true)} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              <FiPlus size={12} /> Add
            </button>
          </div>
          {followUps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No follow-ups yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {followUps.map((fu) => (
                <div key={fu._id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">{fu.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      fu.status === 'done' ? 'bg-green-50 text-green-700' :
                      fu.status === 'missed' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>{fu.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(fu.scheduledAt)}</p>
                  {fu.notes && <p className="text-xs text-gray-400 mt-1">{fu.notes}</p>}
                  {fu.outcome && <p className="text-xs text-green-600 mt-1 font-medium">→ {fu.outcome}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reports */}
      {reports.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiFileText className="text-primary-500" /> Reports ({reports.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {reports.map((r) => (
              <div key={r._id} className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-800 truncate">{r.title || 'Report'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showFollowUp} onClose={() => setShowFollowUp(false)} title="Schedule Follow-up" size="md">
        <AddFollowUpForm
          patientId={id}
          onSave={() => { setShowFollowUp(false); fetchData(); }}
          onClose={() => setShowFollowUp(false)}
        />
      </Modal>
    </div>
  );
}
