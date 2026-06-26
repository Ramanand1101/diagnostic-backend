'use client';
import { useState, useEffect } from 'react';
import { ticketApi } from '@/lib/api';
import { formatDate, statusColor, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const limit = 15;

  const fetchTickets = () => {
    setLoading(true);
    ticketApi.getAll({ page, limit })
      .then((res) => {
        setTickets(res.data.items || res.data.tickets || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [page]);

  const handleUpdate = async () => {
    try {
      await ticketApi.update(selected._id, { status: newStatus });
      toast.success('Ticket updated!');
      setSelected(null);
      fetchTickets();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const priorityColor = { low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Subject</th>
                  <th className="table-header">User</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{t.subject}</td>
                    <td className="table-cell">{t.user?.name || '-'}</td>
                    <td className="table-cell">
                      <span className={`badge text-xs capitalize ${priorityColor[t.priority] || 'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                    </td>
                    <td className="table-cell"><Badge status={t.status} /></td>
                    <td className="table-cell">{formatDate(t.createdAt)}</td>
                    <td className="table-cell">
                      <button onClick={() => { setSelected(t); setNewStatus(t.status); }} className="text-primary-600 hover:underline text-sm">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Ticket Details">
        {selected && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">{selected.subject}</h4>
              <p className="text-sm text-gray-500 mt-1">{selected.user?.name} &bull; {formatDate(selected.createdAt)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.message}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input">
                {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelected(null)} className="btn-secondary">Close</button>
              <button onClick={handleUpdate} className="btn-primary">Update</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
