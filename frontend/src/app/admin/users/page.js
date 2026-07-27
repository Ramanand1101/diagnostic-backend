'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { userApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { FiCheckCircle, FiSearch, FiTrash2, FiShield, FiDownload, FiSliders, FiX, FiCheck, FiPlus, FiKey, FiCopy, FiEdit } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const ROLES = ['customer', 'lab', 'corporate', 'employee', 'hot_employee', 'subadmin', 'superadmin'];

const ROLE_META = {
  superadmin:   { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '👑' },
  subadmin:     { label: 'Sub Admin',   color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: '🛡️' },
  hot_employee: { label: 'HOT Employee', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '🔥' },
  lab:          { label: 'Lab',         color: 'bg-green-100 text-green-700 border-green-200', icon: '🧪' },
  corporate:    { label: 'Corporate',   color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🏢' },
  employee:     { label: 'Employee',    color: 'bg-teal-100 text-teal-700 border-teal-200',    icon: '🧑‍💼' },
  customer:     { label: 'Customer',    color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: '👤' },
};

const HOT_EMPLOYEE_DOMAIN = 'healthontime.in';
const ACTION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete' };
const ACTIONS = ['view', 'create', 'edit', 'delete'];

const permsToMap = (permissions) => {
  const map = {};
  (permissions || []).forEach((p) => { map[p.module] = new Set(p.actions || []); });
  return map;
};

// ── Permissions modal ─────────────────────────────────────────────────────────
function PermissionsModal({ user, onClose, onSaved }) {
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [perms, setPerms] = useState(() => permsToMap(user.permissions));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.getPermissionModules()
      .then((res) => setModules(res.data.modules || []))
      .catch(() => toast.error('Failed to load permission modules'))
      .finally(() => setLoadingModules(false));
  }, []);

  const toggleAction = (moduleKey, action) => setPerms((prev) => {
    const next = { ...prev };
    const set = new Set(next[moduleKey] || []);
    set.has(action) ? set.delete(action) : set.add(action);
    next[moduleKey] = set;
    return next;
  });

  const toggleModuleRow = (moduleKey) => setPerms((prev) => {
    const next = { ...prev };
    const current = next[moduleKey] || new Set();
    const allOn = ACTIONS.every((a) => current.has(a));
    next[moduleKey] = allOn ? new Set() : new Set(ACTIONS);
    return next;
  });

  const selectAll = () => {
    const next = {};
    modules.forEach((m) => { next[m.key] = new Set(ACTIONS); });
    setPerms(next);
  };
  const deselectAll = () => setPerms({});

  const grantedCount = Object.values(perms).filter((s) => s.size > 0).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(perms)
        .map(([module, set]) => ({ module, actions: [...set] }))
        .filter((p) => p.actions.length > 0);
      await userApi.updatePermissions(user._id, payload);
      toast.success(`Permissions updated for ${user.name}`);
      onSaved(user._id, payload);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Module Permissions</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.name} &mdash; <span className="text-blue-600 font-medium">Sub Admin</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <FiX size={18} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-xs text-gray-500 font-medium">{grantedCount} of {modules.length} modules granted</span>
          <div className="ml-auto flex gap-2">
            <button onClick={selectAll} className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors text-gray-600">
              Grant Full Access
            </button>
            <button onClick={deselectAll} className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors text-gray-600">
              Revoke All
            </button>
          </div>
        </div>

        {/* Permission table */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loadingModules ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading modules…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Module</th>
                  {ACTIONS.map((a) => <th key={a} className="pb-2 px-1 text-center w-16">{ACTION_LABELS[a]}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modules.map((m) => {
                  const set = perms[m.key] || new Set();
                  const anyOn = set.size > 0;
                  return (
                    <tr key={m.key} className={anyOn ? 'bg-primary-50/40' : ''}>
                      <td className="py-2 pr-2">
                        <button
                          onClick={() => toggleModuleRow(m.key)}
                          className="text-sm text-gray-700 hover:text-primary-700 font-medium text-left"
                          title="Toggle full access for this module"
                        >
                          {m.label}
                        </button>
                      </td>
                      {ACTIONS.map((a) => {
                        const on = set.has(a);
                        return (
                          <td key={a} className="text-center px-1">
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <span className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                on ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                              }`}>
                                {on && <FiCheck size={11} className="text-white" strokeWidth={3} />}
                              </span>
                              <input type="checkbox" checked={on} onChange={() => toggleAction(m.key, a)} className="sr-only" />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Role badge + dropdown ─────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const canEdit = currentUserRole === 'superadmin' ||
    (currentUserRole === 'subadmin' && user.role !== 'superadmin');

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

// ── Reset Password modal ──────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', mobile: user.mobile || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await userApi.updateDetails(user._id, form);
      toast.success('User details updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <FiX size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
            <input type="tel" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} className="input text-sm" placeholder="9876543210" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { tempPassword, emailSent }

  const handleReset = async () => {
    if (!confirm(`Reset password for "${user.name}"? A new temporary password will be generated.`)) return;
    setSaving(true);
    try {
      const res = await userApi.resetPassword(user._id, sendEmail);
      setResult(res.data);
      toast.success('Password reset successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copyPwd = () => {
    if (result?.tempPassword) {
      navigator.clipboard.writeText(result.tempPassword);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Reset Password</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.name} — {user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-600">
                A new temporary password will be auto-generated and optionally emailed to the user.
              </p>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setSendEmail((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center ${sendEmail ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${sendEmail ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-gray-700">Send new password to user&apos;s email</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <FiKey size={14} /> {saving ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">New Temporary Password</p>
                <p className="text-2xl font-bold font-mono text-green-800 tracking-widest">{result.tempPassword}</p>
                <button
                  onClick={copyPwd}
                  className="mt-3 flex items-center gap-1.5 text-xs text-green-600 hover:text-green-800 mx-auto border border-green-300 rounded-lg px-3 py-1.5"
                >
                  <FiCopy size={12} /> Copy
                </button>
              </div>
              {result.emailSent && (
                <p className="text-xs text-gray-500 text-center">✓ Email sent to {user.email}</p>
              )}
              {!result.emailSent && (
                <p className="text-xs text-amber-600 text-center">⚠ Email not sent — share this password manually</p>
              )}
              <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
  const [permTarget, setPermTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', mobile: '', role: 'customer' });
  const [addSaving, setAddSaving] = useState(false);
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

  const handlePermissionsSaved = (userId, permissions) => {
    setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, permissions } : u));
  };

  const selectableUsers = users.filter((u) => u.role !== 'superadmin');
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(
    selected.size === selectableUsers.length ? new Set() : new Set(selectableUsers.map((u) => u._id))
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

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const FILTER_ROLES = ['', ...ROLES];

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) { toast.error('Name and email are required'); return; }
    if (addForm.role === 'hot_employee' && !addForm.email.trim().toLowerCase().endsWith(`@${HOT_EMPLOYEE_DOMAIN}`)) {
      toast.error(`HOT Employee accounts require an @${HOT_EMPLOYEE_DOMAIN} email address`);
      return;
    }
    setAddSaving(true);
    try {
      const res = await userApi.create(addForm);
      toast.success(`User created! Password sent to ${addForm.email}`);
      setAddModal(false);
      setAddForm({ name: '', email: '', mobile: '', role: 'customer' });
      fetchUsers();
      // Also show the temp password in case email fails
      if (res.data.tempPassword) toast(`Temp password: ${res.data.tempPassword}`, { duration: 10000, icon: '🔑' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Permissions modal */}
      {permTarget && (
        <PermissionsModal
          user={permTarget}
          onClose={() => setPermTarget(null)}
          onSaved={handlePermissionsSaved}
        />
      )}

      {/* Reset Password modal */}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {/* Edit User modal */}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={fetchUsers}
        />
      )}

      {/* Add User modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create New User</h2>
              <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="e.g. Rohan Sharma"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="rohan@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  value={addForm.mobile}
                  onChange={(e) => setAddForm((f) => ({ ...f, mobile: e.target.value }))}
                  className="input"
                  placeholder="9876543210 (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  className="input"
                >
                  <option value="customer">Customer</option>
                  <option value="lab">Lab</option>
                  <option value="hot_employee">HOT Employee</option>
                  {currentUser?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                </select>
              </div>
              {addForm.role === 'hot_employee' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5 text-xs text-indigo-800">
                  🔥 HOT Employee accounts require an <strong>@{HOT_EMPLOYEE_DOMAIN}</strong> email address. Only HOT Employees can later be promoted to Sub Admin.
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                🔑 A random password will be auto-generated and sent to the user&apos;s email. They can change it after logging in.
              </div>
              <p className="text-xs text-gray-400">
                Sub Admin access can&apos;t be granted directly — create the user as a HOT Employee first, then promote them to Sub Admin from the table below.
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={addSaving} className="flex-1 btn-primary disabled:opacity-60">
                  {addSaving ? 'Creating…' : 'Create & Send Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage user accounts, roles, and subadmin permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
          >
            <FiPlus size={14} /> Add User
          </button>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Hint */}
      <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        <FiShield size={13} className="shrink-0" />
        <span>Click a role badge to change roles. For Sub Admins, use the <strong>Permissions</strong> button to control which modules they can access.</span>
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
                  const isSuper = u.role === 'superadmin';
                  const isSubadmin = u.role === 'subadmin';
                  const isSelected = selected.has(u._id);
                  return (
                    <tr key={u._id} className={`transition-colors ${isSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="table-cell">
                        {!isSuper ? (
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
                          <div>
                            <span className="font-medium text-gray-900">{u.name}</span>
                            {isSubadmin && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {u.permissions?.length
                                  ? `${u.permissions.length} module${u.permissions.length !== 1 ? 's' : ''}`
                                  : 'No modules assigned'}
                              </p>
                            )}
                          </div>
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
                        <div className="flex items-center gap-1.5">
                          {/* Permissions button — only for subadmins, only visible to superadmin */}
                          {isSubadmin && isSuperAdmin && (
                            <button
                              onClick={() => setPermTarget(u)}
                              title="Manage module permissions"
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <FiSliders size={12} /> Permissions
                            </button>
                          )}
                          {/* Edit details button */}
                          {(!isSuper || isSuperAdmin) && (
                            <button
                              onClick={() => setEditTarget(u)}
                              title="Edit name/email/mobile"
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <FiEdit size={12} /> Edit
                            </button>
                          )}
                          {/* Reset Password button */}
                          {!isSuper && isSuperAdmin && (
                            <button
                              onClick={() => setResetTarget(u)}
                              title="Reset password"
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <FiKey size={12} /> Reset Pwd
                            </button>
                          )}
                          {!isSuper && (
                            <button onClick={() => handleDelete(u)} title="Delete user"
                              className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
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
