'use client';
import { useState, useEffect } from 'react';
import { newsletterApi } from '@/lib/api';
import { formatDate } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { FiMail } from 'react-icons/fi';

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    newsletterApi.getAll({ page, limit })
      .then((res) => {
        setSubscribers(res.data.items || res.data.subscribers || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Subscribers</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total subscribers</p>
        </div>
        <div className="flex items-center gap-2 bg-primary-50 text-primary-600 px-4 py-2 rounded-xl">
          <FiMail />
          <span className="font-semibold">{total}</span>
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Email</th>
                <th className="table-header">Source</th>
                <th className="table-header">Status</th>
                <th className="table-header">Subscribed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscribers.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{s.email}</td>
                  <td className="table-cell">{s.source || 'website'}</td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${s.subscribed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.subscribed ? 'Subscribed' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="table-cell">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
    </div>
  );
}
