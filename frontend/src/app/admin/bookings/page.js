'use client';
import { useState, useEffect } from 'react';
import { bookingApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiEye } from 'react-icons/fi';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const limit = 20;

  const fetchBookings = () => {
    setLoading(true);
    const params = { page, limit };
    if (statusFilter) params.status = statusFilter;
    bookingApi.getAll(params)
      .then((res) => {
        setBookings(res.data.items || res.data.bookings || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      await bookingApi.updateStatus(selected._id, { status: newStatus });
      toast.success('Status updated!');
      setSelected(null);
      fetchBookings();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleMarkPaid = async (id) => {
    try {
      await bookingApi.markPaid(id);
      toast.success('Marked as paid!');
      fetchBookings();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const statuses = ['pending', 'confirmed', 'assigned', 'collected', 'processing', 'completed', 'cancelled', 'refunded'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full ${!statusFilter ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>All</button>
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{s}</button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Booking #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Payment</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono font-medium">{b.bookingNo}</td>
                    <td className="table-cell">{b.user?.name || b.guest?.name || '-'}</td>
                    <td className="table-cell">{formatDate(b.slotDate)}</td>
                    <td className="table-cell"><Badge status={b.status} /></td>
                    <td className="table-cell"><Badge status={b.paymentStatus} /></td>
                    <td className="table-cell font-semibold">{formatCurrency(b.total)}</td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => { setSelected(b); setNewStatus(b.status); }} className="text-gray-400 hover:text-primary-600"><FiEye /></button>
                        {b.paymentStatus === 'unpaid' && (
                          <button onClick={() => handleMarkPaid(b._id)} className="text-xs text-green-600 hover:underline">Mark Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Booking #${selected?.bookingNo}`}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">Customer</p><p className="font-medium">{selected.user?.name || selected.guest?.name}</p></div>
              <div><p className="text-gray-400">Total</p><p className="font-medium">{formatCurrency(selected.total)}</p></div>
              <div><p className="text-gray-400">Date</p><p className="font-medium">{formatDate(selected.slotDate)}</p></div>
              <div><p className="text-gray-400">Visit</p><p className="font-medium capitalize">{selected.visitType}</p></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input">
                {statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelected(null)} className="btn-secondary">Close</button>
              <button onClick={handleStatusUpdate} className="btn-primary">Update Status</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
