'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { bookingApi } from '@/lib/api';
import { formatDate, formatCurrency, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import {
  FiDollarSign, FiCheckCircle, FiClock, FiTrendingUp,
  FiSearch, FiFileText, FiPrinter, FiX,
} from 'react-icons/fi';

// ── Invoice Modal ─────────────────────────────────────────────────────────────
function InvoiceModal({ booking, onClose }) {
  const invoiceDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const slotDate = booking.slotDate ? new Date(booking.slotDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const customer = booking.user?.name || booking.guest?.name || 'Guest';
  const customerEmail = booking.user?.email || booking.guest?.email || '';
  const customerMobile = booking.user?.mobile || booking.guest?.mobile || '';
  const labName = booking.lab?.name || '—';
  const labAddress = [booking.lab?.address, booking.lab?.city].filter(Boolean).join(', ');

  const isPaid = booking.paymentStatus === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <h2 className="font-bold text-gray-900">Invoice — {booking.bookingNo}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiPrinter size={14} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Invoice content */}
        <div id="invoice-print" className="overflow-y-auto flex-1 px-8 py-6 space-y-6 text-sm">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-extrabold text-primary-600 tracking-tight">HealthOnTime</p>
              <p className="text-xs text-gray-400 mt-0.5">healthontime.in</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">INVOICE</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{booking.bookingNo}</p>
              <p className="text-xs text-gray-400 mt-0.5">Date: {invoiceDate}</p>
              <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {isPaid ? '✓ PAID' : '⏳ UNPAID'}
              </span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Billed To + Lab */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Billed To</p>
              <p className="font-semibold text-gray-900">{customer}</p>
              {customerEmail && <p className="text-gray-500 text-xs mt-0.5">{customerEmail}</p>}
              {customerMobile && <p className="text-gray-500 text-xs mt-0.5">{customerMobile}</p>}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Lab / Center</p>
              <p className="font-semibold text-gray-900">{labName}</p>
              {labAddress && <p className="text-gray-500 text-xs mt-0.5">{labAddress}</p>}
              {booking.lab?.phone && <p className="text-gray-500 text-xs mt-0.5">{booking.lab.phone}</p>}
            </div>
          </div>

          {/* Appointment info */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-wrap gap-4">
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Appointment Date</p>
              <p className="font-semibold text-gray-800">{slotDate}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Time Slot</p>
              <p className="font-semibold text-gray-800">{booking.slotTime || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Visit Type</p>
              <p className="font-semibold text-gray-800 capitalize">{booking.visitType === 'home' ? 'Home Collection' : 'Visit Lab'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Payment Method</p>
              <p className="font-semibold text-gray-800 capitalize">{booking.paymentMethod || '—'}</p>
            </div>
          </div>

          {/* Items table */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Tests / Services</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Test / Package</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Price</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {(booking.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{item.qty || 1}</td>
                    <td className="px-3 py-2 text-right text-gray-600">₹{item.price?.toLocaleString('en-IN') || 0}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial summary */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>₹{(booking.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              {(booking.discount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount {booking.coupon ? `(${booking.coupon})` : ''}</span>
                  <span>−₹{(booking.discount || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(booking.tax || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>₹{(booking.tax || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                <span>Total</span>
                <span>₹{(booking.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-400 font-medium mb-1">Notes</p>
              <p className="text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-gray-400">Thank you for choosing HealthOnTime · healthontime.in</p>
            <p className="text-[11px] text-gray-300 mt-0.5">For support: info@healthontime.in · +91 7090 002 002</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#invoice-print) { display: none !important; }
          .fixed { position: static !important; }
          .print\\:hidden { display: none !important; }
          .bg-black\\/50 { display: none !important; }
          #invoice-print { max-height: none !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Billing Page ─────────────────────────────────────────────────────────
export default function BillingPage() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [payFilter, setPayFilter] = useState('');
  const [q, setQ] = useState('');
  const [limit] = useState(20);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const searchTimer = useRef(null);

  // Fetch stats once
  useEffect(() => {
    bookingApi.getStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  // Fetch paginated bookings
  const fetchBookings = useCallback(() => {
    setLoading(true);
    const params = { page, limit, q: q || undefined, deleted: 'false' };
    if (payFilter) params.paymentStatus = payFilter;
    bookingApi.getAll(params)
      .then((res) => {
        setBookings(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, payFilter, q]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleSearch = (e) => {
    clearTimeout(searchTimer.current);
    const val = e.target.value;
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const handleMarkPaid = async (id) => {
    try {
      await bookingApi.markPaid(id);
      toast.success('Marked as paid');
      fetchBookings();
      // Refresh stats
      bookingApi.getStats().then((res) => setStats(res.data)).catch(() => {});
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue overview, payment tracking, and invoices.</p>
      </div>

      {/* Invoice modal */}
      {invoiceBooking && (
        <InvoiceModal booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} />
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={fmt(stats.totalRevenue)} sub={`${stats.totalCount} bookings`} icon={FiTrendingUp} color="bg-primary-500" />
          <StatCard label="Paid" value={fmt(stats.paidRevenue)} sub={`${stats.paidCount} bookings`} icon={FiCheckCircle} color="bg-green-500" />
          <StatCard label="Unpaid / Pending" value={fmt(stats.unpaidRevenue)} sub={`${stats.unpaidCount} bookings`} icon={FiClock} color="bg-amber-500" />
          <StatCard label="This Month" value={fmt(stats.thisMonthRevenue)} sub={`${stats.thisMonthCount} bookings`} icon={FiDollarSign} color="bg-indigo-500" />
        </div>
      )}

      {/* Payment method breakdown */}
      {stats?.byPaymentMethod?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">By Payment Method</p>
          <div className="flex flex-wrap gap-3">
            {stats.byPaymentMethod.map((m) => (
              <div key={m._id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                <span className="text-xs font-semibold capitalize text-gray-700">{m._id || 'unknown'}</span>
                <span className="text-xs text-gray-400">{m.count} bookings</span>
                <span className="text-xs font-bold text-primary-600">{fmt(m.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input type="text" placeholder="Search booking number…" onChange={handleSearch}
            className="input pl-9 py-2 text-sm w-full" />
        </div>
        <div className="flex gap-1.5">
          {['', 'paid', 'unpaid', 'failed', 'refunded'].map((s) => (
            <button key={s} onClick={() => { setPayFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
                payFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}>
              {s || 'All Payments'}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings table */}
      {loading ? <PageLoader /> : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Booking #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Lab</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Payment</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono text-xs font-medium text-gray-700">{b.bookingNo}</td>
                    <td className="table-cell">
                      <p className="font-medium text-gray-800 text-sm">{b.user?.name || b.guest?.name || '—'}</p>
                      <p className="text-[11px] text-gray-400">{b.user?.mobile || b.guest?.mobile || ''}</p>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{b.lab?.name || '—'}</td>
                    <td className="table-cell text-sm text-gray-500">{formatDate(b.slotDate)}</td>
                    <td className="table-cell"><Badge status={b.status} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <Badge status={b.paymentStatus} />
                        {b.paymentStatus === 'unpaid' && (
                          <button onClick={() => handleMarkPaid(b._id)}
                            className="text-[11px] text-green-600 hover:underline font-medium whitespace-nowrap">
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-right font-bold text-gray-900">{formatCurrency(b.total)}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => setInvoiceBooking(b)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
                      >
                        <FiFileText size={12} /> Invoice
                      </button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-10">No bookings found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={() => {}} />
    </div>
  );
}
