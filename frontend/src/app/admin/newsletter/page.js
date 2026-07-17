'use client';
import { useState, useEffect, useCallback } from 'react';
import { newsletterApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import toast from 'react-hot-toast';
import { FiMail, FiTrash2, FiUserX, FiUserCheck } from 'react-icons/fi';

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchSubscribers = useCallback(() => {
    setLoading(true);
    newsletterApi.getAll({ page, limit })
      .then((res) => {
        setSubscribers(res.data.items || res.data.subscribers || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const handleToggle = async (s) => {
    try {
      await newsletterApi.toggle(s._id);
      toast.success(s.subscribed ? `${s.email} unsubscribed` : `${s.email} re-subscribed`);
      fetchSubscribers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete ${s.email}? This cannot be undone.`)) return;
    try {
      await newsletterApi.delete(s._id);
      toast.success('Subscriber deleted');
      fetchSubscribers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

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
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscribers.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-10">No subscribers yet</td></tr>
              )}
              {subscribers.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{s.email}</td>
                  <td className="table-cell text-gray-500">{s.source || 'website'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.subscribed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.subscribed ? 'Subscribed' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500">{formatDate(s.createdAt)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(s)}
                        title={s.subscribed ? 'Unsubscribe' : 'Re-subscribe'}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                          s.subscribed
                            ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                            : 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {s.subscribed ? <><FiUserX size={12} /> Unsubscribe</> : <><FiUserCheck size={12} /> Re-subscribe</>}
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
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
