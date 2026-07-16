'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { userApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { FiCheckCircle, FiSearch, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const searchTimer = useRef(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit, q: q || undefined };
    if (roleFilter) params.role = roleFilter;
    userApi.getAll(params)
      .then((res) => {
        setUsers(res.data.items || res.data.users || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, roleFilter, q]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearchChange = (e) => {
    clearTimeout(searchTimer.current);
    const val = e.target.value;
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try {
      await userApi.deleteUser(user._id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const roles = ['', 'superadmin', 'subadmin', 'lab', 'customer'];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search name, email or mobile…"
            onChange={handleSearchChange}
            className="input pl-9 py-2 text-sm w-full"
          />
        </div>
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
              roleFilter === r ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
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
                  <th className="table-header">Actions</th>
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
                    <td className="table-cell">
                      {u.role !== 'superadmin' && (
                        <button onClick={() => handleDelete(u)} title="Delete user" className="text-gray-400 hover:text-red-600">
                          <FiTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No users found</td></tr>
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
