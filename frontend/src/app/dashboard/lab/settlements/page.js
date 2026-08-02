'use client';
import { useState, useEffect, useCallback } from 'react';
import { labCrmApi } from '@/lib/api';
import { formatDate, formatCurrency, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { FiDollarSign, FiCheckCircle, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-blue-100 text-blue-700',
  paid:    'bg-green-100 text-green-700',
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`card flex items-center gap-4 border-l-4 ${accent}`}>
      <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Icon className="text-xl text-primary-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function LabSettlementsPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const fetchData = useCallback(() => {
    setLoading(true);
    labCrmApi.settlements({ page, limit: LIMIT, status: statusFilter || undefined })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your earnings and payout history from HealthOnTime.</p>
      </div>

      {loading && !data ? <PageLoader /> : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={FiDollarSign} label="Total Earnings" value={formatCurrency(data.totalEarnings)} accent="border-l-primary-400" />
            <StatCard icon={FiCheckCircle} label="Settled Amount" value={formatCurrency(data.settledAmount)} accent="border-l-green-400" />
            <StatCard icon={FiClock} label="Pending Settlement" value={formatCurrency(data.pendingAmount)} accent="border-l-accent-400" />
          </div>

          <div className="flex gap-1.5">
            {['', 'pending', 'partial', 'paid'].map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s || 'All'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card"><PageLoader /></div>
          ) : data.items.length === 0 ? (
            <div className="card text-center py-12">
              <FiDollarSign className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No settlements yet</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Settlement #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Period</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Paid</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.items.map((s) => (
                      <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{s.settlementNo}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.periodFrom)} – {formatDate(s.periodTo)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(s.totalLabPayable)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(s.amountPaid)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLE[s.status] || 'bg-gray-100 text-gray-500'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.paidAt ? formatDate(s.paidAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                      <FiChevronLeft className="text-sm" />
                    </button>
                    <span className="px-3 py-1 text-xs font-medium text-gray-700">{page} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                      <FiChevronRight className="text-sm" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
