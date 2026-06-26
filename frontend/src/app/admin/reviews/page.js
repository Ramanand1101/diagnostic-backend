'use client';
import { useState, useEffect } from 'react';
import { reviewApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    reviewApi.getAll({ page, limit })
      .then((res) => {
        setReviews(res.data.items || res.data.reviews || []);
        setTotal(res.data.total || 0);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page]);

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <FiStar
        key={i}
        className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
        style={{ fontSize: '12px' }}
      />
    ));

  const sentimentColor = {
    happy: 'bg-green-50 text-green-700',
    unhappy: 'bg-red-50 text-red-700',
    neutral: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total reviews</p>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : reviews.length === 0 ? (
        <div className="card text-center py-16">
          <FiStar className="text-4xl text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No reviews yet</p>
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">User</th>
                    <th className="table-header">Lab</th>
                    <th className="table-header">Rating</th>
                    <th className="table-header">Sentiment</th>
                    <th className="table-header">Comment</th>
                    <th className="table-header">Verified</th>
                    <th className="table-header">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reviews.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{r.user?.name || 'Anonymous'}</td>
                      <td className="table-cell">{r.lab?.name || '-'}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-0.5">{renderStars(r.rating)}</div>
                      </td>
                      <td className="table-cell">
                        {r.sentiment && (
                          <span className={`badge text-xs capitalize ${sentimentColor[r.sentiment] || 'bg-gray-100 text-gray-600'}`}>
                            {r.sentiment}
                          </span>
                        )}
                      </td>
                      <td className="table-cell max-w-xs">
                        <p className="truncate text-sm text-gray-600">{r.comment || '-'}</p>
                      </td>
                      <td className="table-cell">
                        <span className={`badge text-xs ${r.verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                          {r.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="table-cell">{formatDate(r.createdAt)}</td>
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
