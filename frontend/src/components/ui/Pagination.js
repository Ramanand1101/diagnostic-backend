'use client';

const PAGE_SIZES = [10, 20, 50, 100];

export default function Pagination({ page, total, limit, onPageChange, onLimitChange }) {
  const totalPages = Math.ceil(total / limit);

  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Rows per page:</span>
        <select
          value={limit}
          onChange={(e) => { onLimitChange && onLimitChange(Number(e.target.value)); }}
          className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-gray-400">
          {total > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : '0 results'}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Prev
          </button>
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400 select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  p === page
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
