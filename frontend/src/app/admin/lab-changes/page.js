'use client';
import { useState, useEffect, useCallback } from 'react';
import { labChangeRequestApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  FiCheckCircle, FiXCircle, FiClock, FiChevronDown, FiChevronUp,
  FiMapPin, FiUser, FiCalendar,
} from 'react-icons/fi';

const FIELD_LABELS = {
  name: 'Lab Name', description: 'Description', address: 'Street Address',
  area: 'Area / Locality', city: 'City', state: 'State', pincode: 'Pincode',
  phone: 'Phone', email: 'Email', website: 'Website',
  homeCollection: 'Home Collection', lat: 'Latitude', lng: 'Longitude',
  accreditation: 'Accreditation', openingHours: 'Opening Hours',
  sampleCollectionTime: 'Sample Collection Time', reportDeliveryTime: 'Report Delivery Time',
};

function DiffRow({ field, current, proposed }) {
  const label = FIELD_LABELS[field] || field;
  const fmt = (v) => {
    if (v === null || v === undefined || v === '') return <span className="text-gray-300 italic text-xs">empty</span>;
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length ? v.join(', ') : <span className="text-gray-300 italic text-xs">empty</span>;
    return String(v);
  };
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2.5 px-3 text-xs font-semibold text-gray-600 w-40 align-top">{label}</td>
      <td className="py-2.5 px-3 text-sm bg-red-50 align-top">
        <span className="text-red-700 line-through opacity-80">{fmt(current)}</span>
      </td>
      <td className="py-2.5 px-1 text-gray-400 text-xs align-middle text-center w-4">→</td>
      <td className="py-2.5 px-3 text-sm bg-green-50 align-top">
        <span className="text-green-800 font-medium">{fmt(proposed)}</span>
      </td>
    </tr>
  );
}

function LabStatusBadge({ status }) {
  const map = {
    verified: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  const label = { verified: '✓ Verified', rejected: '✗ Rejected', pending: '⏳ Pending' };
  if (!status) return null;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {label[status] || status}
    </span>
  );
}

function RequestCard({ req, onReviewed }) {
  const [open, setOpen] = useState(req.status === 'pending'); // auto-expand diff for pending
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const changedFields = Object.keys(req.changes || {});

  const handleApprove = async () => {
    if (!confirm(`Approve changes for "${req.lab?.name}"? They will go live immediately.`)) return;
    setBusy(true);
    try {
      await labChangeRequestApi.approve(req._id);
      toast.success('Changes approved and applied to lab!');
      onReviewed();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await labChangeRequestApi.reject(req._id, note);
      toast.success('Change request rejected');
      onReviewed();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBusy(false); setRejecting(false); }
  };

  return (
    <div className="card border border-gray-100 space-y-0 p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
            <FiMapPin className="text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{req.lab?.name || 'Unknown Lab'}</p>
              <LabStatusBadge status={req.lab?.verificationStatus} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1"><FiUser size={11} />{req.requestedBy?.name} ({req.requestedBy?.email})</span>
              <span className="flex items-center gap-1"><FiCalendar size={11} />{formatDate(req.createdAt)}</span>
              <span className="flex items-center gap-1"><FiMapPin size={11} />{req.lab?.city}</span>
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed
              </span>
              {changedFields.map((f) => (
                <span key={f} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-medium">
                  {FIELD_LABELS[f] || f}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setOpen((v) => !v)}
            className="text-xs text-gray-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
            {open ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
            {open ? 'Hide diff' : `View diff (${changedFields.length} fields)`}
          </button>
        </div>
      </div>

      {/* Diff table */}
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-2 px-3 text-xs font-semibold text-gray-500 text-left w-40">Field</th>
                  <th className="py-2 px-3 text-xs font-semibold text-red-600 text-left bg-red-50">Current (old)</th>
                  <th className="w-4"></th>
                  <th className="py-2 px-3 text-xs font-semibold text-green-600 text-left bg-green-50">Proposed (new)</th>
                </tr>
              </thead>
              <tbody>
                {changedFields.map((field) => (
                  <DiffRow
                    key={field}
                    field={field}
                    current={req.currentValues?.[field]}
                    proposed={req.changes?.[field]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      {req.status === 'pending' && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center gap-3 flex-wrap">
          {!rejecting ? (
            <>
              <button onClick={handleApprove} disabled={busy}
                className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60">
                <FiCheckCircle size={14} /> {busy ? 'Approving…' : 'Approve & Apply'}
              </button>
              <button onClick={() => setRejecting(true)} disabled={busy}
                className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                <FiXCircle size={14} /> Reject
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full flex-wrap">
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for rejection (optional)…"
                className="input flex-1 min-w-[200px] text-sm py-1.5" />
              <button onClick={handleReject} disabled={busy}
                className="text-sm px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                {busy ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => setRejecting(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Reviewed badge */}
      {req.status !== 'pending' && (
        <div className={`border-t px-4 py-2.5 flex items-center gap-2 text-sm font-medium ${req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {req.status === 'approved' ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />}
          {req.status === 'approved' ? 'Approved' : 'Rejected'} by {req.reviewedBy?.name || 'Admin'} on {formatDate(req.reviewedAt)}
          {req.adminNote && <span className="text-xs ml-1 opacity-75">— {req.adminNote}</span>}
        </div>
      )}
    </div>
  );
}

export default function LabChangesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [total, setTotal] = useState(0);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    labChangeRequestApi.list({ status: statusFilter, limit: 50 })
      .then((res) => { setItems(res.data.items || []); setTotal(res.data.total || 0); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const STATUS_TABS = [
    { val: 'pending', label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { val: 'approved', label: 'Approved', color: 'text-green-700 bg-green-50 border-green-200' },
    { val: 'rejected', label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' },
    { val: 'all', label: 'All', color: 'text-gray-700 bg-gray-50 border-gray-200' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Profile Change Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve changes submitted by lab owners.</p>
        </div>
        {statusFilter === 'pending' && total > 0 && (
          <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full font-semibold">
            {total} pending review
          </span>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800 flex items-start gap-2">
        <FiClock className="shrink-0 mt-0.5" size={14} />
        <span>When a lab user edits their profile, changes come here for your review. Click <strong>View diff</strong> to see exactly what changed (red = old, green = new). Click <strong>Approve &amp; Apply</strong> to make changes go live.</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(({ val, label, color }) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${statusFilter === val ? color : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : items.length === 0 ? (
        <div className="card p-12 text-center">
          <FiCheckCircle className="mx-auto text-4xl text-gray-200 mb-3" />
          <p className="text-gray-400">No {statusFilter === 'all' ? '' : statusFilter} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((req) => (
            <RequestCard key={req._id} req={req} onReviewed={fetchRequests} />
          ))}
        </div>
      )}
    </div>
  );
}
