'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { labCrmApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { FiSearch, FiUser, FiArrowRight } from 'react-icons/fi';

export default function LabCRMPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const searchTimer = useRef(null);

  const fetch = useCallback(() => {
    setLoading(true);
    labCrmApi.patientList({ page, limit, q: q || undefined })
      .then((res) => { setPatients(res.data.items || []); setTotal(res.data.total || 0); })
      .finally(() => setLoading(false));
  }, [page, limit, q]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
        <p className="text-sm text-gray-500 mt-0.5">Patients who have booked at your lab</p>
      </div>

      <div className="relative max-w-xs">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input type="text" placeholder="Search name, mobile…" onChange={(e) => {
          clearTimeout(searchTimer.current);
          const v = e.target.value;
          searchTimer.current = setTimeout(() => { setQ(v); setPage(1); }, 400);
        }} className="input pl-9 py-2 text-sm w-full" />
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Patient</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Bookings</th>
                  <th className="table-header">Total Spend</th>
                  <th className="table-header">Last Visit</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <FiUser className="text-primary-600 text-sm" />
                        </div>
                        <span className="font-medium text-gray-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm">{p.mobile || '—'}</p>
                      <p className="text-xs text-gray-400">{p.email || ''}</p>
                    </td>
                    <td className="table-cell font-semibold text-gray-800">{p.totalBookings}</td>
                    <td className="table-cell font-semibold text-green-700">{formatCurrency(p.totalSpend)}</td>
                    <td className="table-cell text-sm text-gray-500">{p.lastVisit ? formatDate(p.lastVisit) : '—'}</td>
                    <td className="table-cell">
                      <Link href={`/dashboard/lab/crm/patients/${p._id}`} className="flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium">
                        View <FiArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-10">No patients found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
    </div>
  );
}
