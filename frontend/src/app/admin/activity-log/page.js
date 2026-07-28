'use client';
import { useState, useEffect, useCallback } from 'react';
import { activityLogApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';

const ENTITY_OPTIONS = ['', 'Corporate', 'CorporateAppointment', 'CorporateInvoice', 'User', 'Ticket', 'LabHoliday'];
const ACTION_PREFIX_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Logins/Logouts', value: 'user.log' },
  { label: 'Profile Changes', value: 'user.', exclude: ['user.login', 'user.logout'] },
  { label: 'Corporate', value: 'corporate.' },
  { label: 'Appointments', value: 'appointment.' },
  { label: 'Reports', value: 'report.' },
  { label: 'Invoices', value: 'invoice.' },
  { label: 'Tickets', value: 'ticket.' },
];

// Very small, dependency-free device/browser summary — good enough for an audit trail,
// not meant to be a precise UA parser.
function summarizeUserAgent(ua) {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari'
    : /Firefox\//.test(ua) ? 'Firefox'
    : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Linux/.test(ua) ? 'Linux'
    : '';
  return [browser, os].filter(Boolean).join(' · ');
}

export default function ActivityLogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [excludeActions, setExcludeActions] = useState(null);

  const fetchLog = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    if (entity) params.entity = entity;
    if (action) params.action = action;
    if (excludeActions) params.excludeActions = excludeActions.join(',');
    activityLogApi.getAll(params)
      .then((res) => { setItems(res.data.items || []); setTotal(res.data.total || 0); })
      .finally(() => setLoading(false));
  }, [page, limit, entity, action, excludeActions]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="input max-w-[200px] text-sm">
          {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e || 'All Entities'}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {ACTION_PREFIX_OPTIONS.map((o) => (
            <button key={o.label} onClick={() => { setAction(o.value); setExcludeActions(o.exclude || null); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                action === o.value && !!excludeActions === !!o.exclude ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}>{o.label}</button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">When</th>
                  <th className="table-header">Actor</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Change</th>
                  <th className="table-header">IP Address</th>
                  <th className="table-header">Device / Browser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50">
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{new Date(a.createdAt).toLocaleString('en-IN')}</td>
                    <td className="table-cell text-sm">{a.actorName} <span className="text-xs text-gray-400">({a.actorRole})</span></td>
                    <td className="table-cell"><span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.action}</span></td>
                    <td className="table-cell text-sm text-gray-700 max-w-xs">{a.description}</td>
                    <td className="table-cell text-xs">
                      {a.previousValue !== undefined && a.newValue !== undefined ? (
                        <span className="text-gray-500">
                          <span className="line-through text-gray-400">{a.previousValue}</span> → <span className="font-medium text-gray-700">{a.newValue}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-500 whitespace-nowrap">{a.ipAddress || '—'}</td>
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{summarizeUserAgent(a.userAgent)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No activity recorded</td></tr>
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
