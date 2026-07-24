'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { corporateAppointmentApi, corporateApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import CsvUploadSection from '@/components/ui/CsvUploadSection';
import { DateSelectPicker, TimeSlotPicker } from '@/components/booking/DateTimePicker';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiUploadCloud, FiMail, FiPhone, FiRefreshCw, FiX, FiFileText, FiDownload } from 'react-icons/fi';

const STATUS_LABEL = {
  pending: 'Pending',
  sent_to_lab: 'Sent to Lab',
  confirmed: 'Confirmed',
  alternate_requested: 'Alternate Requested',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Report Complete',
};
const STATUS_COLOR = {
  pending: 'bg-gray-100 text-gray-600',
  sent_to_lab: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  alternate_requested: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-purple-100 text-purple-700',
};

// ── Manual scheduling form ─────────────────────────────────────────────────────
const _td0 = new Date();
const TODAY = `${_td0.getFullYear()}-${String(_td0.getMonth() + 1).padStart(2, '0')}-${String(_td0.getDate()).padStart(2, '0')}`;
const _maxD0 = new Date(); _maxD0.setDate(_maxD0.getDate() + 30);
const MAX_BOOKING_DATE = `${_maxD0.getFullYear()}-${String(_maxD0.getMonth() + 1).padStart(2, '0')}-${String(_maxD0.getDate()).padStart(2, '0')}`;

function ScheduleForm({ onSave, onClose }) {
  const [corporates, setCorporates] = useState([]);
  const [corporateId, setCorporateId] = useState('');
  const [corpDetail, setCorpDetail] = useState(null);
  const [form, setForm] = useState({
    employeeName: '', employeeEmail: '', employeePhone: '', employeeId: '',
    lab: '', package: '', slotDate: TODAY, slotTime: '', notes: '',
  });
  const [customItems, setCustomItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = TODAY;
  const maxBookingDate = MAX_BOOKING_DATE;

  useEffect(() => { corporateApi.getAll({ limit: 200, active: 'true' }).then((r) => setCorporates(r.data.items || [])); }, []);
  useEffect(() => {
    if (!corporateId) { setCorpDetail(null); return; }
    corporateApi.getOne(corporateId).then((r) => setCorpDetail(r.data));
  }, [corporateId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addCustomItem = () => setCustomItems([...customItems, { name: '', price: '' }]);
  const updateCustomItem = (i, k, v) => setCustomItems(customItems.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const removeCustomItem = (i) => setCustomItems(customItems.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!corporateId) return toast.error('Select a corporate');
    if (!form.employeeName.trim()) return toast.error('Employee name is required');
    if (!form.lab) return toast.error('Select a lab');
    setLoading(true);
    try {
      await corporateAppointmentApi.create({
        corporate: corporateId,
        employee: { name: form.employeeName, email: form.employeeEmail, phone: form.employeePhone, employeeId: form.employeeId },
        lab: form.lab,
        package: form.package || undefined,
        items: form.package ? undefined : customItems.filter((i) => i.name.trim()).map((i) => ({ name: i.name, price: Number(i.price) || 0 })),
        slotDate: form.slotDate || undefined,
        slotTime: form.slotTime || undefined,
        notes: form.notes,
      });
      toast.success('Appointment scheduled!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const assignedLabs = corpDetail?.assignedLabs || [];
  const assignedPackages = corpDetail?.packages || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Corporate *</label>
        <select required value={corporateId} onChange={(e) => { setCorporateId(e.target.value); set('lab', ''); set('package', ''); }} className="input">
          <option value="">Select corporate…</option>
          {corporates.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
        </select>
      </div>

      {corporateId && assignedLabs.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No labs assigned to this corporate yet. Assign a lab from Corporate Accounts first.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
          <input required value={form.employeeName} onChange={(e) => set('employeeName', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
          <input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Email</label>
          <input type="email" value={form.employeeEmail} onChange={(e) => set('employeeEmail', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Phone</label>
          <input type="tel" value={form.employeePhone} onChange={(e) => set('employeePhone', e.target.value)} className="input" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Lab / Diagnostic Centre *</label>
        <select required value={form.lab} onChange={(e) => set('lab', e.target.value)} className="input" disabled={!corporateId}>
          <option value="">Select assigned lab…</option>
          {assignedLabs.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.city})</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Package (optional)</label>
        <select value={form.package} onChange={(e) => set('package', e.target.value)} className="input" disabled={!corporateId}>
          <option value="">— No package, add tests manually —</option>
          {assignedPackages.map((p) => <option key={p.package._id} value={p.package._id}>{p.package.name} (₹{p.price})</option>)}
        </select>
      </div>

      {!form.package && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Tests</label>
            <button type="button" onClick={addCustomItem} className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
              <FiPlus size={10} /> Add Test
            </button>
          </div>
          <div className="space-y-2">
            {customItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input value={item.name} onChange={(e) => updateCustomItem(i, 'name', e.target.value)} className="input flex-1" placeholder="Test name" />
                <input type="number" value={item.price} onChange={(e) => updateCustomItem(i, 'price', e.target.value)} className="input w-24" placeholder="Price" />
                <button type="button" onClick={() => removeCustomItem(i)} className="text-red-400 hover:text-red-600 px-2"><FiX /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
        <DateSelectPicker
          value={form.slotDate}
          onChange={(v) => set('slotDate', v)}
          minDate={today}
          maxDate={maxBookingDate}
        />
        <p className="text-[10px] text-gray-400 mt-1">Appointments can be scheduled up to 30 days in advance</p>
      </div>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <TimeSlotPicker
          value={form.slotTime}
          onChange={(v) => set('slotTime', v)}
          slotDate={form.slotDate}
          onlyMorning
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input" rows={2} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Scheduling...' : 'Schedule Appointment'}</button>
      </div>
    </form>
  );
}

// ── Bulk excel upload ──────────────────────────────────────────────────────────
function BulkUploadForm({ onSave, onClose }) {
  const [corporates, setCorporates] = useState([]);
  const [corporateId, setCorporateId] = useState('');

  useEffect(() => { corporateApi.getAll({ limit: 200, active: 'true' }).then((r) => setCorporates(r.data.items || [])); }, []);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Corporate *</label>
        <select value={corporateId} onChange={(e) => setCorporateId(e.target.value)} className="input">
          <option value="">Select corporate…</option>
          {corporates.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
        </select>
      </div>
      {corporateId ? (
        <CsvUploadSection
          title="Upload Appointments"
          description="Columns: employeeName, employeeEmail, employeePhone, employeeId, lab (must be assigned to this corporate), package (optional), slotDate, slotTime, notes. CSV or XLSX."
          onUpload={(file) => corporateAppointmentApi.bulkUpload(corporateId, file)}
          onSuccess={onSave}
          accept=".csv,.xlsx"
        />
      ) : (
        <p className="text-xs text-gray-400">Select a corporate first to upload their appointments.</p>
      )}
      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="btn-secondary text-sm">Close</button>
      </div>
    </div>
  );
}

// ── Appointment management modal ───────────────────────────────────────────────
function AppointmentDetail({ appointment, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ slotDate: TODAY, slotTime: '', reason: '' });
  const [showReschedule, setShowReschedule] = useState(false);
  const [altType, setAltType] = useState('date');
  const [altNote, setAltNote] = useState('');
  const [showAlt, setShowAlt] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportFile, setReportFile] = useState(null);
  const [reportType, setReportType] = useState('complete');
  const [missingSelected, setMissingSelected] = useState([]);
  const reportFileRef = useRef(null);

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const toggleMissing = (name) => {
    setMissingSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const handleUploadReport = async () => {
    if (!reportFile) return toast.error('Choose a file first');
    if (reportType === 'partial' && missingSelected.length === 0) return toast.error('Select which test(s) are still missing');
    setUploadingReport(true);
    try {
      await corporateAppointmentApi.uploadReport(appointment._id, reportFile, { type: reportType, missingTests: missingSelected });
      toast.success(reportType === 'partial' ? 'Partial report uploaded — lab notified of missing tests' : 'Report uploaded — appointment marked complete');
      setReportFile(null);
      setMissingSelected([]);
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUploadingReport(false); }
  };

  const handleMarkDone = async () => {
    setUploadingReport(true);
    try {
      await corporateAppointmentApi.markReportDone(appointment._id);
      toast.success('Report marked complete — appointment is now billable');
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUploadingReport(false); }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await corporateAppointmentApi.getReportUrl(appointment._id);
      window.open(res.data.url, '_blank');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const a = appointment;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{a.appointmentNo}</h2>
          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>
            {STATUS_LABEL[a.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
        <div><p className="text-xs text-gray-400">Corporate</p><p className="font-medium">{a.corporate?.companyName}</p></div>
        <div><p className="text-xs text-gray-400">Lab</p><p className="font-medium">{a.lab?.name} ({a.lab?.city})</p></div>
        <div><p className="text-xs text-gray-400">Employee</p><p className="font-medium">{a.employee?.name}</p></div>
        <div><p className="text-xs text-gray-400">Contact</p><p className="font-medium">{[a.employee?.email, a.employee?.phone].filter(Boolean).join(' · ') || '—'}</p></div>
        <div><p className="text-xs text-gray-400">Date / Time</p><p className="font-medium">{a.slotDate ? new Date(a.slotDate).toDateString() : 'TBD'} {a.slotTime}</p></div>
        <div><p className="text-xs text-gray-400">Tests</p><p className="font-medium">{(a.items || []).map((i) => i.name).join(', ') || '—'}</p></div>
      </div>

      {a.alternateRequest?.type && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          Alternate {a.alternateRequest.type} requested from corporate. {a.alternateRequest.note}
        </div>
      )}

      {/* Status actions */}
      <div className="flex flex-wrap gap-2">
        {a.status === 'pending' && (
          <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.sendToLab(a._id), 'Sent to lab')} className="btn-primary text-xs px-3 py-1.5">Send to Lab</button>
        )}
        {a.status === 'sent_to_lab' && (
          <>
            <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.confirm(a._id), 'Appointment confirmed')} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">Confirm</button>
            <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.reject(a._id), 'Appointment rejected')} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100">Reject</button>
            <button onClick={() => setShowAlt((v) => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50">Ask Alternate</button>
          </>
        )}
        {['confirmed', 'completed'].includes(a.status) && (
          <>
            <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.notifyEmployee(a._id, ['email']), 'Notification emailed')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 flex items-center gap-1"><FiMail size={11} /> Notify (Email)</button>
            <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.notifyEmployee(a._id, ['whatsapp']), 'Notification sent on WhatsApp')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 flex items-center gap-1"><FiPhone size={11} /> Notify (WhatsApp)</button>
          </>
        )}
        {!['cancelled', 'rejected', 'completed'].includes(a.status) && (
          <>
            <button onClick={() => setShowReschedule((v) => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 flex items-center gap-1"><FiRefreshCw size={11} /> Reschedule</button>
            <button disabled={busy} onClick={() => { if (confirm('Cancel this appointment?')) run(() => corporateAppointmentApi.cancel(a._id, 'Cancelled by admin'), 'Appointment cancelled'); }} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50">Cancel</button>
          </>
        )}
      </div>

      {showAlt && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <select value={altType} onChange={(e) => setAltType(e.target.value)} className="input text-sm">
              <option value="date">Alternate Date</option>
              <option value="lab">Alternate Lab</option>
            </select>
          </div>
          <textarea value={altNote} onChange={(e) => setAltNote(e.target.value)} className="input text-sm" rows={2} placeholder="Note for the corporate…" />
          <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.requestAlternate(a._id, { type: altType, note: altNote }), 'Alternate requested')} className="btn-primary text-xs px-3 py-1.5">Send Request</button>
        </div>
      )}

      {showReschedule && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Date</label>
            <DateSelectPicker
              value={rescheduleForm.slotDate}
              onChange={(v) => setRescheduleForm((f) => ({ ...f, slotDate: v }))}
              minDate={TODAY}
              maxDate={MAX_BOOKING_DATE}
            />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <TimeSlotPicker
              value={rescheduleForm.slotTime}
              onChange={(v) => setRescheduleForm((f) => ({ ...f, slotTime: v }))}
              slotDate={rescheduleForm.slotDate}
              onlyMorning
            />
          </div>
          <input value={rescheduleForm.reason} onChange={(e) => setRescheduleForm((f) => ({ ...f, reason: e.target.value }))} className="input text-sm" placeholder="Remark (optional)" />
          <p className="text-xs text-gray-400">Rescheduling to a different lab/hospital can be done from the Schedule form by cancelling and re-booking, or contact support to change the lab on this record.</p>
          <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.reschedule(a._id, rescheduleForm), 'Appointment rescheduled')} className="btn-primary text-xs px-3 py-1.5">Save Reschedule</button>
        </div>
      )}

      {/* Test Report — only once the lab has confirmed the appointment */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Test Report</p>
        {!['confirmed', 'completed'].includes(a.status) ? (
          <p className="text-xs text-gray-400">Report can be uploaded once this appointment is confirmed by the lab.</p>
        ) : (
          <div className="space-y-3">
            {a.reportKey && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                  <FiFileText size={12} /> {a.reportFileName || 'report.pdf'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.reportStatus === 'complete' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {a.reportStatus === 'complete' ? 'Complete' : 'Partial'}
                </span>
                <button onClick={handleDownloadReport} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300 flex items-center gap-1">
                  <FiDownload size={11} /> Download
                </button>
                {a.reportStatus === 'partial' && (
                  <button onClick={handleMarkDone} disabled={uploadingReport} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                    ✓ Mark as Done
                  </button>
                )}
              </div>
            )}
            {a.reportStatus === 'partial' && (a.missingTests || []).length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Still missing: <span className="font-semibold">{a.missingTests.join(', ')}</span> — lab has been notified. Billing is on hold until the report is marked complete.
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
                    {(a.items || []).map((item) => (
                      <label key={item.name} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 cursor-pointer">
                        <input type="checkbox" checked={missingSelected.includes(item.name)} onChange={() => toggleMissing(item.name)} className="text-amber-600" />
                        {item.name}
                      </label>
                    ))}
                    {(a.items || []).length === 0 && <p className="text-xs text-gray-400">No tests listed on this appointment.</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input ref={reportFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  className="text-xs flex-1" />
                <button onClick={handleUploadReport} disabled={uploadingReport || !reportFile}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap">
                  <FiUploadCloud size={11} /> {uploadingReport ? 'Uploading...' : a.reportKey ? 'Replace' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {(a.rescheduleHistory || []).length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Reschedule History</p>
          <div className="space-y-2">
            {a.rescheduleHistory.map((h, i) => (
              <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <p>{h.fromDate ? new Date(h.fromDate).toDateString() : '—'} {h.fromTime} → {h.toDate ? new Date(h.toDate).toDateString() : '—'} {h.toTime}</p>
                <p className="mt-0.5 text-gray-600"><span className="font-semibold">Remark:</span> {h.reason || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary text-sm">Close</button>
      </div>
    </div>
  );
}

export default function CorporateAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const searchTimer = useRef(null);

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    const params = { page, limit, q: q || undefined };
    if (status) params.status = status;
    corporateAppointmentApi.getAll(params)
      .then((res) => { setAppointments(res.data.items || []); setTotal(res.data.total || 0); })
      .finally(() => setLoading(false));
  }, [page, limit, status, q]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const refreshModal = async () => {
    if (!modal?.appointment?._id) return;
    const res = await corporateAppointmentApi.getOne(modal.appointment._id);
    setModal((m) => ({ ...m, appointment: res.data }));
    fetchAppointments();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Corporate Appointments</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal({ type: 'upload' })} className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            <FiUploadCloud size={14} /> Bulk Upload
          </button>
          <button onClick={() => setModal({ type: 'schedule' })} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus /> Schedule Appointment
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input type="text" placeholder="Search by employee or appointment #…" onChange={handleSearchChange} className="input pl-9 py-2 text-sm w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['', ...Object.keys(STATUS_LABEL)].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                status === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}>{s === '' ? 'All' : STATUS_LABEL[s]}</button>
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
                  <th className="table-header">Appointment #</th>
                  <th className="table-header">Corporate</th>
                  <th className="table-header">Employee</th>
                  <th className="table-header">Lab</th>
                  <th className="table-header">Date / Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">{a.appointmentNo}</td>
                    <td className="table-cell">{a.corporate?.companyName}</td>
                    <td className="table-cell">{a.employee?.name}</td>
                    <td className="table-cell">{a.lab?.name}</td>
                    <td className="table-cell">{a.slotDate ? formatDate(a.slotDate) : '—'} {a.slotTime}</td>
                    <td className="table-cell">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => setModal({ type: 'view', appointment: a })} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300">Manage</button>
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No appointments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      <Modal open={modal?.type === 'schedule'} onClose={() => setModal(null)} title="Schedule Appointment" size="lg">
        <ScheduleForm onSave={() => { setModal(null); fetchAppointments(); }} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal?.type === 'upload'} onClose={() => setModal(null)} title="Bulk Upload Appointments" size="md">
        <BulkUploadForm onSave={() => { setModal(null); fetchAppointments(); }} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal?.type === 'view'} onClose={() => setModal(null)} title="Manage Appointment" size="md">
        {modal?.appointment && (
          <AppointmentDetail appointment={modal.appointment} onClose={() => setModal(null)} onChanged={refreshModal} />
        )}
      </Modal>
    </div>
  );
}
