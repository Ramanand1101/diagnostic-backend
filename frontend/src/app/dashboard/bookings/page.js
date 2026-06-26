'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { bookingApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor } from '@/utils/helpers';
import Pagination from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { FiCalendar } from 'react-icons/fi';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const params = { page, limit };
    if (statusFilter) params.status = statusFilter;
    bookingApi.getAll(params)
      .then((res) => {
        setBookings(res.data.items || res.data.bookings || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const statuses = ['pending', 'confirmed', 'assigned', 'collected', 'processing', 'completed', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Link href="/products" className="btn-primary text-sm">+ New Booking</Link>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${!statusFilter ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>All</button>
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <FiCalendar className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No bookings found</p>
          <Link href="/products" className="btn-primary text-sm mt-4 inline-block">Book a Test</Link>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Booking #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Items</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-mono font-medium">{b.bookingNo}</td>
                      <td className="table-cell">{formatDate(b.slotDate)}</td>
                      <td className="table-cell">{b.items?.length || 0} item(s)</td>
                      <td className="table-cell">
                        <span className={`badge ${statusColor(b.status)}`}>{b.status}</span>
                      </td>
                      <td className="table-cell font-semibold">{formatCurrency(b.total)}</td>
                      <td className="table-cell">
                        <Link href={`/dashboard/bookings/${b._id}`} className="text-primary-600 hover:underline text-sm">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
