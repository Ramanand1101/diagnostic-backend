'use client';
import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';
import { formatDate } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { FiCheckCircle } from 'react-icons/fi';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const params = { page, limit };
    if (roleFilter) params.role = roleFilter;
    userApi.getAll(params)
      .then((res) => {
        setUsers(res.data.items || res.data.users || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, roleFilter]);

  const roles = ['', 'superadmin', 'subadmin', 'lab', 'customer'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>

      <div className="flex gap-2">
        {roles.map((r) => (
          <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${roleFilter === r ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {r || 'All'}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Mobile</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Verified</th>
                  <th className="table-header">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{u.name}</td>
                    <td className="table-cell">{u.email || '-'}</td>
                    <td className="table-cell">{u.mobile || '-'}</td>
                    <td className="table-cell">
                      <span className={`badge text-xs capitalize ${
                        u.role === 'superadmin' ? 'bg-accent-50 text-accent-700' :
                        u.role === 'subadmin' ? 'bg-primary-50 text-primary-700' :
                        u.role === 'lab' ? 'bg-secondary-50 text-secondary-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="table-cell">
                      {u.verified && <FiCheckCircle className="text-green-500" />}
                    </td>
                    <td className="table-cell">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
    </div>
  );
}
