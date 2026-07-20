'use client';
import { useState, useEffect, useCallback } from 'react';
import { labCrmApi } from '@/lib/api';
import { formatDate, formatCurrency, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  FiDollarSign, FiTrendingUp, FiCheckCircle, FiClock,
  FiCalendar, FiFilter, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';

const PRESETS = [
  { label: 'This Month',     value: 'month'    },
  { label: 'Last 3 Months',  value: '3months'  },
  { label: 'This Year',      value: 'year'     },
  { label: 'Custom Range',   value: 'custom'   },
];

function getPresetRange(preset) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: today };
  }
  if (preset === '3months') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    return { from: fmt(start), to: today };
  }
  if (preset === 'year') {
    return { from: `${now.getFullYear()}-01-01`, to: today };
  }
  return null;
}

const PAYMENT_FILTERS = [
  { label: 'All',    value: '' },
  { label: 'Paid',   value: 'paid' },
  { label: 'Unpaid', value: 'unpaid' },
];

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`card flex items-center gap-4 ${accent ? `border-l-4 ${accent}` : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
        accent ? 'bg-primary-50' : 'bg-gray-100'
      }`}>
        <Icon className={`text-xl ${accent ? 'text-primary-600' : 'text-gray-500'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function LabBillingPage() {
  const [preset, setPreset]         = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [payFilter, setPayFilter]   = useState('');
  const [stats, setStats]           = useState(null);
  const [bookings, setBookings]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const LIMIT = 20;

  const getRange = useCallback(() => {
    if (preset === 'custom') {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const fetchData = useCallback(async () => {
    const range = getRange();
    if (!range) return;
    setLoading(true);
    try {
      const params = { ...range, page, limit: LIMIT };
      if (payFilter) params.paymentStatus = payFilter;
      const res = await labCrmApi.billing(params);
      const d = res.data;
      setStats({
        totalRevenue:  d.totalRevenue,
        bookingCount:  d.bookingCount,
        paidRevenue:   d.paidRevenue,
        paidCount:     d.paidCount,
        unpaidRevenue: d.unpaidRevenue,
        unpaidCount:   d.unpaidCount,
      });
      setBookings(d.bookings || []);
      setTotal(d.total || 0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [getRange, page, payFilter]);

  useEffect(() => {
    setPage(1);
  }, [preset, customFrom, customTo, payFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / LIMIT);
  const paidPct = stats && stats.totalRevenue > 0
    ? Math.round((stats.paidRevenue / stats.totalRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue and payment summary for your lab</p>
      </div>

      {/* Period selector */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FiCalendar className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Period:</span>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setPreset(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  preset === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="input text-sm py-1.5 px-2"
                max={customTo || undefined}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="input text-sm py-1.5 px-2"
                min={customFrom || undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats cards */}
      {loading && !stats ? (
        <PageLoader />
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={FiTrendingUp}
              label="Total Bookings"
              value={stats.bookingCount}
              accent="border-l-primary-400"
            />
            <StatCard
              icon={FiDollarSign}
              label="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              sub={`From ${stats.bookingCount} booking${stats.bookingCount !== 1 ? 's' : ''}`}
              accent="border-l-blue-400"
            />
            <StatCard
              icon={FiCheckCircle}
              label="Amount Received"
              value={formatCurrency(stats.paidRevenue)}
              sub={`${stats.paidCount} paid booking${stats.paidCount !== 1 ? 's' : ''}`}
              accent="border-l-green-400"
            />
            <StatCard
              icon={FiClock}
              label="Pending Amount"
              value={formatCurrency(stats.unpaidRevenue)}
              sub={`${stats.unpaidCount} unpaid booking${stats.unpaidCount !== 1 ? 's' : ''}`}
              accent="border-l-accent-400"
            />
          </div>

          {/* Collection progress bar */}
          {stats.totalRevenue > 0 && (
            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Collection Progress</span>
                <span className="font-bold text-green-600">{paidPct}% collected</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {formatCurrency(stats.paidRevenue)} received out of {formatCurrency(stats.totalRevenue)} total
              </p>
            </div>
          )}

          {/* Payment filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <FiFilter className="text-gray-400 text-sm" />
              <span className="text-sm text-gray-500 font-medium">Payment:</span>
            </div>
            <div className="flex gap-1.5">
              {PAYMENT_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setPayFilter(value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    payFilter === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings table */}
          {loading ? (
            <div className="card"><PageLoader /></div>
          ) : bookings.length === 0 ? (
            <div className="card text-center py-12">
              <FiDollarSign className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bookings in this period</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Booking No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Patient / Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tests</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Payment</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bookings.map((b) => (
                      <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          #{b.bookingNo}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-700">{b.user?.name || b.patients?.[0]?.name || '—'}</p>
                          {b.user?.mobile && <p className="text-xs text-gray-400">{b.user.mobile}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {formatDate(b.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px]">
                          <span className="line-clamp-2">
                            {b.items?.map((i) => i.name).join(', ') || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(b.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            b.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-accent-100 text-accent-700'
                          }`}>
                            {b.paymentStatus === 'paid' ? '✓ Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 capitalize">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      <FiChevronLeft className="text-sm" />
                    </button>
                    <span className="px-3 py-1 text-xs font-medium text-gray-700">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      <FiChevronRight className="text-sm" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
