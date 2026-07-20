'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { userApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { FiCheckCircle, FiSearch, FiTrash2, FiShield, FiUser, FiTool, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const ROLES = ['customer', 'lab', 'subadmin', 'superadmin'];

const ROLE_META = {
  superadmin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '👑' },
  subadmin:   { label: 'Sub Admin',   color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: '🛡️' },
  lab:        { label: 'Lab',         color: 'bg-green-100 text-green-700 border-green-200', icon: '🧪' },
  customer:   { label: 'Customer',    color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: '👤' },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.customer;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${meta.color}`}>
      <span>{meta.icon}</span> {meta.label}
    </span>
  );
}

function RoleDropdown({ user, currentUserRole, onChange }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const canEdit = currentUserRole === 'superadmin' ||
    (currentUserRole === 'subadmin' && user.role !== 'superadmin');

  // subadmin cannot assign superadmin role
  const allowedRoles = currentUserRole === 'superadmin'
    ? ROLES
    : ROLES.filter((r) => r !== 'superadmin');

  const handleSelect = async (newRole) => {
    setOpen(false);
    if (newRole === user.role) return;
    if (!confirm(`Change ${user.name}'s role from "${user.role}" to "${newRole}"?`)) return;
    setBusy(true);
    try {
      await userApi.updateRole(user._id, newRole);
      toast.success(`Role changed to ${ROLE_META[newRole]?.label || newRole}`);
      onChange(user._id, newRole);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return <RoleBadge role={user.role} />;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !busy && setOpen((v) => !v)}
        disabled={busy}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors cursor-pointer hover:opacity-80 ${ROLE_META[user.role]?.color || ''} ${busy ? 'opacity-50' : ''}`}
        title="Click to change role"
      >
        <span>{ROLE_META[user.role]?.icon}</span>
        {busy ? 'Saving…' : ROLE_META[user.role]?.label || user.role}
        <span className="ml-0.5 text-[10px] opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[150px] overflow-hidden">
          {allowedRoles.map((r) => (
            <button
              key={r}
              onClick={() => handleSelect(r)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${r === user.role ? 'bg-primary-50 font-semibold' : ''}`}
            >
              <span>{ROLE_META[r]?.icon}</span>
              <span>{ROLE_META[r]?.label}</span>
              {r === user.role && <span className="ml-auto text-primary-500 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const searchTimer = useRef(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit, q: q || undefined };
    if (roleFilter) params.role = roleFilter;
    userApi.getAll(params)
      .then((res) => {
        setUsers(res.data.items || res.data.users || []);
        setTotal(res.data.total || 0);
        setSelected(new Set());
      })
      .finally(() => setLoading(false));
  }, [page, limit, roleFilter, q]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearchChange = (e) => {
    clearTimeout(searchTimer.current);
    const val = e.target.value;
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const handleRoleChange = (userId, newRole) => {
    setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
  };

  // Selectable users = non-superadmin only
  const selectableUsers = users.filter((u) => u.role !== 'superadmin');
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(
    selected.size === selectableUsers.length
      ? new Set()
      : new Set(selectableUsers.map((u) => u._id))
  );
  const allSelected = selectableUsers.length > 0 && selected.size === selectableUsers.length;
  const someSelected = selected.size > 0 && !allSelected;

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try {
      await userApi.deleteUser(user._id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} user(s)? This cannot be undone. Superadmins are protected and won't be deleted.`)) return;
    setBulkDeleting(true);
    try {
      await userApi.bulkDelete([...selected]);
      toast.success(`${selected.size} user(s) deleted`);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBulkDeleting(false);
    }
  };

  const FILTER_ROLES = ['', ...ROLES];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage user accounts and assign roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await userApi.exportCsv();
                const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
                const a = document.createElement('a'); a.href = url; a.download = 'users-export.csv'; a.click();
                URL.revokeObjectURL(url);
              } catch { toast.error('Export failed'); }
            }}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FiDownload size={14} /> Download CSV
          </button>
          <span className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400">
            {total} total users
          </span>
        </div>
      </div>

      {/* Role stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map((r) => {
          const meta = ROLE_META[r];
          return (
            <button key={r} onClick={() => { setRoleFilter(roleFilter === r ? '' : r); setPage(1); }}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${roleFilter === r ? 'border-primary-400 bg-primary-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <span className="text-2xl">{meta.icon}</span>
              <div>
                <p className="text-xs font-semibold text-gray-700">{meta.label}</p>
                <p className="text-lg font-bold text-gray-900 leading-none mt-0.5">
                  {users.filter((u) => u.role === r).length}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + role filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input type="text" placeholder="Search name, email or mobile…"
            onChange={handleSearchChange} className="input pl-9 py-2 text-sm w-full" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_ROLES.map((r) => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
                roleFilter === r ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}>
              {r ? `${ROLE_META[r]?.icon} ${ROLE_META[r]?.label}` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk delete bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">{selected.size} user(s) selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 text-sm px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
            <FiTrash2 size={13} /> {bulkDeleting ? 'Deleting…' : 'Delete Selected'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {/* Role change hint */}
      <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        <FiShield size={13} className="shrink-0" />
        <span>Click any role badge to change a user's role. Superadmin rows cannot be selected for bulk delete.</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded text-primary-600 cursor-pointer"
                      title="Select all non-superadmin users"
                    />
                  </th>
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
                {users.map((u) => {
                  const isSuperadmin = u.role === 'superadmin';
                  const isSelected = selected.has(u._id);
                  return (
                    <tr key={u._id} className={`transition-colors ${isSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="table-cell">
                        {!isSuperadmin ? (
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(u._id)}
                            className="w-4 h-4 rounded text-primary-600 cursor-pointer" />
                        ) : (
                          <span className="text-gray-200 text-xs pl-1">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-sm text-gray-600">{u.email || '-'}</td>
                      <td className="table-cell text-sm text-gray-600">{u.mobile || '-'}</td>
                      <td className="table-cell">
                        <RoleDropdown user={u} currentUserRole={currentUser?.role} onChange={handleRoleChange} />
                      </td>
                      <td className="table-cell">
                        {u.verified
                          ? <FiCheckCircle className="text-green-500" title="Verified" />
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="table-cell text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                      <td className="table-cell">
                        {!isSuperadmin && (
                          <button onClick={() => handleDelete(u)} title="Delete user"
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-10">No users found</td></tr>
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
