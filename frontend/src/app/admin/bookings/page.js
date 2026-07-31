'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { bookingApi, reportApi } from '@/lib/api';
import { formatDate, formatCurrency, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiEye, FiSearch, FiEdit, FiTrash2, FiRotateCcw, FiMapPin, FiCalendar, FiClock, FiFileText, FiDownload, FiUploadCloud, FiMail } from 'react-icons/fi';

// Standard slot groups (same as cart page)
const SLOT_GROUPS = [
  { label: 'Morning Slots (AM)',   emoji: '☀️',  color: 'text-amber-600',  slots: ['06:00 AM – 07:00 AM','07:00 AM – 08:00 AM','08:00 AM – 09:00 AM','09:00 AM – 10:00 AM','10:00 AM – 11:00 AM','11:00 AM – 12:00 PM'] },
  { label: 'Afternoon Slots (PM)', emoji: '🌤️', color: 'text-blue-600',   slots: ['12:00 PM – 01:00 PM','01:00 PM – 02:00 PM','02:00 PM – 03:00 PM','03:00 PM – 04:00 PM'] },
  { label: 'Evening Slots',        emoji: '🌙',  color: 'text-indigo-600', slots: ['04:00 PM – 05:00 PM','05:00 PM – 06:00 PM','06:00 PM – 07:00 PM','07:00 PM – 08:00 PM','08:00 PM – 09:00 PM'] },
];

function EditBookingModal({ booking, onSave, onClose }) {
  const _td = new Date();
  const today = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;

  const [form, setForm] = useState({
    slotDate: booking.slotDate ? booking.slotDate.slice(0, 10) : '',
    slotTime: booking.slotTime || '',
    notes: booking.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const labName = booking.lab?.name || 'Unknown Lab';
  const labCity = booking.lab?.city ? ` — ${booking.lab.city}` : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slotDate) { toast.error('Please select a new date'); return; }
    if (!form.slotTime) { toast.error('Please select a time slot'); return; }
    setLoading(true);
    try {
      // Only send date, time and notes — lab stays the same
      await bookingApi.editBooking(booking._id, {
        slotDate: form.slotDate,
        slotTime: form.slotTime,
        notes: form.notes,
      });
      toast.success('Booking rescheduled successfully!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Lab — locked, read-only */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <FiMapPin className="text-blue-500 flex-shrink-0" size={16} />
        <div>
          <p className="text-[11px] text-blue-400 font-medium uppercase tracking-wide">Center (cannot be changed)</p>
          <p className="text-sm font-semibold text-blue-800">{labName}{labCity}</p>
        </div>
      </div>

      {/* Current slot info */}
      <div className="flex gap-3">
        <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <p className="text-[11px] text-gray-400 font-medium">Current Date</p>
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <FiCalendar size={12} className="text-gray-400" />
            {booking.slotDate ? formatDate(booking.slotDate) : '—'}
          </p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <p className="text-[11px] text-gray-400 font-medium">Current Slot</p>
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <FiClock size={12} className="text-gray-400" />
            {booking.slotTime || '—'}
          </p>
        </div>
      </div>

      {/* New Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          New Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          min={today}
          value={form.slotDate}
          onChange={(e) => setForm((f) => ({ ...f, slotDate: e.target.value, slotTime: '' }))}
          className="input"
          required
        />
        <p className="text-[11px] text-gray-400 mt-1">Changing the date resets the time slot selection.</p>
      </div>

      {/* New Time Slot — grid picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Time Slot <span className="text-red-500">*</span>
        </label>
        <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50/50">
          {SLOT_GROUPS.map(({ label, emoji, color, slots }) => (
            <div key={label}>
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${color} mb-1.5`}>
                <span>{emoji}</span> {label}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, slotTime: slot }))}
                    className={`text-[11px] py-1.5 px-1 rounded-lg border text-center transition-all font-medium ${
                      form.slotTime === slot
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50 bg-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {form.slotTime && (
          <p className="mt-2 text-xs text-primary-600 font-semibold flex items-center gap-1">
            ✓ Selected: {form.slotTime}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="input resize-none"
          rows={2}
          placeholder="Any special instructions or reason for rescheduling…"
        />
      </div>

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : 'Reschedule Booking'}
        </button>
      </div>
    </form>
  );
}

// ── View/status/report modal ──────────────────────────────────────────────────
function BookingDetailModal({ booking, statuses, onClose, onChanged }) {
  const [newStatus, setNewStatus] = useState(booking.status);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportFile, setReportFile] = useState(null);
  const [reportType, setReportType] = useState('complete');
  const [missingSelected, setMissingSelected] = useState([]);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reminding, setReminding] = useState(false);
  const reportFileRef = useRef(null);

  const fetchReports = useCallback(() => {
    setLoadingReports(true);
    reportApi.getAll({ booking: booking._id })
      .then((res) => setReports(res.data.items || []))
      .finally(() => setLoadingReports(false));
  }, [booking._id]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const toggleMissing = (name) => {
    setMissingSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      await bookingApi.updateStatus(booking._id, { status: newStatus });
      toast.success('Status updated!');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleUploadReport = async () => {
    if (!reportFile) return toast.error('Choose a file first');
    if (reportType === 'partial' && missingSelected.length === 0) return toast.error('Select which test(s) are still missing');
    setUploadingReport(true);
    try {
      await reportApi.uploadForBooking(booking._id, reportFile, { type: reportType, missingTests: missingSelected });
      toast.success(reportType === 'partial' ? 'Partial report uploaded — lab notified of missing tests' : 'Report uploaded');
      setReportFile(null);
      setMissingSelected([]);
      if (reportFileRef.current) reportFileRef.current.value = '';
      fetchReports();
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUploadingReport(false); }
  };

  const handleMarkDone = async () => {
    setUploadingReport(true);
    try {
      await bookingApi.markReportDone(booking._id);
      toast.success('Report marked complete');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUploadingReport(false); }
  };

  const handleSendReminder = async () => {
    setReminding(true);
    try {
      await bookingApi.sendReportReminder(booking._id);
      toast.success(`Reminder sent to ${booking.lab?.name || 'the lab'}`);
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setReminding(false); }
  };

  const handleDownload = async (reportId) => {
    try {
      const res = await reportApi.getDownloadUrl(reportId);
      window.open(res.data.url, '_blank');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const b = booking;

  return (
    <div className="space-y-5">
      {/* Patient is who the sample is actually collected from/for — lead with that,
          the account holder is secondary context (who booked/pays), not the headline */}
      <div className="flex items-start justify-between gap-4 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-wide">Patient</p>
          <p className="font-bold text-gray-900 text-base leading-tight">{b.patientSnapshot?.name || '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {b.patientSnapshot?.age ? `${b.patientSnapshot.age} yrs` : ''}{b.patientSnapshot?.gender ? ` · ${b.patientSnapshot.gender}` : ''}{b.patientSnapshot?.relation ? ` · ${b.patientSnapshot.relation}` : ''}
          </p>
          {b.patient?.patientId && <p className="text-[11px] text-gray-400 font-mono mt-1">{b.patient.patientId}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Account</p>
          <p className="text-sm font-medium text-gray-700">{b.user?.name || b.guest?.name}</p>
          {b.user?.mobile && <p className="text-xs text-gray-400">{b.user.mobile}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-gray-400">Lab</p><p className="font-medium">{b.lab?.name || '—'}</p>{b.lab?.city && <p className="text-xs text-gray-400">{b.lab.city}</p>}</div>
        <div><p className="text-gray-400">Total</p><p className="font-medium">{formatCurrency(b.total)}</p></div>
        <div><p className="text-gray-400">Date</p><p className="font-medium">{formatDate(b.slotDate)}</p></div>
        <div><p className="text-gray-400">Time Slot</p><p className="font-medium">{b.slotTime || '—'}</p></div>
        <div><p className="text-gray-400">Visit</p><p className="font-medium capitalize">{b.visitType}</p></div>
        {b.cancelledByName && (
          <div><p className="text-gray-400">Cancelled By</p><p className="font-medium text-red-600">{b.cancelledByName}</p></div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
        <div className="flex gap-2">
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input flex-1">
            {statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <button onClick={handleStatusUpdate} className="btn-primary text-sm px-4">Update</button>
        </div>
      </div>

      {/* Test Report */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Test Report</p>
        <div className="space-y-3">
          {!loadingReports && reports.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {reports.map((r) => (
                <div key={r._id} className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                    <FiFileText size={12} /> {r.fileName || 'report.pdf'}
                  </span>
                  <button onClick={() => handleDownload(r._id)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300 flex items-center gap-1">
                    <FiDownload size={11} /> Download
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {b.reportStatus && b.reportStatus !== 'none' && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.reportStatus === 'complete' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {b.reportStatus === 'complete' ? 'Complete' : 'Partial'}
              </span>
            )}
            {b.reportStatus === 'partial' && (
              <>
                <button onClick={handleSendReminder} disabled={reminding} className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1">
                  <FiMail size={11} /> {reminding ? 'Sending…' : 'Send Reminder'}
                </button>
                <button onClick={handleMarkDone} disabled={uploadingReport} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                  ✓ Mark as Done
                </button>
              </>
            )}
          </div>

          {b.reportStatus === 'partial' && (b.missingTests || []).length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Still missing: <span className="font-semibold">{b.missingTests.join(', ')}</span> — lab has been notified.
              {b.reportReminderSentAt && (
                <span className="block mt-1 text-amber-600">Last reminded {formatDate(b.reportReminderSentAt)}</span>
              )}
            </p>
          )}

          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input type="radio" checked={reportType === 'complete'} onChange={() => { setReportType('complete'); setMissingSelected([]); }} className="text-primary-600" />
                Complete Report
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input type="radio" checked={reportType === 'partial'} onChange={() => setReportType('partial')} className="text-primary-600" />
                Partial Report
              </label>
            </div>

            {reportType === 'partial' && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Tick the test(s) still missing from this upload:</p>
                <div className="flex flex-wrap gap-2">
                  {(b.items || []).map((item) => (
                    <label key={item.name} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 cursor-pointer">
                      <input type="checkbox" checked={missingSelected.includes(item.name)} onChange={() => toggleMissing(item.name)} className="text-amber-600" />
                      {item.name}
                    </label>
                  ))}
                  {(b.items || []).length === 0 && <p className="text-xs text-gray-400">No tests listed on this booking.</p>}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input ref={reportFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                className="text-xs flex-1" />
              <button onClick={handleUploadReport} disabled={uploadingReport || !reportFile}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap">
                <FiUploadCloud size={11} /> {uploadingReport ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-1">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [q, setQ] = useState('');
  const [viewBooking, setViewBooking] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [limit, setLimit] = useState(20);
  const searchTimer = useRef(null);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    const params = { page, limit, q: q || undefined, deleted: showDeleted ? 'true' : undefined };
    if (statusFilter && !showDeleted) params.status = statusFilter;
    bookingApi.getAll(params)
      .then((res) => {
        setBookings(res.data.items || res.data.bookings || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, statusFilter, q, showDeleted]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleSearchChange = (e) => {
    clearTimeout(searchTimer.current);
    const val = e.target.value;
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const handleMarkPaid = async (id) => {
    try {
      await bookingApi.markPaid(id);
      toast.success('Marked as paid!');
      fetchBookings();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Move this booking to Deleted tab?')) return;
    try {
      await bookingApi.deleteBooking(id);
      toast.success('Booking moved to Deleted');
      fetchBookings();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleRestore = async (id) => {
    try {
      await bookingApi.restoreBooking(id);
      toast.success('Booking restored');
      fetchBookings();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const statuses = ['pending', 'confirmed', 'assigned', 'collected', 'processing', 'completed', 'cancelled', 'refunded'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <span className="text-xs text-gray-400">{total} total</span>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input
          type="text"
          placeholder="Search booking number…"
          onChange={handleSearchChange}
          className="input pl-9 py-2 text-sm w-full"
        />
      </div>

      {/* Status/Deleted filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setShowDeleted(false); setStatusFilter(''); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-full ${!showDeleted && !statusFilter ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          All
        </button>
        {!showDeleted && statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}>
            {s}
          </button>
        ))}
        <button
          onClick={() => { setShowDeleted((v) => !v); setStatusFilter(''); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ml-auto ${
            showDeleted ? 'bg-red-500 text-white' : 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
          }`}>
          🗑 Deleted
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Booking #</th>
                  <th className="table-header">Patient</th>
                  <th className="table-header">Lab</th>
                  <th className="table-header">Date &amp; Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Payment</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono font-medium text-xs">{b.bookingNo}</td>
                    <td className="table-cell">
                      <p className="font-semibold text-gray-900 text-sm">{b.patientSnapshot?.name || b.user?.name || b.guest?.name || '—'}</p>
                      {b.patient?.patientId && <p className="text-[11px] text-gray-400 font-mono">{b.patient.patientId}</p>}
                      {(b.user?.name || b.guest?.name) && (
                        <p className="text-xs text-gray-400 mt-0.5">Acct: {b.user?.name || b.guest?.name}{b.user?.mobile ? ` · ${b.user.mobile}` : ''}</p>
                      )}
                      {b.cancelledByName && (
                        <p className="text-xs text-red-500 mt-0.5">✕ Cancelled by: {b.cancelledByName}</p>
                      )}
                    </td>
                    <td className="table-cell">
                      {b.lab ? (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 leading-tight">{b.lab.name}</p>
                          {b.lab.city && <p className="text-xs text-gray-400">{b.lab.city}</p>}
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="table-cell">
                      <p className="text-sm">{formatDate(b.slotDate)}</p>
                      {b.slotTime && <p className="text-xs text-gray-400">{b.slotTime}</p>}
                    </td>
                    <td className="table-cell"><Badge status={b.status} /></td>
                    <td className="table-cell"><Badge status={b.paymentStatus} /></td>
                    <td className="table-cell font-semibold">{formatCurrency(b.total)}</td>
                    <td className="table-cell">
                      <div className="flex gap-2 items-center">
                        {!showDeleted && (
                          <>
                            <button onClick={() => setViewBooking(b)} title="View" className="text-gray-400 hover:text-primary-600"><FiEye /></button>
                            <button onClick={() => setEditBooking(b)} title="Reschedule" className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                            <button onClick={() => handleDelete(b._id)} title="Delete" className="text-gray-400 hover:text-red-600"><FiTrash2 /></button>
                            {b.paymentStatus === 'unpaid' && (
                              <button onClick={() => handleMarkPaid(b._id)} className="text-xs text-green-600 hover:underline">Mark Paid</button>
                            )}
                          </>
                        )}
                        {showDeleted && (
                          <button onClick={() => handleRestore(b._id)} title="Restore" className="text-gray-400 hover:text-green-600 flex items-center gap-1 text-xs">
                            <FiRotateCcw /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-10">{showDeleted ? 'No deleted bookings' : 'No bookings found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      {/* View/Status Modal */}
      <Modal open={!!viewBooking} onClose={() => setViewBooking(null)} title={`Booking #${viewBooking?.bookingNo}`} size="lg">
        {viewBooking && (
          <BookingDetailModal
            booking={viewBooking}
            statuses={statuses}
            onClose={() => setViewBooking(null)}
            onChanged={async () => {
              const res = await bookingApi.getById(viewBooking._id);
              setViewBooking(res.data);
              fetchBookings();
            }}
          />
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal open={!!editBooking} onClose={() => setEditBooking(null)} title={`Reschedule Booking #${editBooking?.bookingNo}`} size="md">
        {editBooking && (
          <EditBookingModal
            booking={editBooking}
            onSave={() => { setEditBooking(null); fetchBookings(); }}
            onClose={() => setEditBooking(null)}
          />
        )}
      </Modal>
    </div>
  );
}
