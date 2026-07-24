'use client';
import { useState, useEffect, useCallback } from 'react';
import { corporateApi, corporateInvoiceApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  FiDollarSign, FiClock, FiCalendar, FiFileText, FiPrinter, FiX,
} from 'react-icons/fi';

const PRESETS = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' },
];

function getPresetRange(preset) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  if (preset === 'month') return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if (preset === '3months') { const s = new Date(now); s.setMonth(s.getMonth() - 3); return { from: fmt(s), to: today }; }
  if (preset === 'year') return { from: `${now.getFullYear()}-01-01`, to: today };
  return null;
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`card flex items-center gap-4 ${accent ? `border-l-4 ${accent}` : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-primary-50' : 'bg-gray-100'}`}>
        <Icon className={`text-xl ${accent ? 'text-primary-600' : 'text-gray-500'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Printable invoice ──────────────────────────────────────────────────────────
function InvoiceModal({ invoice, onClose, onStatusChange }) {
  const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const periodFrom = invoice.periodFrom ? new Date(invoice.periodFrom).toLocaleDateString('en-IN') : '—';
  const periodTo = invoice.periodTo ? new Date(invoice.periodTo).toLocaleDateString('en-IN') : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <h2 className="font-bold text-gray-900">Invoice — {invoice.invoiceNo}</h2>
          <div className="flex items-center gap-2">
            <select value={invoice.status} onChange={(e) => onStatusChange(invoice._id, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              <FiPrinter size={14} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><FiX size={18} /></button>
          </div>
        </div>

        <div id="invoice-print" className="overflow-y-auto flex-1 px-8 py-6 space-y-6 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-extrabold text-primary-600 tracking-tight">HealthOnTime</p>
              <p className="text-xs text-gray-400 mt-0.5">healthontime.in</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">INVOICE</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{invoice.invoiceNo}</p>
              <p className="text-xs text-gray-400 mt-0.5">Date: {invoiceDate}</p>
              <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-700' : invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>{invoice.status.toUpperCase()}</span>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Billed To</p>
              <p className="font-semibold text-gray-900">{invoice.corporate?.companyName}</p>
              {invoice.corporate?.email && <p className="text-gray-500 text-xs mt-0.5">{invoice.corporate.email}</p>}
              {invoice.corporate?.gstNumber && <p className="text-gray-500 text-xs mt-0.5">GST: {invoice.corporate.gstNumber}</p>}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Billing Period</p>
              <p className="font-semibold text-gray-800">{periodFrom} — {periodTo}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Appointments</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Appointment #</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Employee</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Tests</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems || []).map((li, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-600 text-xs font-mono">{li.appointmentNo}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{li.employeeName}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{li.description}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">₹{(li.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-56 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>₹{(invoice.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              {(invoice.tax || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span><span>₹{invoice.tax.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                <span>Total</span><span>₹{(invoice.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-gray-400">Thank you for choosing HealthOnTime · healthontime.in</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(#invoice-print) { display: none !important; }
          .fixed { position: static !important; }
          .print\\:hidden { display: none !important; }
          .bg-black\\/50 { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function CorporateBillingPage() {
  const [corporates, setCorporates] = useState([]);
  const [corporateId, setCorporateId] = useState('');
  const [preset, setPreset] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [billing, setBilling] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);

  useEffect(() => { corporateApi.getAll({ limit: 200 }).then((r) => setCorporates(r.data.items || [])); }, []);

  const getRange = useCallback(() => {
    if (preset === 'custom') { if (!customFrom || !customTo) return null; return { from: customFrom, to: customTo }; }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const fetchData = useCallback(async () => {
    if (!corporateId) return;
    const range = getRange();
    if (!range) return;
    setLoading(true);
    try {
      const [billRes, invRes] = await Promise.all([
        corporateApi.getBilling(corporateId, { ...range, groupBy }),
        corporateInvoiceApi.getAll({ corporate: corporateId }),
      ]);
      setBilling(billRes.data);
      setInvoices(invRes.data.items || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [corporateId, getRange, groupBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateInvoice = async () => {
    const range = getRange();
    if (!range) return toast.error('Select a valid date range');
    setGenerating(true);
    try {
      const res = await corporateInvoiceApi.generate(corporateId, range);
      toast.success(`Invoice ${res.data.invoiceNo} generated!`);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await corporateInvoiceApi.updateStatus(id, status);
      toast.success('Invoice status updated');
      setViewInvoice((v) => v ? { ...v, status } : v);
      fetchData();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Corporate Billing</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={corporateId} onChange={(e) => setCorporateId(e.target.value)} className="input max-w-xs">
          <option value="">Select corporate…</option>
          {corporates.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
        </select>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button key={p.value} onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${preset === p.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="input text-sm py-1.5" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="input text-sm py-1.5" />
          </div>
        )}
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input max-w-[140px] text-sm">
          <option value="day">Day-wise</option>
          <option value="month">Month-wise</option>
          <option value="year">Year-wise</option>
        </select>
      </div>

      {!corporateId ? (
        <p className="text-gray-400 text-sm text-center py-16">Select a corporate to view billing.</p>
      ) : loading ? <PageLoader /> : billing && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard icon={FiDollarSign} label="Total Billable" value={`₹${billing.totalAmount.toLocaleString('en-IN')}`} sub={`${billing.totalCount} appointments`} accent="border-primary-500" />
            <StatCard icon={FiClock} label="Not Yet Invoiced" value={`₹${billing.unbilledAmount.toLocaleString('en-IN')}`} sub={`${billing.unbilledCount} appointments`} accent="border-amber-500" />
            <StatCard icon={FiFileText} label="Invoices Generated" value={invoices.length} />
            <div className="card flex items-center justify-center">
              <button onClick={handleGenerateInvoice} disabled={generating || billing.unbilledCount === 0} className="btn-primary text-sm disabled:opacity-40">
                {generating ? 'Generating...' : 'Generate Invoice for Range'}
              </button>
            </div>
          </div>

          {/* Period breakdown */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><p className="text-sm font-semibold text-gray-700">Billing by {groupBy}</p></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="table-header">Period</th><th className="table-header">Appointments</th><th className="table-header">Amount</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(billing.byPeriod || []).map((p) => (
                    <tr key={p._id}><td className="table-cell">{p._id}</td><td className="table-cell">{p.count}</td><td className="table-cell">₹{p.total.toLocaleString('en-IN')}</td></tr>
                  ))}
                  {(billing.byPeriod || []).length === 0 && <tr><td colSpan={3} className="table-cell text-center text-gray-400 py-6">No billable appointments in this range</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><p className="text-sm font-semibold text-gray-700">Invoices</p></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="table-header">Invoice #</th><th className="table-header">Period</th><th className="table-header">Total</th><th className="table-header">Status</th><th className="table-header">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td className="table-cell font-medium">{inv.invoiceNo}</td>
                      <td className="table-cell text-xs">{inv.periodFrom ? new Date(inv.periodFrom).toLocaleDateString('en-IN') : '—'} – {inv.periodTo ? new Date(inv.periodTo).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="table-cell">₹{(inv.total || 0).toLocaleString('en-IN')}</td>
                      <td className="table-cell">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                      </td>
                      <td className="table-cell">
                        <button onClick={async () => { const res = await corporateInvoiceApi.getOne(inv._id); setViewInvoice(res.data); }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300">View</button>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-6">No invoices generated yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
