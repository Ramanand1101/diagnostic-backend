'use client';
import { useState, useEffect, useCallback } from 'react';
import { settlementApi, labApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiDownload, FiEye } from 'react-icons/fi';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

const STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  paid:    'bg-green-50 text-green-700',
};

function StatusBadge({ status }) {
  return (
    <span className={`badge text-xs capitalize ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ── Create Settlement modal ─────────────────────────────────────────────────
function CreateSettlementModal({ labs, onCreated, onClose }) {
  const [lab, setLab] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  const handlePreview = async () => {
    if (!lab || !from || !to) { toast.error('Select a lab and date range'); return; }
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await settlementApi.preview({ lab, from, to });
      setPreview(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await settlementApi.generate({ lab, from, to });
      toast.success('Settlement created!');
      onCreated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Lab *</label>
        <select value={lab} onChange={(e) => { setLab(e.target.value); setPreview(null); }} className="input">
          <option value="">Select lab</option>
          {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreview(null); }} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreview(null); }} className="input" />
        </div>
      </div>

      <button onClick={handlePreview} disabled={loadingPreview} className="btn-secondary w-full text-sm">
        {loadingPreview ? 'Loading…' : 'Preview Eligible Bookings'}
      </button>

      {preview && (
        preview.count === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-500 text-center">
            No unsettled, paid bookings with lab pricing found in this range.
          </div>
        ) : (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-800">{preview.count} booking(s) eligible</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-gray-500">Customer Paid</p>
                <p className="font-bold text-gray-900">{fmt(preview.totalAdminRevenue)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Lab Payable</p>
                <p className="font-bold text-primary-700">{fmt(preview.totalLabPayable)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Admin Profit</p>
                <p className="font-bold text-green-700">{fmt(preview.totalAdminProfit)}</p>
              </div>
            </div>
          </div>
        )
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={handleCreate}
          disabled={!preview || preview.count === 0 || creating}
          className="btn-primary disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Confirm & Create'}
        </button>
      </div>
    </div>
  );
}

// ── Settlement detail modal ─────────────────────────────────────────────────
function SettlementDetailModal({ id, onUpdated, onClose }) {
  const [settlement, setSettlement] = useState(null);
  const [status, setStatus] = useState('pending');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settlementApi.getOne(id).then((res) => {
      const s = res.data;
      setSettlement(s);
      setStatus(s.status);
      setAmountPaid(s.amountPaid ?? '');
      setPaymentReference(s.paymentReference || '');
      setPaymentMethod(s.paymentMethod || '');
      setNotes(s.notes || '');
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await settlementApi.updateStatus(id, {
        status,
        amountPaid: amountPaid !== '' ? Number(amountPaid) : undefined,
        paymentReference: paymentReference || undefined,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      });
      setSettlement(res.data);
      toast.success('Settlement updated!');
      onUpdated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!settlement) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-gray-500">{settlement.settlementNo}</p>
          <p className="font-semibold text-gray-900">{settlement.lab?.name}</p>
          <p className="text-xs text-gray-400">
            {formatDate(settlement.periodFrom)} — {formatDate(settlement.periodTo)}
          </p>
        </div>
        <StatusBadge status={settlement.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-xl p-3">
        <div>
          <p className="text-[11px] text-gray-500">Customer Paid</p>
          <p className="font-bold text-gray-900">{fmt(settlement.totalAdminRevenue)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Lab Payable</p>
          <p className="font-bold text-primary-700">{fmt(settlement.totalLabPayable)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Admin Profit</p>
          <p className="font-bold text-green-700">{fmt(settlement.totalAdminProfit)}</p>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Booking #</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Patient</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Admin Price</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Lab Price</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(settlement.lineItems || []).map((li) => (
              <tr key={li.booking}>
                <td className="px-3 py-1.5 font-mono text-gray-700">{li.bookingNo}</td>
                <td className="px-3 py-1.5 text-gray-600">{li.patientName || '—'}</td>
                <td className="px-3 py-1.5 text-gray-500">{formatDate(li.date)}</td>
                <td className="px-3 py-1.5 text-right text-gray-700">{fmt(li.adminPrice)}</td>
                <td className="px-3 py-1.5 text-right text-primary-700">{fmt(li.labPrice)}</td>
                <td className="px-3 py-1.5 text-right text-green-700">{fmt(li.adminProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Update Payment Status</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input text-sm">
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount Paid (₹) <span className="text-gray-400">of {fmt(settlement.totalLabPayable)}</span>
            </label>
            <input type="number" min="0" max={settlement.totalLabPayable} value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Reference</label>
            <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="input text-sm" placeholder="UTR / cheque no." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
            <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input text-sm" placeholder="Bank transfer, UPI…" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input text-sm" rows={2} />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [labFilter, setLabFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchSettlements = useCallback(() => {
    setLoading(true);
    settlementApi.getAll({ page, limit, lab: labFilter || undefined, status: statusFilter || undefined })
      .then((res) => {
        setSettlements(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, labFilter, statusFilter]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);
  useEffect(() => { labApi.getAll({ limit: 200 }).then((r) => setLabs(r.data.items || [])); }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await settlementApi.exportCsv({ lab: labFilter || undefined, status: statusFilter || undefined });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlements-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Settlements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pay labs their share of paid bookings and track settlement status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
            <FiDownload className={downloading ? 'animate-spin' : ''} /> {downloading ? 'Downloading…' : 'Export CSV'}
          </button>
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus /> Create Settlement
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={labFilter} onChange={(e) => { setLabFilter(e.target.value); setPage(1); }} className="input text-sm max-w-xs">
          <option value="">All Labs</option>
          {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        <div className="flex gap-1.5">
          {['', 'pending', 'partial', 'paid'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}>
              {s || 'All Statuses'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Settlement #</th>
                  <th className="table-header">Lab</th>
                  <th className="table-header">Period</th>
                  <th className="table-header text-right">Total Owed</th>
                  <th className="table-header text-right">Amount Paid</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {settlements.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono text-xs font-medium text-gray-700">{s.settlementNo}</td>
                    <td className="table-cell text-sm text-gray-700">{s.lab?.name || '—'}</td>
                    <td className="table-cell text-xs text-gray-500">{formatDate(s.periodFrom)} – {formatDate(s.periodTo)}</td>
                    <td className="table-cell text-right font-bold text-gray-900">{fmt(s.totalLabPayable)}</td>
                    <td className="table-cell text-right text-gray-600">{fmt(s.amountPaid)}</td>
                    <td className="table-cell"><StatusBadge status={s.status} /></td>
                    <td className="table-cell text-xs text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="table-cell">
                      <button onClick={() => setModal({ type: 'detail', id: s._id })}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline">
                        <FiEye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-10">No settlements yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={() => {}} />

      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Create Settlement" size="md">
        <CreateSettlementModal labs={labs} onCreated={() => { setModal(null); fetchSettlements(); }} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal?.type === 'detail'} onClose={() => setModal(null)} title="Settlement Details" size="lg">
        {modal?.type === 'detail' && (
          <SettlementDetailModal id={modal.id} onUpdated={fetchSettlements} onClose={() => setModal(null)} />
        )}
      </Modal>
    </div>
  );
}
